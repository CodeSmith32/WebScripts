import { useEffect, useRef } from "preact/hooks";
import {
  type MonacoEditor,
  monacoService,
} from "../includes/services/monacoService";

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
      editorRef.current = monacoService.createEditor({
        node: elementRef.current,
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
    <div
      className="relative w-full grow"
      onKeyDown={(evt) => {
        if (evt.ctrlKey && evt.shiftKey && evt.key === "P") {
          evt.preventDefault();
        }
      }}
    >
      <div ref={elementRef} className="absolute inset-0" />
    </div>
  );
};
