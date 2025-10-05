import { useMemo, useRef, useState } from "preact/hooks";
import { MonacoEditor } from "../includes/monacoSetup";
import { type ScriptLanguage, type StoredScript } from "../includes/webscripts";
import { useCarried } from "./useCarried";
import { useFutureCallback } from "./useFutureCallback";

export interface EditorModelData {
  script: StoredScript;
  model: MonacoEditor.ITextModel;
  saved: boolean;
  save: () => void;
  setSaved: (saved: boolean) => void;
  setName: (name: string) => void;
  setCode: (code: string) => void;
  updateCode: () => void;
  setLanguage: (language: ScriptLanguage) => void;
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

      const model = MonacoEditor.createModel(script.code);

      // update whether or not the script is saved
      const setSaved = (saved: boolean) => {
        modelData.saved = saved;
        if (carried.script?.id === script.id) refresh({});
      };

      // update the script name
      const setName = (name: string) => {
        script.name = name;
        setSaved(false);
      };

      // update the script code
      const setCode = (code: string) => {
        script.code = code;
        setSaved(false);
      };

      // update the script code from the Monaco model
      const updateCode = () => {
        script.code = model.getValue(
          MonacoEditor.EndOfLinePreference.LF,
          false
        );
        setSaved(false);
      };

      // update script language
      const setLanguage = (language: ScriptLanguage) => {
        script.language = language;
        setSaved(false);
      };

      // save script
      const save = async () => {
        await saveScripts();
        setSaved(true);
      };

      // script changed
      model.onDidChangeContent(() => {
        setSaved(false);
      });

      const modelData: EditorModelData = {
        script,
        model,
        saved: true,
        save,
        setSaved,
        setName,
        setCode,
        updateCode,
        setLanguage,
      };
      monacoModels.current[script.id] = modelData;

      return modelData;
    }
    return null;
  }, [script?.id]);

  return model;
};
