import type { InputHTMLAttributes } from "preact";
import { cn } from "../includes/classes";
import { useId } from "preact/hooks";

export interface TextBoxProps extends InputHTMLAttributes {}

export const TextBox = ({ className, name, ...props }: TextBoxProps) => {
  const fallbackName = useId();

  return (
    <input
      className={cn(
        "px-4 py-1 rounded-md border-none bg-neutral-900 w-60",
        className
      )}
      name={name ?? fallbackName}
      {...props}
    />
  );
};
