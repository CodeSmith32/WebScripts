import { useMemo, useRef, useState } from "preact/hooks";
import { MonacoEditor, type TextModel } from "../includes/monacoSetup";
import { useCarried } from "./core/useCarried";
import { useFutureCallback } from "./core/useFutureCallback";
import { EditableScript } from "../includes/editableScript";
import { debounce } from "../includes/core/debounce";
import { prettierService } from "../includes/services/prettierService";
import { userScriptService } from "../includes/services/userScriptService";
import type { ScriptLanguage, StoredScript } from "../includes/types";
import { messageService } from "../includes/services/messageService";
import { webScripts } from "../includes/services/webScriptService";

export class EditorModelData {
  script: EditableScript;
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
    this.script = new EditableScript(script);
    this.model = MonacoEditor.createModel(
      this.script.code,
      this.script.language
    );
    this.editor = null;
    this.refresh = refresh;
    this.saveScripts = saveScripts;

    // script changed
    this.model.onDidChangeContent(() => {
      this.updateCode();
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
    return this.model.getValue(MonacoEditor.EndOfLinePreference.LF, false);
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
    const oldCode = this.script.code;
    const newCode = webScripts.updateHeaderInCode(oldCode, this.script);

    if (oldCode !== newCode) {
      this.script.code = newCode;
      this.setEditorCode(newCode);
    }
  }

  /** Parse the header from the code and update the script's details accordingly. */
  reloadHeader(): boolean {
    const headerData = {
      ...webScripts.getHeaderDefaults(),
      ...webScripts.parseHeader(this.script.code),
    };

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

  /** Update the script code from the Monaco model. */
  updateCode = debounce(() => {
    this.script.code = this.getEditorCode();
    this.reloadHeader();
    this.setEditorLanguage(this.script.language);
    this.refresh();
  }, 500);

  /** Save script. */
  async save() {
    // update stored script
    this.updateCode.immediate();
    const storedScript = this.script.storedScript();

    // save
    await this.saveScripts();
    await userScriptService.resynchronizeUserScript(storedScript);

    // trigger update in background script
    await messageService.send("updateBackgroundScripts", {});
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
