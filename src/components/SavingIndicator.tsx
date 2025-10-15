import { CheckIcon, XIcon, type LucideProps } from "lucide-preact";
import { Spinner } from "./core/Spinner";
import type { ComponentChildren } from "preact";
import { StatusIndicator } from "./core/StatusIndicator";

export type SavingStatus = "unsaved" | "saving" | "saved";

const statusText: Record<SavingStatus, string> = {
  unsaved: "Unsaved",
  saving: "Saving...",
  saved: "Saved!",
};

const iconProps: LucideProps = {
  size: 16,
};

const statusIcon: Record<SavingStatus, ComponentChildren> = {
  unsaved: <XIcon {...iconProps} />,
  saving: <Spinner {...iconProps} />,
  saved: <CheckIcon {...iconProps} />,
};

const statusClasses: Record<SavingStatus, string> = {
  unsaved: /* @tw */ "bg-destructive/40",
  saving: /* @tw */ "bg-secondary/40",
  saved: /* @tw */ "bg-success/40",
};

export interface SavingIndicatorProps {
  status?: SavingStatus;
}

export const SavingIndicator = ({
  status = "unsaved",
}: SavingIndicatorProps) => {
  return (
    <StatusIndicator
      className={statusClasses[status]}
      icon={statusIcon[status]}
      label={statusText[status]}
    />
  );
};
