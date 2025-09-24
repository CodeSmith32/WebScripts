import { useEffect, useRef, useState } from "preact/hooks";
import { MonacoEditor, MonacoLanguages } from "../includes/monacoSetup";

export interface MonacoProps {
  initialValue: string;
  language: "typescript" | "javascript";
}

export const Monaco = ({ initialValue, language }: MonacoProps) => {
  const [editor, setEditor] =
    useState<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // set up editor
  useEffect(() => {
    if (editorRef.current) {
      setEditor((editor) => {
        if (editor) return editor;

        const model = MonacoEditor.createModel(initialValue, language);

        editor = MonacoEditor.create(editorRef.current!, {
          value: initialValue,
          language,
          theme: "theme",
          automaticLayout: true,
          "semanticHighlighting.enabled": true,
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

        return editor;
      });
    }

    return () => editor?.dispose();
  }, [editorRef.current]);

  return (
    <div className="relative w-full grow">
      <div ref={editorRef} className="absolute inset-0" />
    </div>
  );
};
