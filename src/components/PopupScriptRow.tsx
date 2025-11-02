import { PencilIcon, ShieldAlertIcon } from "lucide-preact";
import { IconButton } from "./core/IconButton";
import { Switch } from "./core/Switch";
import type { StoredScript } from "../includes/types";

export interface PopupScriptRowProps {
  disabled?: boolean;
  script: StoredScript;
  switched: boolean;
  onSwitch?: () => void;
  onEdit?: () => void;
}

export const PopupScriptRow = ({
  disabled = false,
  script,
  switched,
  onSwitch,
  onEdit,
}: PopupScriptRowProps) => {
  return (
    <div className="flex flex-row items-center gap-2 p-1 rounded-md hover:bg-white/5">
      <Switch disabled={disabled} onClick={onSwitch} switched={switched} />
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
