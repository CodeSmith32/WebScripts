import type { ComponentChildren, MouseEventHandler } from "preact";
import { cn } from "../includes/classes";

export const buttonVariants = {
  primary: "bg-primary",
  secondary: "bg-neutral-700",
  destructive: "bg-destructive",
};
Object.setPrototypeOf(buttonVariants, null);

export type ButtonVariantType = keyof typeof buttonVariants;

export interface ButtonProps {
  disabled?: boolean;
  variant?: ButtonVariantType;
  children?: ComponentChildren;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  title?: string;
}

export const Button = ({
  disabled,
  variant,
  children,
  onClick,
  className,
  title,
}: ButtonProps) => {
  return (
    <button
      className={cn(
        "rounded-md bg-transparent cursor-pointer px-5 py-2 text-center relative z-0 overflow-hidden " +
          "after:absolute after:-z-10 after:inset-0 after:pointer-events-none hover:after:bg-white/10 active:after:bg-black/50",
        variant && buttonVariants[variant],
        disabled && "opacity-70 after:hidden cursor-default",
        className
      )}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
};
