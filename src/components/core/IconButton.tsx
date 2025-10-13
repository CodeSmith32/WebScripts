import type { ComponentChildren, MouseEventHandler } from "preact";
import { cn } from "../../includes/classes";
import { buttonVariants, type ButtonVariantType } from "./Button";

export interface IconButtonProps {
  disabled?: boolean;
  variant?: ButtonVariantType;
  children?: ComponentChildren;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  title?: string;
}

export const IconButton = ({
  disabled,
  variant,
  children,
  onClick,
  className,
  title,
}: IconButtonProps) => {
  return (
    <button
      className={cn(
        "w-10 h-10 p-1.5 rounded-full cursor-pointer opacity-90 flex flex-row justify-center items-center relative z-0 overflow-hidden " +
          "after:absolute after:-z-10 after:inset-0 after:pointer-events-none hover:after:bg-white/10 active:after:bg-black/50",
        variant && buttonVariants[variant],
        disabled && "opacity-70 after:hidden cursor-default",
        className
      )}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
};
