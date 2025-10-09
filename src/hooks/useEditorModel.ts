import { useMemo, useRef, useState } from "preact/hooks";
import { MonacoEditor } from "../includes/monacoSetup";
import { webScripts, type StoredScript } from "../includes/webscripts";
import { useCarried } from "./useCarried";
import { useFutureCallback } from "./useFutureCallback";
import { EditableScript } from "../includes/editableScript";
import { debounce } from "../includes/debounce";

export interface EditorModelData {
  script: EditableScript;
  model: MonacoEditor.ITextModel;
  save: () => void;
  updateCode: () => void;
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

      const editorScript = new EditableScript(script);
      const model = MonacoEditor.createModel(editorScript.code);

      // rebuild header in code
      const rebuildHeader = () => {
        if (editorScript.regenerateHeader()) {
          model.setValue(editorScript.code);
        }
      };

      // update the script code from the Monaco model
      const updateCode = debounce(() => {
        editorScript.code = model.getValue(
          MonacoEditor.EndOfLinePreference.LF,
          false
        );
        editorScript.reloadHeader();
        refresh({});
      }, 500);

      // save script
      const save = async () => {
        // update stored script
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
        save,
        updateCode,
        rebuildHeader,
      };
      monacoModels.current[script.id] = modelData;

      return modelData;
    }
    return null;
  }, [script?.id]);

  return model;
};
