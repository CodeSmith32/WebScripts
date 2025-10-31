import { Fragment } from "preact/jsx-runtime";
import { cn } from "../includes/core/classes";

export interface ErrorListProps {
  errors: string[];
  limit?: number;
  className?: string;
}

export const ErrorList = ({
  errors,
  limit = 10,
  className,
}: ErrorListProps) => {
  if (!errors.length) return null;

  if (errors.length > limit) {
    errors = errors.slice(0, limit - 1);
    errors.push("...");
  }

  return (
    <p className={cn("text-destructive", className)}>
      {errors.map((err, i) => (
        <Fragment key={i}>
          {err}
          <br />
        </Fragment>
      ))}
    </p>
  );
};
