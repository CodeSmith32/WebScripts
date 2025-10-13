import type { OptionHTMLAttributes, SelectHTMLAttributes } from "preact";
import { cn } from "../../includes/classes";
import { useId } from "preact/hooks";

export interface DropdownProps extends SelectHTMLAttributes {
  onValueChange?: (value: string) => void;
}

export const Dropdown = ({
  className,
  name,
  onValueChange,
  onChange,
  ...props
}: DropdownProps) => {
  const fallbackName = useId();

  return (
    <select
      className={cn(
        "px-4 py-1 rounded-md border-none bg-background min-w-40",
        className
      )}
      name={name ?? fallbackName}
      onChange={(evt) => {
        onChange?.(evt);
        onValueChange?.((evt.target as HTMLSelectElement).value);
      }}
      {...props}
    />
  );
};

export interface OptionProps extends OptionHTMLAttributes {}

export const Option = ({ className, ...props }: OptionProps) => {
  return (
    <option
      className={cn("bg-background text-white p-4", className)}
      {...props}
    />
  );
};
