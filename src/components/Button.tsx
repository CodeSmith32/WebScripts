import type { ComponentChildren } from "preact";
import { cn } from "../includes/classes";

export interface ButtonProps {
  disabled?: boolean;
  children?: ComponentChildren;
  onClick?: () => void;
  className?: string;
}

export const Button = ({
  disabled,
  children,
  onClick,
  className,
}: ButtonProps) => {
  return (
    <button
      className={cn(
        "rounded-md bg-transparent cursor-pointer px-5 py-2 text-center",
        "hover:bg-white/10 active:bg-black/90",
        disabled && "opacity-70",
        className
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
