import { useMemo, useRef, useState } from "preact/hooks";
import { MonacoEditor, type TextModel } from "../includes/monacoSetup";
import {
  webScripts,
  type ScriptLanguage,
  type StoredScript,
} from "../includes/services/webScriptService";
import { useCarried } from "./core/useCarried";
import { useFutureCallback } from "./core/useFutureCallback";
import { EditableScript } from "../includes/editableScript";
import { debounce } from "../includes/core/debounce";
import { prettierService } from "../includes/services/prettierService";
import { userScriptService } from "../includes/services/userScriptService";

export interface EditorModelData {
  script: EditableScript;
  model: MonacoEditor.ITextModel;
  editor: MonacoEditor.IStandaloneCodeEditor | null;
  save: () => Promise<void>;
  updateCode: () => void;
  getEditorCode: () => string;
  setEditorCode: (code: string) => void;
  setEditorLanguage: (language: ScriptLanguage) => void;
  prettifyCode: () => Promise<boolean>;
  rebuildHeader: () => void;
}

export const useEditorModel = (
  script: StoredScript | null,
  saveScripts?: () => void | Promise<void>
): EditorModelData | null => {
  const monacoModels = useRef<Record<string, EditorModelData>>(
    Object.create(null)
  );

  const [, refresh] = useState({});

  saveScripts = useFutureCallback(saveScripts ?? (() => {}));
  const carried = useCarried({ script });

  const model = useMemo(() => {
    const { script } = carried;

    if (script) {
      if (monacoModels.current[script.id]) {
        return monacoModels.current[script.id];
      }

      const editorScript = EditableScript.fromStoredScript(script);
      const model = MonacoEditor.createModel(
        editorScript.code,
        editorScript.language
      );

      // update the highlight language for the editor
      const setEditorLanguage = (language: ScriptLanguage) => {
        if (model.getLanguageId() !== language) {
          (model as TextModel).setLanguage(language);
        }
      };

      // get code from monaco editor as string
      const getEditorCode = () => {
        return model.getValue(MonacoEditor.EndOfLinePreference.LF, false);
      };
      // update monaco editor code from string
      const setEditorCode = (code: string) => {
        // get current selection
        const selection = [...(modelData.editor?.getSelections() ?? [])];
        // update value and restore selection
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: code }],
          () => selection
        );
      };

      // rebuild header in code
      const rebuildHeader = () => {
        if (editorScript.regenerateHeader()) {
          setEditorCode(editorScript.code);
        }
      };

      // format code with prettier, and update editor
      const prettifyCode = async () => {
        return (
          (await prettierService.format(getEditorCode(), {
            model,
            editor: modelData.editor ?? undefined,
          })) !== null
        );
      };

      // update the script code from the Monaco model
      const updateCode = debounce(() => {
        editorScript.code = getEditorCode();
        editorScript.reloadHeader();
        setEditorLanguage(editorScript.language);
        refresh({});
      }, 500);

      // save script
      const save = async () => {
        // update stored script
        updateCode.immediate();
        const storedScript = editorScript.storedScript();

        // save
        await saveScripts();
        await userScriptService.resynchronizeUserScript(storedScript);
        editorScript.markSaved();

        // trigger update in background script
        await webScripts.sendMessage({ cmd: "updateBackgroundScripts" });
      };

      // script changed
      model.onDidChangeContent(() => {
        updateCode();
      });

      const modelData: EditorModelData = {
        script: editorScript,
        model,
        editor: null,
        save,
        updateCode,
        getEditorCode,
        setEditorCode,
        setEditorLanguage,
        prettifyCode,
        rebuildHeader,
      };
      monacoModels.current[script.id] = modelData;

      return modelData;
    }
    return null;
  }, [script?.id]);

  return model;
};
