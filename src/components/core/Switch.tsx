import { cn } from "../../includes/classes";

export interface SwitchProps {
  disabled?: boolean;
  switched?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Switch = ({
  disabled = false,
  switched,
  active,
  onClick,
  className,
}: SwitchProps) => {
  return (
    <div
      tabIndex={0}
      className={cn(
        "switch w-10 h-5 rounded-xl bg-neutral-800 relative cursor-pointer m-1",
        "focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-1",
        "after:block after:absolute after:w-5 after:h-5 rounded-full after:transition-all after:bg-neutral-500",
        switched && "after:left-5 after:bg-yellow-300",
        switched && !active && "after:bg-neutral-400",
        disabled && "after:bg-neutral-600",
        className
      )}
      onClick={onClick}
      onKeyDown={(evt) => {
        if (evt.key === " ") onClick?.();
      }}
    />
  );
};
