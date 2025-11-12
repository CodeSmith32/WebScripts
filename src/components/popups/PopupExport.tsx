import { useMemo, useState } from "preact/hooks";
import { webScripts } from "../../includes/services/webScriptService";
import { Checkbox } from "../core/Checkbox";
import { MultiSelect, Option } from "../core/Dropdown";
import { usePopup } from "../core/popups/ClassPopup";
import { Popup } from "../core/popups/Popup";
import { Button } from "../core/Button";
import { DownloadIcon } from "lucide-preact";
import { Spinner } from "../core/Spinner";
import { useFutureCallback } from "../../hooks/core/useFutureCallback";
import { wait } from "../../includes/utils";
import { downloadBlob } from "../../includes/core/download";
import type { StoredScript, StoredSettings } from "../../includes/types";
import { exportService } from "../../includes/services/exportService";
import {
  allSettings,
  SettingsMultiSelect,
  type SettingsKey,
} from "../dropdowns/SettingsMultiSelect";

export interface PopupExportProps {
  settings: StoredSettings;
  scripts: StoredScript[];
}

export const PopupExport = ({ settings, scripts }: PopupExportProps) => {
  const popup = usePopup<void>();

  const allScripts = useMemo(() => scripts.map(({ id }) => id), [scripts]);

  const [compress, setCompress] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedSettings, setSelectedSettings] =
    useState<SettingsKey[]>(allSettings);
  const [selectedScripts, setSelectedScripts] = useState<string[]>(allScripts);

  const handleClose = () => {
    popup.close();
  };

  const handleExport = useFutureCallback(async () => {
    if (loading) return;

    setLoading(true);

    await wait(200);

    // filter / normalize selected scripts
    const set = new Set(selectedScripts);
    const scriptsExport = scripts
      .filter((script) => set.has(script.id))
      .map((script) => webScripts.normalizeScript(script));

    // filter settings
    const settingsExport = selectedSettings.reduce(
      (map, key) => ((map[key] = settings[key as never]), map),
      {} as Partial<StoredSettings>
    );

    // generate json
    const exportData = await exportService.exportScriptsToBlob({
      settings: settingsExport,
      scripts: scriptsExport,
      compress,
    });

    // download
    downloadBlob(exportData, "webscripts-export.json");

    await wait(200);

    setLoading(false);

    popup.close();
  });

  return (
    <Popup
      title="Export Scripts &amp; Settings As JSON"
      onEnter={handleExport}
      onEscape={handleClose}
      onClickOut={handleClose}
      onClickX={handleClose}
      popupClassName="w-xl"
    >
      <div className="flex flex-row gap-4">
        <div className="w-0 grow flex flex-col gap-2">
          <Checkbox
            label="Export scripts"
            onValueChange={(checked) =>
              setSelectedScripts(checked ? [...allScripts] : [])
            }
            checked={selectedScripts.length > 0}
            indeterminate={
              selectedScripts.length > 0 &&
              selectedScripts.length < allScripts.length
            }
          />

          <MultiSelect
            className="w-full h-60"
            onValueChange={(value) => setSelectedScripts(value)}
          >
            {scripts.map((script) => (
              <Option
                key={script.id}
                value={script.id}
                selected={selectedScripts.includes(script.id)}
              >
                {script.name || "<Unnamed>"}
              </Option>
            ))}
          </MultiSelect>
        </div>
        <div className="w-0 grow flex flex-col gap-2">
          <Checkbox
            label="Export settings"
            onValueChange={(checked) =>
              setSelectedSettings(checked ? [...allSettings] : [])
            }
            checked={selectedSettings.length > 0}
            indeterminate={
              selectedSettings.length > 0 &&
              selectedSettings.length < allSettings.length
            }
          />

          <SettingsMultiSelect
            className="w-full h-60"
            selection={selectedSettings}
            onValueChange={(value) => setSelectedSettings(value)}
          />
        </div>
      </div>

      <Checkbox
        wrapperStyles="mt-5 inline-flex"
        checked={compress}
        onValueChange={(value) => setCompress(value)}
        label="Compressed / Minified"
      />

      <div className="flex flex-row justify-between mt-6">
        <Button
          disabled={
            loading || (!selectedScripts.length && !selectedSettings.length)
          }
          variant="primary"
          className="flex flex-row items-center gap-2"
          onClick={handleExport}
        >
          {loading ? <Spinner size={20} /> : <DownloadIcon size={20} />} Export
        </Button>

        <Button disabled={loading} variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </div>
    </Popup>
  );
};
