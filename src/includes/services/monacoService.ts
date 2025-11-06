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
import type { ScriptLanguage } from "../types";
import { mergeDefined } from "../core/mergeDefined";

const monacoTS = MonacoLanguages.typescript;
type TSConfig = MonacoLanguages.typescript.CompilerOptions;

export class MonacoService {
  constructor() {
    this.setupTheme();
    this.configureTypeScript();
    this.isolateReferences();
  }

  private builtInTSDefaults: TSConfig =
    monacoTS.typescriptDefaults.getCompilerOptions();
  private internalTSDefaults: TSConfig = {
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noFallthroughCasesInSwitch: true,
  };

  /** Configure editor theme. */
  private setupTheme() {
    MonacoEditor.defineTheme(
      "theme",
      Monokai as MonacoEditor.IStandaloneThemeData
    );
  }

  /** Prevent cross-file references. */
  private isolateReferences() {
    // disable built-in definition / references behavior
    const modeConfig = { references: false, definitions: false };
    monacoTS.typescriptDefaults.setModeConfiguration(modeConfig);
    monacoTS.javascriptDefaults.setModeConfiguration(modeConfig);

    // helper to get worker for model
    const getWorker = async (model: MonacoEditor.ITextModel) => {
      const lang = model.getLanguageId();
      const getter =
        lang === "typescript"
          ? await monacoTS.getTypeScriptWorker()
          : await monacoTS.getJavaScriptWorker();
      return await getter(model.uri);
    };

    // helper to create range from numeric start / end
    const spanToRange = (
      model: MonacoEditor.ITextModel,
      start: number,
      length: number
    ) => {
      const s = model.getPositionAt(start);
      const e = model.getPositionAt(start + length);
      return new Range(s.lineNumber, s.column, e.lineNumber, e.column);
    };

    // list of affected languages
    const languages = ["javascript", "typescript"];

    // helper type for found definition / reference entries
    type ReferenceEntry = ts.DefinitionInfo | ts.ReferenceEntry;

    // helper for filtering definitions / references by model path
    const makeFilter = (model: MonacoEditor.ITextModel) => {
      // different schemes / authorities means different lookup contexts:
      const prefix = `${model.uri.scheme}://${model.uri.authority}/`;

      // return a filter function
      return (match: ReferenceEntry) => match.fileName.startsWith(prefix);
    };

    // helper for converting definitions / references to monaco locations
    const makeConverter = (model: MonacoEditor.ITextModel) => {
      // return a converter to convert from typescript definition / reference to monaco location
      return (match: ReferenceEntry): MonacoLanguages.Location => ({
        uri: model.uri,
        range: spanToRange(model, match.textSpan.start, match.textSpan.length),
      });
    };

    // register replacement definition / reference providers

    MonacoLanguages.registerDefinitionProvider(languages, {
      async provideDefinition(model, position) {
        const worker = await getWorker(model);
        const offset = model.getOffsetAt(position);
        const defs = (await worker.getDefinitionAtPosition(
          model.uri.toString(),
          offset
        )) as ts.DefinitionInfo[] | undefined;
        return defs?.filter(makeFilter(model)).map(makeConverter(model)) ?? [];
      },
    });

    MonacoLanguages.registerReferenceProvider(languages, {
      async provideReferences(model, position, _context) {
        const worker = await getWorker(model);
        const offset = model.getOffsetAt(position);
        let refs = (await worker.getReferencesAtPosition(
          model.uri.toString(),
          offset
        )) as ts.ReferenceEntry[] | undefined;
        return refs?.filter(makeFilter(model)).map(makeConverter(model)) ?? [];
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
  createEditor({
    node,
    model,
  }: {
    node: HTMLElement;
    model?: MonacoEditor.ITextModel;
  }) {
    return MonacoEditor.create(node, {
      ...editorSettingsManager.getEditorSettings(),
      theme: "theme",
      automaticLayout: true,
      model,
    });
  }

  /** Gets the code from the given model. */
  getModelCode(model: MonacoEditor.ITextModel) {
    return model.getValue(MonacoEditor.EndOfLinePreference.LF, false);
  }
}

export const monacoService = new MonacoService();

// monaco TextModel has methods not visible on ITextModel
export type TextModel = MonacoEditor.ITextModel & {
  setLanguage(languageIdOrSelection: string, source?: string): void;
};

export {
  type MonacoEditor,
  MonacoUri,
  MonacoLanguages,
  type IDisposable,
  KeyMod,
  KeyCode,
};
