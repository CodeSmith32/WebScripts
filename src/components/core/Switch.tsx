import { cn } from "../../includes/core/classes";

export interface SwitchProps {
  disabled?: boolean;
  value?: boolean;
  active?: boolean;
  onChange?: (value: boolean) => void;
  onClick?: () => void;
  className?: string;
}

export const Switch = ({
  disabled = false,
  value,
  active,
  onChange,
  onClick,
  className,
}: SwitchProps) => {
  const handleToggle = () => {
    onClick?.();
    if (!disabled) onChange?.(!value);
  };

  return (
    <div
      tabIndex={0}
      className={cn(
        "switch w-10 h-5 rounded-xl bg-black/50 relative cursor-pointer m-1",
        "focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-1",
        "after:block after:absolute after:w-5 after:h-5 after:rounded-full after:left-0 after:transition-all after:bg-neutral-500",
        value && "after:left-5",
        active && "after:bg-secondary-dark",
        value && active && "after:bg-secondary",
        disabled && "opacity-50",
        className
      )}
      onClick={handleToggle}
      onKeyDown={(evt) => {
        if (evt.key === " " || evt.key === "Enter") {
          handleToggle();
        }
      }}
    />
  );
};
