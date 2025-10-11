import type { ComponentChildren, InputHTMLAttributes } from "preact";
import { cn } from "../includes/classes";

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
  ...props
}: CheckboxProps) => {
  return (
    <label className={cn("flex flex-row items-center gap-2", wrapperStyles)}>
      <input
        type="checkbox"
        className={cn("ml-1", className)}
        onChange={(evt) => {
          onChange?.(evt);
          onValueChange?.((evt.target as HTMLInputElement).checked);
        }}
        {...props}
      />
      <span className={cn("mr-1", labelStyles)}>{label}</span>
    </label>
  );
};
