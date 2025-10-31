import { ImportIcon, XIcon } from "lucide-preact";
import { IconButton } from "../core/IconButton";
import { SettingRow } from "../SettingRow";
import { LanguageDropdown } from "../LanguageDropdown";
import { Checkbox } from "../core/Checkbox";
import { SavingIndicator } from "../SavingIndicator";
import type { StoredSettings } from "../../includes/webscripts";
import { useSavingStatus } from "../../hooks/useSavingStatus";
import { TextArea } from "../core/TextArea";
import { useMemo, useRef, useState } from "preact/hooks";
import { debounce } from "../../includes/core/debounce";
import { editorSettingsManager } from "../../includes/managers/editorSettingsManager";
import { HelpUrl } from "../HelpUrl";
import type { ComponentChildren } from "preact";
import { ErrorList } from "../ErrorList";
import { keybindingManager } from "../../includes/managers/keybindingManager";
import { typescriptConfigManager } from "../../includes/managers/typescriptConfigManager";
import { prettierConfigManager } from "../../includes/managers/prettierConfigManager";
import { prettifyJson } from "../../includes/core/prettifyJson";
import { Button } from "../core/Button";
import { useFutureCallback } from "../../hooks/core/useFutureCallback";

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

  const lastEditorSettings = useRef(settings.editorSettingsJson);
  const lastKeybindings = useRef(settings.editorKeybindingsJson);
  const lastTSConfig = useRef(settings.typescriptConfigJson);
  const lastPrettierConfig = useRef(settings.prettierConfigJson);

  const [editorSettingsError, setEditorSettingsError] =
    useState<ComponentChildren>(null);
  const [keybindingsError, setKeybindingsError] =
    useState<ComponentChildren>(null);
  const [tsConfigError, setTSConfigError] = useState<ComponentChildren>(null);
  const [prettierConfigError, setPrettierConfigError] =
    useState<ComponentChildren>(null);

  const handleImport = useFutureCallback(async () => {
    // TODO
  });

  const handleExport = useFutureCallback(async () => {
    // TODO
  });

  // handler for updating configs
  const debounceUpdateConfigs = useMemo(() => {
    const updateErrors = () => {
      setEditorSettingsError(
        <ErrorList errors={editorSettingsManager.getErrors()} />
      );
      setKeybindingsError(<ErrorList errors={keybindingManager.getErrors()} />);
      setTSConfigError(
        <ErrorList errors={typescriptConfigManager.getErrors()} />
      );
      setPrettierConfigError(
        <ErrorList errors={prettierConfigManager.getErrors()} />
      );
    };

    const updateConfigs = debounce(() => {
      const editorSettings = settings.editorSettingsJson;
      const keybindings = settings.editorKeybindingsJson;
      const tsConfig = settings.typescriptConfigJson;
      const prettierConfig = settings.prettierConfigJson;

      // detect change / validate editor settings
      if (lastEditorSettings.current !== editorSettings) {
        lastEditorSettings.current = editorSettings;
        editorSettingsManager.setEditorSettings(editorSettings);
      }

      // detect change / validate keybindings
      if (lastKeybindings.current !== keybindings) {
        lastKeybindings.current = keybindings;
        keybindingManager.setKeybindings(keybindings);
      }

      // detect change / validate typescript config
      if (lastTSConfig.current !== tsConfig) {
        lastTSConfig.current = tsConfig;
        typescriptConfigManager.setTypeScriptConfig(tsConfig);
      }

      // detect change / validate prettier config
      if (lastPrettierConfig.current !== prettierConfig) {
        lastPrettierConfig.current = prettierConfig;
        prettierConfigManager.setPrettierConfig(prettierConfig);
      }
      updateErrors();
    }, 1000);

    updateErrors();

    return updateConfigs;
  }, []);

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

          <SettingRow label="Import Scripts From JSON">
            <Button
              variant="secondary"
              className="flex flex-row gap-2 justify-center items-center px-0 w-32"
              onClick={handleImport}
            >
              <ImportIcon size={20} /> Import
            </Button>
          </SettingRow>

          <SettingRow label="Export Scripts To JSON">
            <Button
              variant="secondary"
              className="flex flex-row gap-2 justify-center items-center px-0 w-32"
              onClick={handleExport}
            >
              <ImportIcon className="rotate-180" size={20} /> Export
            </Button>
          </SettingRow>

          <SettingRow
            label="Editor Settings (JSON)"
            subHeading={<HelpUrl url={editorSettingsManager.helpUrl} />}
          >
            <TextArea
              value={settings.editorSettingsJson}
              onValueChange={(value) => {
                settings.editorSettingsJson = value;
                handleChange();
                debounceUpdateConfigs();
              }}
              onBlur={() => {
                settings.editorSettingsJson = prettifyJson(
                  settings.editorSettingsJson
                );
                handleChange();
                debounceUpdateConfigs();
              }}
              codeEditor
            />
            {editorSettingsError}
          </SettingRow>

          <SettingRow
            label="Editor Keybindings (JSON)"
            subHeading={<HelpUrl url={keybindingManager.helpUrl} />}
          >
            <TextArea
              value={settings.editorKeybindingsJson}
              onValueChange={(value) => {
                settings.editorKeybindingsJson = value;
                handleChange();
                debounceUpdateConfigs();
              }}
              onBlur={() => {
                settings.editorKeybindingsJson = prettifyJson(
                  settings.editorKeybindingsJson
                );
                handleChange();
                debounceUpdateConfigs();
              }}
              codeEditor
            />
            {keybindingsError}
          </SettingRow>

          <SettingRow
            label="TypeScript Compiler Options Config (JSON)"
            subHeading={<HelpUrl url={typescriptConfigManager.helpUrl} />}
          >
            <TextArea
              value={settings.typescriptConfigJson}
              onValueChange={(value) => {
                settings.typescriptConfigJson = value;
                handleChange();
                debounceUpdateConfigs();
              }}
              onBlur={() => {
                settings.typescriptConfigJson = prettifyJson(
                  settings.typescriptConfigJson
                );
                handleChange();
                debounceUpdateConfigs();
              }}
              codeEditor
            />
            {tsConfigError}
          </SettingRow>

          <SettingRow
            label="Prettier Config (JSON)"
            subHeading={<HelpUrl url={prettierConfigManager.helpUrl} />}
          >
            <TextArea
              value={settings.prettierConfigJson}
              onValueChange={(value) => {
                settings.prettierConfigJson = value;
                handleChange();
                debounceUpdateConfigs();
              }}
              onBlur={() => {
                settings.prettierConfigJson = prettifyJson(
                  settings.prettierConfigJson
                );
                handleChange();
                debounceUpdateConfigs();
              }}
              codeEditor
            />
            {prettierConfigError}
          </SettingRow>
        </div>
      </div>
    </div>
  );
};
