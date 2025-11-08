import type { ComponentChildren } from "preact";

export interface SettingRowProps {
  label?: string;
  subHeading?: ComponentChildren;
  children?: ComponentChildren;
}

export const SettingRow = ({
  label,
  subHeading,
  children,
}: SettingRowProps) => {
  return (
    <div className="flex flex-row gap-4 py-3 px-4 min-h-14 border-b-2 first:border-t-2 border-background">
      <div className="w-0 grow" title={label}>
        <p className="w-full truncate mt-0.5">{label}</p>
        {subHeading}
      </div>
      <div className="w-0 grow-[2]">{children}</div>
    </div>
  );
};
