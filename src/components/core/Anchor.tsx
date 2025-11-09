import type { AnchorHTMLAttributes } from "preact";
import { cn } from "../../includes/core/classes";

export type AnchorProps = AnchorHTMLAttributes;

export const Anchor = ({
  href,
  target = "_blank",
  title,
  className,
  ...props
}: AnchorProps) => {
  return (
    <a
      href={href}
      target={target}
      title={title ?? href}
      className={cn(
        "text-blue-300 hover:text-blue-200 active:text-blue-500",
        className
      )}
      {...props}
    />
  );
};
