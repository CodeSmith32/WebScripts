import { useMemo, useRef, useState } from "preact/hooks";
import {
  type MonacoEditor,
  monacoService,
  MonacoUri,
  type TextModel,
} from "../includes/services/monacoService";
import { useCarried } from "./core/useCarried";
import { useFutureCallback } from "./core/useFutureCallback";
import { debounce } from "../includes/core/debounce";
import { prettierService } from "../includes/services/prettierService";
import type { ScriptLanguage, StoredScript } from "../includes/types";
import { messageService } from "../includes/services/messageService";
import { webScripts } from "../includes/services/webScriptService";
import { CodePack } from "../includes/core/codepack";
import { mergeDefined } from "../includes/core/mergeDefined";

export class EditorModelData {
  script: StoredScript;
  code: string;
  model: MonacoEditor.ITextModel;
  editor: MonacoEditor.IStandaloneCodeEditor | null;
  refresh: () => void;
  saveScripts: () => void | Promise<void>;

  constructor({
    script,
    refresh = () => {},
    saveScripts = () => {},
  }: {
    script: StoredScript;
    refresh?: () => void;
    saveScripts?: () => void | Promise<void>;
  }) {
    this.script = script;
    this.code = CodePack.unpack(this.script.code);
    this.model = monacoService.createModel({
      code: this.code,
      language: this.script.language,
      uri: MonacoUri.parse(`script://${this.script.id}/index.ts`),
    });
    this.editor = null;
    this.refresh = refresh;
    this.saveScripts = saveScripts;

    // script changed
    this.model.onDidChangeContent(() => {
      this.delayUpdateFromCode();
    });
  }

  /** Update the highlight language for the editor. */
  setEditorLanguage(language: ScriptLanguage) {
    if (this.model.getLanguageId() !== language) {
      (this.model as TextModel).setLanguage(language);
    }
  }

  /** Get code from monaco editor as string. */
  getEditorCode() {
    return monacoService.getModelCode(this.model);
  }

  /** Update monaco editor code from string. */
  setEditorCode(code: string) {
    // get current selection
    const selection = [...(this.editor?.getSelections() ?? [])];
    // update value and restore selection
    this.model.pushEditOperations(
      [],
      [{ range: this.model.getFullModelRange(), text: code }],
      () => selection
    );
  }

  /** Rebuild header in code. */
  rebuildHeader() {
    const newCode = webScripts.updateHeaderInCode(this.code, this.script);

    if (this.code !== newCode) {
      this.code = newCode;
      this.setEditorCode(newCode);
    }
  }

  /** Parse the header from the code and update the script's details accordingly. */
  reloadHeader(): boolean {
    const headerData = mergeDefined(
      webScripts.getHeaderDefaults(),
      webScripts.parseHeader(this.code)
    );

    if (webScripts.headersEqual(this.script, headerData)) {
      return false;
    }

    Object.assign(this.script, headerData);
    return true;
  }

  /** Format code with prettier, and update editor. */
  async prettifyCode() {
    return (
      (await prettierService.format(this.getEditorCode(), {
        model: this.model,
        editor: this.editor ?? undefined,
      })) !== null
    );
  }

  /** Reload the code and header details from the Monaco model, and refresh the editor. */
  delayUpdateFromCode = debounce(() => {
    this.code = this.getEditorCode();
    this.reloadHeader();
    this.setEditorLanguage(this.script.language);
    this.refresh();
  }, 500);

  /** Update the script code from the Monaco model. */
  recompressScript() {
    this.code = this.getEditorCode();
    this.script.code = CodePack.pack(this.code);
  }

  /** Reload the compressed code from the stored script, and update the Monaco editor. */
  reloadCompressedCode() {
    this.code = CodePack.unpack(this.script.code);
    this.setEditorCode(this.code);
  }

  /** Save script. */
  async save() {
    // update stored script
    this.recompressScript();

    // re-sync code header with script data
    this.delayUpdateFromCode.immediate();

    // save
    await this.saveScripts();
    await messageService.send("resyncAll", {});
  }
}

export const useEditorModels = (
  script: StoredScript | null,
  saveScripts?: () => void | Promise<void>
): Record<string, EditorModelData> => {
  const modelDataMap = useRef<Record<string, EditorModelData>>(
    Object.create(null)
  );

  const [, refresh] = useState({});

  saveScripts = useFutureCallback(saveScripts ?? (() => {}));
  const carried = useCarried({ script });

  useMemo(() => {
    // check that script is available but hasn't loaded yet
    const { script } = carried;
    if (!script) return;

    modelDataMap.current[script.id] ??= new EditorModelData({
      script,
      refresh: () => refresh({}),
      saveScripts,
    });
  }, [script?.id]);

  return modelDataMap.current;
};
