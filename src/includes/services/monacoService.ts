// select only js / ts languages
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution.js";
// import editor components
import "monaco-editor/esm/vs/editor/browser/editorBrowser.js";
import "monaco-editor/esm/vs/editor/edcore.main.js";
// import front-facing api components
import {
  KeyCode,
  KeyMod,
  editor as MonacoEditor,
  Uri as MonacoUri,
  languages as MonacoLanguages,
  type IDisposable,
  Range,
} from "monaco-editor/esm/vs/editor/editor.api.js";
// import theme
import Monokai from "monaco-themes/themes/Monokai.json";
import type ts from "typescript";
import { editorSettingsManager } from "../managers/editorSettingsManager";
import { scriptLanguages, type ScriptLanguage } from "../types";
import { mergeDefined } from "../core/mergeDefined";

const monacoTS = MonacoLanguages.typescript;
type TSConfig = MonacoLanguages.typescript.CompilerOptions;
type TSWorker = MonacoLanguages.typescript.TypeScriptWorker;
type ITextModel = MonacoEditor.ITextModel;
// helper type for found definition / reference entries
type TSReferenceEntry = ts.DefinitionInfo | ts.ReferenceEntry;

export class MonacoService {
  constructor() {
    this.setupTheme();
    this.configureTypeScript();
    this.isolateReferences();
    MonacoEditor.onDidChangeMarkers(() => this.clearInvalidMarkers());
  }

  // cached lib models
  private libModels = new Map<string, Promise<ITextModel | null>>();

  private builtInTSDefaults: TSConfig =
    monacoTS.typescriptDefaults.getCompilerOptions();

  private internalTSDefaults: TSConfig = {
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noFallthroughCasesInSwitch: true,
  };

  /** A set of models to clear invalid markers from, in case any come in from a pending
   * worker diagnostics scan request. */
  private modelsToRescan = new Set<ITextModel>();

  /** Configure editor theme. */
  private setupTheme() {
    MonacoEditor.defineTheme(
      "theme",
      Monokai as MonacoEditor.IStandaloneThemeData
    );
  }

