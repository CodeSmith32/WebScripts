import { PencilIcon, ShieldAlertIcon } from "lucide-preact";
import { IconButton } from "./core/IconButton";
import { Switch } from "./core/Switch";
import type { StoredScript } from "../includes/types";
import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

export interface PopupScriptRowProps {
  disabled?: boolean;
  script: StoredScript;
  running: boolean;
  initialValue: boolean;
  onChange?: (running: boolean) => void;
  onEdit?: () => void;
  onWarn?: (message: ComponentChildren) => void;
}

export const PopupScriptRow = ({
  disabled = false,
  script,
  running,
  initialValue,
  onChange,
  onEdit,
  onWarn,
}: PopupScriptRowProps) => {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex flex-row items-center gap-2 p-1 rounded-md hover:bg-white/5">
      <Switch
        disabled={disabled}
        onChange={(value) => {
          setValue(value);
          onChange?.(value);
        }}
        value={value}
        active={!disabled && value === running}
      />
      <p className="text-text">{script.name}</p>

      <div className="grow" />

      {script.csp === "disable" && (
        <IconButton
          title="This script disables the page's Content Security Policy."
          className="opacity-50 hover:opacity-100 cursor-help"
          onClick={() => {
            onWarn?.(
              <div className="flex flex-row justify-center items-center gap-2">
                <ShieldAlertIcon
                  className="text-secondary shrink-0"
                  size={24}
                />
                <p className="text-left">
                  Scripts with this icon disable the
                  <br />
                  page's Content Security Policy.
                </p>
              </div>
            );
          }}
        >
          <ShieldAlertIcon className="text-secondary" size={20} />
        </IconButton>
      )}

      <IconButton onClick={onEdit}>
        <PencilIcon className="text-white" size={20} />
      </IconButton>
    </div>
  );
};
