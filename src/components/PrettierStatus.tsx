import type { ComponentChildren } from "preact";
import { StatusIndicator } from "./core/StatusIndicator";
import {
  CheckCheckIcon,
  EllipsisIcon,
  XIcon,
  type LucideProps,
} from "lucide-preact";

export type PrettierStatus = "failed" | "waiting" | "formatted";

const iconProps: LucideProps = {
  size: 16,
};

const statusIcon: Record<PrettierStatus, ComponentChildren> = {
  failed: <XIcon {...iconProps} />,
  waiting: <EllipsisIcon {...iconProps} />,
  formatted: <CheckCheckIcon {...iconProps} />,
};

const statusClasses: Record<PrettierStatus, string> = {
  failed: /* @tw */ "bg-destructive/40",
  waiting: /* @tw */ "bg-secondary/40",
  formatted: /* @tw */ "bg-success/40",
};

export interface PrettierStatusProps {
  status: PrettierStatus;
}

export const PrettierStatus = ({ status }: PrettierStatusProps) => {
  return (
    <StatusIndicator
      className={statusClasses[status]}
      icon={statusIcon[status]}
    />
  );
};
