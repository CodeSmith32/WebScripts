import type { ComponentChildren } from "preact";

export interface SettingRowProps {
  label?: string;
  children?: ComponentChildren;
}

export const SettingRow = ({ label, children }: SettingRowProps) => {
  return (
    <div className="flex flex-row gap-4 py-3 px-4 border-b-2 first:border-t-2 border-background">
      <div className="w-0 grow truncate" title={label}>
        {label}
      </div>
      <div className="w-0 grow">{children}</div>
    </div>
  );
};
