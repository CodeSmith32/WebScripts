import { CheckIcon, XIcon, type LucideProps } from "lucide-preact";
import { Spinner } from "./Spinner";
import type { ComponentChildren } from "preact";
import { cn } from "../includes/classes";

export type SavingStatus = "unsaved" | "saving" | "saved";

export interface SavingIndicatorProps {
  status?: SavingStatus;
}

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
  unsaved: /* @tw */ "bg-destructive/30",
  saving: /* @tw */ "bg-secondary/30",
  saved: /* @tw */ "bg-primary/30",
};

export const SavingIndicator = ({
  status = "unsaved",
}: SavingIndicatorProps) => {
  return (
    <div
      className={cn(
        "flex flex-row gap-1 items-center pl-2 pr-3 py-1 text-sm rounded-[100px]",
        statusClasses[status]
      )}
    >
      {statusIcon[status]} <span>{statusText[status]}</span>
    </div>
  );
};
