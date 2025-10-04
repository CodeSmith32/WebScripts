import type { OptionHTMLAttributes, SelectHTMLAttributes } from "preact";
import { cn } from "../includes/classes";
import { useId } from "preact/hooks";

export interface DropdownProps extends SelectHTMLAttributes {}

export const Dropdown = ({ className, name, ...props }: DropdownProps) => {
  const fallbackName = useId();

  return (
    <select
      className={cn(
        "px-4 py-1 rounded-md border-none bg-neutral-900 min-w-40",
        className
      )}
      name={name ?? fallbackName}
      {...props}
    />
  );
};

export interface OptionProps extends OptionHTMLAttributes {}

export const Option = ({ className, ...props }: OptionProps) => {
  return (
    <option
      className={cn("bg-neutral-950 text-white p-4", className)}
      {...props}
    />
  );
};
