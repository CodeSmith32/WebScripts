import { LoaderCircleIcon, type LucideProps } from "lucide-preact";
import { cn } from "../includes/classes";

export interface SpinnerProps extends LucideProps {
  wrapperClassName?: string;
}

export const Spinner = ({
  wrapperClassName,
  className,
  ...props
}: SpinnerProps) => {
  return (
    <div className={wrapperClassName}>
      <LoaderCircleIcon className={cn("animate-spin", className)} {...props} />
    </div>
  );
};
