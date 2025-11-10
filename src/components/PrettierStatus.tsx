import type { ComponentChildren } from "preact";
import {
  StatusIndicator,
  type StatusIndicatorProps,
} from "./core/StatusIndicator";
import {
  CheckCheckIcon,
  EllipsisIcon,
  XIcon,
  type LucideProps,
} from "lucide-preact";
import { cn } from "../includes/core/classes";

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

export interface PrettierStatusProps extends StatusIndicatorProps {
  status: PrettierStatus | null;
}

export const PrettierStatus = ({
  status,
  className,
  ...props
}: PrettierStatusProps) => {
  return (
    <StatusIndicator
      className={cn(status ? statusClasses[status] : "", className)}
      icon={status ? statusIcon[status] : null}
      {...props}
    />
  );
};
