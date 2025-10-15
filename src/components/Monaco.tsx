import { useEffect, useRef } from "preact/hooks";
import { MonacoEditor } from "../includes/monacoSetup";

export interface MonacoProps {
  model: MonacoEditor.ITextModel;
  editorContainer: {
    editor: MonacoEditor.IStandaloneCodeEditor | null;
  };
}

export const Monaco = ({ model, editorContainer }: MonacoProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  // set up editor
  useEffect(() => {
    if (elementRef.current && !editorRef.current) {
      editorRef.current = MonacoEditor.create(elementRef.current!, {
        theme: "theme",
        automaticLayout: true,
        model,
      });

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
