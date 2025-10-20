import type { TextareaHTMLAttributes } from "preact";
import { cn } from "../../includes/classes";
import { useEffect, useId, useRef } from "preact/hooks";
import {
  getTextAreaController,
  textAreaReactHandlers,
  type TextAreaControllerEventHandler,
} from "../../includes/textAreaCodeHandler";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
  codeEditor?: boolean;
}

export const TextArea = ({
  className,
  name,
  onInput,
  onValueChange,
  codeEditor,
  ...props
}: TextAreaProps) => {
  const fallbackName = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (codeEditor) {
      const ctl = getTextAreaController(ref.current!);
      const onChange: TextAreaControllerEventHandler<"change"> = (evt) => {
        onValueChange?.(evt.value);
      };

      ctl.on("change", onChange);

      return () => {
        ctl.off("change", onChange);
      };
    }
  }, [codeEditor]);

  return (
    <textarea
      ref={ref}
      className={cn(
        "resize-y grow w-full bg-background rounded-md min-h-32 max-h-[1000px] px-4 py-2 font-mono",
        className
      )}
      name={name ?? fallbackName}
      {...(codeEditor ? textAreaReactHandlers : null)}
      onInput={(evt) => {
        const target = evt.target as HTMLTextAreaElement;
        if (codeEditor) {
          textAreaReactHandlers.onFocus(evt);
        }
        onInput?.(evt);
        onValueChange?.(target.value);
      }}
      {...props}
    />
  );
};
