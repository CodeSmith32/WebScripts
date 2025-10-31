import type { OptionHTMLAttributes, SelectHTMLAttributes } from "preact";
import { cn } from "../../includes/core/classes";
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

export interface MultiSelectProps extends SelectHTMLAttributes {
  onValueChange?: (selection: string[]) => void;
}

export const MultiSelect = ({
  onValueChange,
  onChange,
  name,
  className,
  ...props
}: MultiSelectProps) => {
  const fallbackName = useId();

  return (
    <select
      className={cn(
        "p-2 rounded-md border border-white/50 bg-background min-w-40",
        className
      )}
      name={name ?? fallbackName}
      onChange={(evt) => {
        onChange?.(evt);

        if (onValueChange) {
          const target = evt.target as HTMLSelectElement;
          const value: string[] = [];
          for (const option of target.children) {
            if (option instanceof HTMLOptionElement && option.selected) {
              value.push(option.value);
            }
          }
          onValueChange(value);
        }
      }}
      {...props}
      multiple
    />
  );
};

export interface OptionProps extends OptionHTMLAttributes {}

export const Option = ({ className, ...props }: OptionProps) => {
  return (
    <option
      className={cn(
        "bg-background text-white px-3 py-2 h-5 box-content checked:bg-white/10 " +
          "first:rounded-t-md last:rounded-b-md mb-px",
        className
      )}
      {...props}
    />
  );
};
