import { LoaderCircleIcon } from "lucide-preact";

export interface SpinnerProps {
  className?: string;
}

export const Spinner = ({ className }: SpinnerProps) => {
  return (
    <div className={className}>
      <LoaderCircleIcon className="animate-spin" />
    </div>
  );
};
