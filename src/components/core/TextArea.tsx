import type {
  EventHandler,
  TargetedEvent,
  TextareaHTMLAttributes,
} from "preact";
import { cn } from "../../includes/core/classes";
import { useEffect, useId, useRef } from "preact/hooks";
import {
  CodeArea,
  type CodeAreaEventHandler,
} from "../../includes/core/CodeArea";

const mergeEvents =
  <T extends TargetedEvent>(handler?: EventHandler<T>, codeEditor?: boolean) =>
  (evt: T) => {
    handler?.(evt);
    if (codeEditor) CodeArea.autoHandler(evt as never);
  };

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
  codeEditor?: boolean;
}

export const TextArea = ({
  className,
  name,
  onKeyDown,
  onKeyUp,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
  onInput,
  onValueChange,
  codeEditor,
  ...props
}: TextAreaProps) => {
  const fallbackName = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (codeEditor) {
      const ctl = CodeArea.getController(ref.current!);
      const onChange: CodeAreaEventHandler<"change"> = (evt) => {
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
      onKeyDown={mergeEvents(onKeyDown, codeEditor)}
      onKeyUp={mergeEvents(onKeyUp, codeEditor)}
      onMouseDown={mergeEvents(onMouseDown, codeEditor)}
      onMouseUp={mergeEvents(onMouseUp, codeEditor)}
      onFocus={mergeEvents(onFocus, codeEditor)}
      onBlur={mergeEvents(onBlur, codeEditor)}
      onInput={(evt) => {
        onInput?.(evt);

        if (codeEditor) {
          CodeArea.reactHandlers.onInput(evt);
        } else {
          onValueChange?.((evt.target as HTMLTextAreaElement).value);
        }
      }}
      {...props}
    />
  );
};
