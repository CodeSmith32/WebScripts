import type { ComponentChildren } from "preact";
import { cn } from "../includes/classes";

export interface IconButtonProps {
  children?: ComponentChildren;
  onClick?: () => void;
  className?: string;
}

export const IconButton = ({
  children,
  onClick,
  className,
}: IconButtonProps) => {
  return (
    <button
      className={cn(
        "w-10 h-10 p-1.5 rounded-full cursor-pointer opacity-90",
        "hover:bg-white/10 hover:opacity-100",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
