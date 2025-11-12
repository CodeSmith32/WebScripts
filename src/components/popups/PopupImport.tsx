import { useEffect, useMemo, useState } from "preact/hooks";
import { usePopup } from "../core/popups/ClassPopup";
import { Popup } from "../core/popups/Popup";
import { FileUpload } from "../core/FileUpload";
import { Button } from "../core/Button";
import { Spinner } from "../core/Spinner";
import { ErrorList } from "../ErrorList";
import { useFutureCallback } from "../../hooks/core/useFutureCallback";
import { cn } from "../../includes/core/classes";
import { MultiSelect, Option } from "../core/Dropdown";
import { ImportIcon } from "lucide-preact";
import type { StoredScript, StoredSettings } from "../../includes/types";
import { importService } from "../../includes/services/importService";
import { Checkbox } from "../core/Checkbox";
import {
  type SettingsKey,
  SettingsMultiSelect,
} from "../dropdowns/SettingsMultiSelect";

export interface ImportData {
  settings: Partial<StoredSettings>;
  scripts: StoredScript[];
}

export type PopupImportCloseData = ImportData | null;

export interface PopupImportProps {
  onSubmit?: (data: ImportData) => void | Promise<void>;
}

export const PopupImport = ({ onSubmit }: PopupImportProps) => {
  const popup = usePopup<PopupImportCloseData>();

  const [file, setFile] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [settings, setSettings] = useState<Partial<StoredSettings> | null>(
    null
  );
  const [scripts, setScripts] = useState<StoredScript[] | null>(null);

  const [selectedSettings, setSelectedSettings] = useState<SettingsKey[]>([]);
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);

  const allSettings: SettingsKey[] = useMemo(
    () => Object.keys(settings ?? {}) as SettingsKey[],
    [settings]
  );
  const allScripts: string[] = useMemo(
    () => scripts?.map(({ id }) => id) ?? [],
    [scripts]
  );

  const handleCancel = () => {
    popup.close(null);
  };

  const handleAccept = useFutureCallback(async () => {
    if (!scripts || loading) return;

    setLoading(true);

    try {
      // filter to selected settings / scripts
      const importedSettings = settings
        ? selectedSettings.reduce(
            (map, key) => ((map[key] = settings[key as never]), map),
            {} as Partial<StoredSettings>
          )
        : {};
      const importedScripts = scripts.filter((script) =>
        selectedScripts.includes(script.id)
      );

      // trigger onSubmit
      await onSubmit?.({
        settings: importedSettings,
        scripts: importedScripts,
      });

      // close and send response
      popup.close(null);
    } finally {
      setLoading(false);
    }
  });

  // reset selection on file change
  useEffect(() => {
    setSettings(null);
    setScripts(null);
    setErrors([]);
    setSelectedSettings([]);
    setSelectedScripts([]);
    setLoading(false);

    if (!file) return;

    let cancel = false;

    (async () => {
      setLoading(true);

      try {
        const result = await importService.parseScriptsFromFile(file);
        if (cancel) return;

        if (!result.success) {
          setErrors(result.errors);
          return;
        }

        setSettings(result.settings);
        setScripts(result.scripts);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [file]);

  return (
    <Popup
      title="Import Scripts & Settings From JSON"
      onEnter={handleAccept}
      onEscape={handleCancel}
      onClickOut={handleCancel}
      onClickX={handleCancel}
      popupClassName="w-xl"
    >
      <p className="mb-4">
        Select <code>*.json</code> file to import from:
      </p>

      <FileUpload
        error={!!errors.length}
        wrapperStyle={cn(!!scripts && "min-h-none h-10")}
        headerStyle={cn(!!scripts && "hidden")}
        onFileSelect={(file) => setFile(file?.[0] ?? null)}
      />

      {scripts ? (
        <div className="flex flex-row gap-4 mt-5 mb-6">
          <div className="w-0 grow flex flex-col gap-2">
            <Checkbox
              label="Import Scripts"
              onValueChange={(checked) =>
                setSelectedScripts(checked ? allScripts : [])
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
              label="Import Settings"
              onValueChange={(checked) =>
                setSelectedSettings(checked ? allSettings : [])
              }
              checked={selectedSettings.length > 0}
              indeterminate={
                selectedSettings.length > 0 &&
                selectedSettings.length < allSettings.length
              }
            />

            <SettingsMultiSelect
              className="w-full h-60"
              options={allSettings}
              selection={selectedSettings}
              onValueChange={(value) => setSelectedSettings(value)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-row justify-between mt-4">
        <Button
          disabled={
            loading || (!selectedScripts.length && !selectedSettings.length)
          }
          variant="primary"
          onClick={handleAccept}
        >
          {loading ? <Spinner size={20} /> : <ImportIcon size={20} />} Import
        </Button>

        <Button disabled={loading} variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      <ErrorList errors={errors} className="mt-4" />
    </Popup>
  );
};
