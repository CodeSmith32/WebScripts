import { XIcon } from "lucide-preact";
import { IconButton } from "../IconButton";

export interface SettingsPanelProps {
  onClose?: () => void;
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  return (
    <div className="absolute inset-0 flex flex-col bg-black/40">
      <div className="h-12 flex flex-row justify-between items-center gap-2 mb-2">
        <div className="w-12 ml-2" />

        <h2 className="text-2xl font-medium">Settings</h2>

        <IconButton className="p-0.5 w-8 h-8 mr-2" onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
    </div>
  );
};
