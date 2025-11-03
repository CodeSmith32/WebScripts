import { PencilIcon, ShieldAlertIcon } from "lucide-preact";
import { IconButton } from "./core/IconButton";
import { Switch } from "./core/Switch";
import type { StoredScript } from "../includes/types";
import { useState } from "preact/hooks";

export interface PopupScriptRowProps {
  disabled?: boolean;
  script: StoredScript;
  running: boolean;
  onChange?: (running: boolean) => void;
  onEdit?: () => void;
}

export const PopupScriptRow = ({
  disabled = false,
  script,
  running,
  onChange,
  onEdit,
}: PopupScriptRowProps) => {
  const [value, setValue] = useState(running);

  return (
    <div className="flex flex-row items-center gap-2 p-1 rounded-md hover:bg-white/5">
      <Switch
        disabled={disabled}
        onChange={(value) => {
          setValue(value);
          onChange?.(value);
        }}
        value={value}
        active={value === running}
      />
      <p className="text-text">{script.name}</p>

      <div className="grow" />

      {script.csp === "disable" && (
        <div
          title="This script disables the Content Security Policy"
          className="opacity-50 hover:opacity-100 cursor-help"
        >
          <ShieldAlertIcon className="text-secondary" size={20} />
        </div>
      )}

      <IconButton onClick={onEdit}>
        <PencilIcon className="text-white" size={20} />
      </IconButton>
    </div>
  );
};
