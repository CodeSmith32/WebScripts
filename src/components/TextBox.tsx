import type { InputHTMLAttributes } from "preact";
import { cn } from "../includes/classes";
import { useId } from "preact/hooks";

export interface TextBoxProps extends InputHTMLAttributes {
  onValueChange?: (value: string) => void;
}

export const TextBox = ({
  className,
  name,
  onValueChange,
  onInput,
  ...props
}: TextBoxProps) => {
  const fallbackName = useId();

  return (
    <input
      className={cn(
        "px-4 py-1 rounded-md border-none bg-background w-60",
        className
      )}
      name={name ?? fallbackName}
      onInput={(evt) => {
        onInput?.(evt);
        onValueChange?.((evt.target as HTMLInputElement).value);
      }}
      {...props}
    />
  );
};
