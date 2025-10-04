import type { ComponentChildren } from "preact";
import { cn } from "../includes/classes";

export interface IconButtonProps {
  children?: ComponentChildren;
  onClick?: () => void;
  className?: string;
  title?: string;
}

export const IconButton = ({
  children,
  onClick,
  className,
  title,
}: IconButtonProps) => {
  return (
    <button
      className={cn(
        "w-10 h-10 p-1.5 rounded-full cursor-pointer opacity-90 flex flex-row justify-center items-center",
        "hover:bg-white/10 hover:opacity-100 active:bg-black/90",
        className
      )}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
};
