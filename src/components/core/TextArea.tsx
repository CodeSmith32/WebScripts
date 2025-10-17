import type { TextareaHTMLAttributes } from "preact";
import { cn } from "../../includes/classes";
import { useId } from "preact/hooks";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export const TextArea = ({
  className,
  name,
  onInput,
  onValueChange,
  ...props
}: TextAreaProps) => {
  const fallbackName = useId();

  return (
    <textarea
      className={cn(
        "resize-y grow w-full bg-background rounded-md min-h-32 max-h-[1000px] px-4 py-2 font-mono",
        className
      )}
      name={name ?? fallbackName}
      onInput={(evt) => {
        onInput?.(evt);
        onValueChange?.((evt.target as HTMLTextAreaElement).value);
      }}
      {...props}
    />
  );
};
