import type { StoredSettings } from "../../includes/types";
import { MultiSelect, Option, type MultiSelectProps } from "../core/Dropdown";

const settingsTable: Record<keyof StoredSettings, string> = {
  defaultLanguage: "Default Language",
  defaultPrettify: "Prettify by Default",
  defaultVersion: "New Script Version",
  defaultAuthor: "New Script Author",
  defaultDescription: "New Script Description",
  defaultLocked: "Lock Scripts by Default",
  defaultWhen: "Default Execution Time",
  defaultWorld: "Default Execution World",
  editorSettingsJson: "Editor Settings (JSON)",
  editorKeybindingsJson: "Editor Keybindings (JSON)",
  typescriptConfigJson: "TypeScript Config (JSON)",
  prettierConfigJson: "Prettier Config (JSON)",
};

export type SettingsKey = keyof StoredSettings;

export const allSettings = Object.keys(settingsTable) as SettingsKey[];

export interface SettingsMultiSelectProps
  extends Omit<MultiSelectProps, "onValueChange"> {
  options?: SettingsKey[];
  selection?: SettingsKey[];
  onValueChange?: (value: SettingsKey[]) => void;
}

export const SettingsMultiSelect = ({
  options,
  selection,
  onValueChange,
  ...props
}: SettingsMultiSelectProps) => {
  options ??= allSettings;

  return (
    <MultiSelect
      onValueChange={(value) =>
        onValueChange?.(value as (keyof StoredSettings)[])
      }
      {...props}
    >
      {allSettings.map((key) =>
        options.includes(key) ? (
          <Option key={key} value={key} selected={selection?.includes(key)}>
            {settingsTable[key]}
          </Option>
        ) : null
      )}
    </MultiSelect>
  );
};
