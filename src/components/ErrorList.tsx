import { Fragment } from "preact/jsx-runtime";

export interface ErrorListProps {
  errors: string[];
}

export const ErrorList = ({ errors }: ErrorListProps) => {
  if (!errors.length) return null;

  return (
    <p className="text-destructive">
      {errors.map((err, i) => (
        <Fragment key={i}>
          {err}
          <br />
        </Fragment>
      ))}
    </p>
  );
};
