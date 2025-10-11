import { useEffect, useRef } from "preact/hooks";
import { MonacoEditor, MonacoLanguages } from "../includes/monacoSetup";
import type { ScriptLanguage } from "../includes/webscripts";

export interface MonacoProps {
  model: MonacoEditor.ITextModel;
  language: ScriptLanguage;
  editorContainer: {
    editor: MonacoEditor.IStandaloneCodeEditor | null;
  };
}

export const Monaco = ({ model, language, editorContainer }: MonacoProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  // set up editor
  useEffect(() => {
    if (elementRef.current && !editorRef.current) {
      editorRef.current = MonacoEditor.create(elementRef.current!, {
        language,
        theme: "theme",
        automaticLayout: true,
        model,
      });

      (async () => {
        const getWorker =
          language === "javascript"
            ? await MonacoLanguages.typescript.getJavaScriptWorker()
            : await MonacoLanguages.typescript.getTypeScriptWorker();

        const worker = await getWorker(model.uri);

        console.log("Worker started:", worker);
      })();

      editorContainer.editor = editorRef.current;
    }

    return () => {
      editorContainer.editor = null;
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full grow">
      <div ref={elementRef} className="absolute inset-0" />
    </div>
  );
};
