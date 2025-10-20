import type { ComponentChildren } from "preact";
import { cn } from "../../includes/core/classes";

export interface StatusIndicatorProps {
  className?: string;
  icon?: ComponentChildren;
  label?: ComponentChildren;
}

export const StatusIndicator = ({
  className,
  icon,
  label,
}: StatusIndicatorProps) => {
  return (
    <div
      className={cn(
        "h-6 flex flex-row gap-1 items-center pl-2 pr-3 py-1 text-sm rounded-[100px]",
        !label && "w-6 px-1",
        className
      )}
    >
      {icon} {label && <span>{label}</span>}
    </div>
  );
};
