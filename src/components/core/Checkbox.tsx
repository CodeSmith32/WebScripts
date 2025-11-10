import type { ComponentChildren, InputHTMLAttributes } from "preact";
import { cn } from "../../includes/core/classes";
import { useId } from "preact/hooks";

export interface CheckboxProps extends InputHTMLAttributes {
  wrapperStyles?: string;
  labelStyles?: string;
  label?: ComponentChildren;
  onValueChange?: (value: boolean) => void;
}

export const Checkbox = ({
  wrapperStyles,
  labelStyles,
  label,
  onValueChange,
  onChange,
  className,
  name,
  disabled,
  ...props
}: CheckboxProps) => {
  const fallbackName = useId();

  return (
    <label
      className={cn(
        "flex flex-row items-center gap-2 cursor-pointer",
        wrapperStyles
      )}
    >
      <input
        name={name ?? fallbackName}
        type="checkbox"
        className={cn("ml-1 w-4 h-4 mt-px", className)}
        onChange={(evt) => {
          onChange?.(evt);
          onValueChange?.((evt.target as HTMLInputElement).checked);
        }}
        disabled={disabled}
        {...props}
      />
      <span className={cn("mr-1", disabled && "opacity-50", labelStyles)}>
        {label}
      </span>
    </label>
  );
};
