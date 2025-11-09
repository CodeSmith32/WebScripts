import { PencilIcon, ShieldAlertIcon } from "lucide-preact";
import { IconButton } from "./core/IconButton";
import { Switch } from "./core/Switch";
import type { StoredScript } from "../includes/types";
import { useState } from "preact/hooks";

export type WarningTypes = "csp";

export interface PopupScriptRowProps {
  disabled?: boolean;
  script: StoredScript;
  running: boolean;
  initialValue: boolean;
  onClickLocked?: () => void;
  onChange?: (running: boolean) => void;
  onEdit?: () => void;
  onWarn?: (warning: WarningTypes) => void;
}

export const PopupScriptRow = ({
  disabled = false,
  script,
  running,
  initialValue,
  onClickLocked,
  onChange,
  onEdit,
  onWarn,
}: PopupScriptRowProps) => {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex flex-row items-center gap-2 p-1 rounded-md hover:bg-white/5">
      <Switch
        disabled={disabled || !!onClickLocked}
        onChange={(value) => {
          setValue(value);
          onChange?.(value);
        }}
        value={value}
        active={!disabled && value === running}
        onClick={onClickLocked}
      />
      <p className="text-text cursor-default">{script.name}</p>

      <div className="grow" />

      {script.csp === "disable" && (
        <IconButton
          title="This script disables the page's Content Security Policy."
          className="w-7 h-7 opacity-50 hover:opacity-100 cursor-help"
          onClick={() => {
            onWarn?.("csp");
          }}
        >
          <ShieldAlertIcon className="text-secondary" size={18} />
        </IconButton>
      )}

      <IconButton title="Edit Script" className="w-7 h-7" onClick={onEdit}>
        <PencilIcon className="text-white" size={16} />
      </IconButton>
    </div>
  );
};
