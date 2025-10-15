import { useMemo, useRef, useState } from "preact/hooks";
import { MonacoEditor, type TextModel } from "../includes/monacoSetup";
import {
  webScripts,
  type ScriptLanguage,
  type StoredScript,
} from "../includes/webscripts";
import { useCarried } from "./core/useCarried";
import { useFutureCallback } from "./core/useFutureCallback";
import { EditableScript } from "../includes/editableScript";
import { debounce } from "../includes/debounce";
import prettier from "prettier/standalone";
import prettierBabel from "prettier/plugins/babel";
import prettierEstree from "prettier/plugins/estree";

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
        const code = getEditorCode();
        const prettierOptions = {
          parser: "babel-ts",
          plugins: [prettierEstree, prettierBabel],
          cursorOffset: -1,
        };

        try {
          if (modelData.editor) {
            // editor is available: maintain cursor position
            let pos = modelData.editor.getPosition();
            let offset = pos ? model.getOffsetAt(pos) : 0;

            prettierOptions.cursorOffset = offset;

            const { formatted, cursorOffset: newOffset } =
              await prettier.formatWithCursor(code, prettierOptions);
            if (formatted === code) return true;

            if (newOffset !== -1) offset = newOffset;

            model.pushEditOperations(
              [],
              [{ range: model.getFullModelRange(), text: formatted }],
              () => null
            );

            pos = model.getPositionAt(offset);
            modelData.editor.setPosition(pos);
          } else {
            // editor not available: just format the code
            const formatted = await prettier.format(code, prettierOptions);
            if (formatted === code) return true;

            model.pushEditOperations(
              [],
              [{ range: model.getFullModelRange(), text: formatted }],
              () => null
            );
          }
        } catch (_err) {
          return false;
        }
        return true;
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
        editorScript.storedScript();

        // save
        await saveScripts();
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