  /** Get the model for a given URI.
   *
   * If the URI represents a built-in TypeScript lib.*.d.ts file, this method will try to fetch
   * the library contents and build and return a new model for it. */
  async getModel(
    worker: TSWorker,
    fileName: string
  ): Promise<ITextModel | null> {
    const uri = MonacoUri.parse(fileName);

    // try to find and return model from local cached models
    const model = MonacoEditor.getModel(uri);
    if (model) return model;

    // if the uri has a protocol (e.g., script://) bail
    if (/^\w+:\/\//.test(fileName)) return null;

    // otherwise, it might be a lib.*.d.ts file: attempt lookup
    let promise = this.libModels.get(fileName);
    if (!promise) {
      promise = new Promise<ITextModel | null>(async (resolve) => {
        const source = await worker.getScriptText(fileName);

        if (source == null) return resolve(null);
        resolve(MonacoEditor.createModel(source, "typescript", uri));
      });
      this.libModels.set(fileName, promise);
    }
    return promise;
  }

  /** Get language worker for a model. */
  private async getWorker(model: ITextModel): Promise<TSWorker> {
    const lang = model.getLanguageId();
    const getter =
      lang === "typescript"
        ? await monacoTS.getTypeScriptWorker()
        : await monacoTS.getJavaScriptWorker();
    return await getter(model.uri);
  }

  /** Runs through the models requiring rescanning, and clears any markers from the incorrect
   * language. */
  private clearInvalidMarkers() {
    // iterate models needing rescan
    for (const model of this.modelsToRescan) {
      const language = model.getLanguageId();

      // iterate languages, and clear markers in wrong languages from model
      for (const lang in scriptLanguages) {
        if (lang !== language) MonacoEditor.setModelMarkers(model, lang, []);
      }
    }
    // clear the set
    this.modelsToRescan.clear();
  }

  /** Convert model start / end offsets to a Monaco Range. */
  private spanToRange(model: ITextModel, start: number, length: number) {
    const s = model.getPositionAt(start);
    const e = model.getPositionAt(start + length);
    return new Range(s.lineNumber, s.column, e.lineNumber, e.column);
  }

  /** Convert a reference or definition lookup to a location. Returns null on failure. */
  private async convertReferenceToLocation(
    worker: TSWorker,
    match: TSReferenceEntry
  ): Promise<MonacoLanguages.Location | null> {
    const model = await this.getModel(worker, match.fileName);
    if (!model) return null;

    // convert typescript definition / reference to monaco location
    return {
      uri: MonacoUri.parse(match.fileName),
      range: this.spanToRange(
        model,
        match.textSpan.start,
        match.textSpan.length
      ),
    };
  }

  /** Prevent cross-file references. */
  private isolateReferences() {
    // disable built-in definition / references behavior
    const modeConfig: MonacoLanguages.typescript.ModeConfiguration = {
      // disable
      references: false,
      definitions: false,
      // keep enabled
      codeActions: true,
      completionItems: true,
      diagnostics: true,
      documentHighlights: true,
      documentRangeFormattingEdits: true,
      documentSymbols: true,
      hovers: true,
      inlayHints: true,
      onTypeFormattingEdits: true,
      rename: true,
      signatureHelp: true,
    };
    monacoTS.typescriptDefaults.setModeConfiguration(modeConfig);
    monacoTS.javascriptDefaults.setModeConfiguration(modeConfig);

    // list of affected languages
    const languages = ["javascript", "typescript"];

    // helper for filtering definitions / references by model path
    const makeFilter = (model: ITextModel) => {
      // different schemes / authorities means different lookup contexts:
      const prefix = `${model.uri.scheme}://${model.uri.authority}/`;

      // return filter function
      return (match: TSReferenceEntry) => {
        // allow built-in lib.*.d.ts files and same-authority references
        return (
          !/^\w+:\/\//.test(match.fileName) || match.fileName.startsWith(prefix)
        );
      };
    };

    // register replacement definition / reference providers

    MonacoLanguages.registerDefinitionProvider(languages, {
      provideDefinition: async (model, position) => {
        const worker = await this.getWorker(model);
        const offset = model.getOffsetAt(position);

        // get definitions
        const defs = ((await worker.getDefinitionAtPosition(
          model.uri.toString(),
          offset
        )) ?? []) as TSReferenceEntry[];

        const filter = makeFilter(model);

        // convert to locations
        const locs = (
          await Promise.all(
            defs.map(
              (def) =>
                filter(def) && this.convertReferenceToLocation(worker, def)
            )
          )
        ).filter((v) => !!v);

        // return locations
        return locs;
      },
    });

    MonacoLanguages.registerReferenceProvider(languages, {
      provideReferences: async (model, position, _context) => {
        const worker = await monacoService.getWorker(model);
        const offset = model.getOffsetAt(position);

        // get references
        const refs = ((await worker.getReferencesAtPosition(
          model.uri.toString(),
          offset
        )) ?? []) as TSReferenceEntry[];

        const filter = makeFilter(model);

        // convert to locations
        const locs = (
          await Promise.all(
            refs.map(
              (ref) =>
                filter(ref) && this.convertReferenceToLocation(worker, ref)
            )
          )
        ).filter((v) => !!v);

        // return locations
        return locs;
      },
    });
  }

  /** Configure typescript linting. */
  configureTypeScript(config?: TSConfig) {
    monacoTS.typescriptDefaults.setCompilerOptions(
      mergeDefined(this.builtInTSDefaults, this.internalTSDefaults, config)
    );
  }

  /** Adds keybindings and returns a disposable for removing them. */
  addKeybindings(rules: MonacoEditor.IKeybindingRule[]) {
    return MonacoEditor.addKeybindingRules(rules);
  }

  /** Create and return a new uri from the given string. */
  createUri(uri: string) {
    return MonacoUri.parse(uri);
  }

  /** Create and return a new model with the given details. */
  createModel({
    code = "",
    language = "javascript",
    uri,
  }: {
    code?: string;
    language?: ScriptLanguage;
    uri?: MonacoUri;
  } = {}) {
    return MonacoEditor.createModel(code, language, uri);
  }

  /** Create and return a new editor embedded in the given element, for the given model. */
  createEditor({ node, model }: { node: HTMLElement; model?: ITextModel }) {
    return MonacoEditor.create(node, {
      ...editorSettingsManager.getEditorSettings(),
      theme: "theme",
      automaticLayout: true,
      model,
    });
  }

  /** Gets the code from the given model. */
  getModelCode(model: ITextModel) {
    return model.getValue(MonacoEditor.EndOfLinePreference.LF, false);
  }

  /** Update the model's language. Also clears error markers from the other language if a
   * pending request hasn't finished during the language switch. */
  setModelLanguage(model: ITextModel, language: ScriptLanguage) {
    (model as TextModel).setLanguage(language);
    this.modelsToRescan.add(model);
  }
}

export const monacoService = new MonacoService();

// monaco TextModel has methods not visible on ITextModel
export type TextModel = ITextModel & {
  setLanguage(languageIdOrSelection: string, source?: string): void;
};

export {
  MonacoEditor,
  MonacoUri,
  MonacoLanguages,
  type IDisposable,
  KeyMod,
  KeyCode,
};
