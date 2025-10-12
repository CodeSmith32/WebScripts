import { PencilIcon } from "lucide-preact";
import { IconButton } from "./IconButton";
import { Switch } from "./Switch";

export interface PopupScriptRowProps {
  disabled?: boolean;
  name: string;
  switched: boolean;
  onSwitch?: () => void;
  onEdit?: () => void;
}

export const PopupScriptRow = ({
  disabled = false,
  name,
  switched,
  onSwitch,
  onEdit,
}: PopupScriptRowProps) => {
  return (
    <div className="flex flex-row gap-2 p-1 rounded-md hover:bg-white/5">
      <Switch disabled={disabled} onClick={onSwitch} switched={switched} />
      <p className="text-text">{name}</p>

      <div className="grow" />

      <IconButton onClick={onEdit}>
        <PencilIcon className="text-white" />
      </IconButton>
    </div>
  );
};
