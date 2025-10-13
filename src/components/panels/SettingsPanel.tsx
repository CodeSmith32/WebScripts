import { XIcon } from "lucide-preact";
import { IconButton } from "../IconButton";
import { SettingRow } from "../SettingRow";
import { LanguageDropdown } from "../LanguageDropdown";
import { Checkbox } from "../Checkbox";
import { SavingIndicator } from "../SavingIndicator";
import type { StoredSettings } from "../../includes/webscripts";
import { useSavingStatus } from "../../hooks/useSavingStatus";

export interface SettingsPanelProps {
  onClose?: () => void;
  settings: StoredSettings;
  onSave?: () => Promise<void>;
}

export const SettingsPanel = ({
  onClose,
  settings,
  onSave,
}: SettingsPanelProps) => {
  const [saveStatus, handleChange] = useSavingStatus(onSave);

  return (
    <div className="absolute inset-0 flex flex-col bg-background-dark">
      <div className="h-12 flex flex-row justify-between items-center gap-2 mb-2">
        <h2 className="text-2xl font-medium ml-4">Settings</h2>

        <div className="grow" />

        <SavingIndicator status={saveStatus} />

        <IconButton className="p-0.5 w-8 h-8 mr-2" onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>

      <div className="h-0 grow overflow-y-auto">
        <div className="pb-20">
          <SettingRow label="Default Language">
            <LanguageDropdown
              value={settings.defaultLanguage}
              onValueChange={(value) => {
                settings.defaultLanguage = value;
                handleChange();
              }}
            />
          </SettingRow>

          <SettingRow label="Prettify by Default">
            <Checkbox
              label="Prettify"
              checked={settings.defaultPrettify}
              onValueChange={(checked) => {
                settings.defaultPrettify = checked;
                handleChange();
              }}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
};
