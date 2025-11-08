import { useEffect, useState } from "preact/hooks";
import { usePopup } from "../popupCore/ClassPopup";
import { Popup } from "../popupCore/Popup";
import { FileUpload } from "../core/FileUpload";
import { Button } from "../core/Button";
import { Spinner } from "../core/Spinner";
import { ErrorList } from "../ErrorList";
import { useFutureCallback } from "../../hooks/core/useFutureCallback";
import { cn } from "../../includes/core/classes";
import { MultiSelect, Option } from "../core/Dropdown";
import { ImportIcon } from "lucide-preact";
import type { StoredScript } from "../../includes/types";
import { importService } from "../../includes/services/importService";

export interface PopupImportCloseData {
  importedScripts: StoredScript[] | null;
}

export interface PopupImportProps {
  onSubmit?: (scripts: StoredScript[]) => void | Promise<void>;
}

export const PopupImport = ({ onSubmit }: PopupImportProps) => {
  const popup = usePopup<PopupImportCloseData>();

  const [file, setFile] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [scripts, setScripts] = useState<StoredScript[] | null>(null);
  const [selection, setSelection] = useState<string[]>([]);

  const handleCancel = () => {
    popup.close({ importedScripts: null });
  };

  const handleAccept = useFutureCallback(async () => {
    if (!scripts || loading) return;

    setLoading(true);

    try {
      // filter to selected scripts
      const importedScripts = scripts.filter((script) =>
        selection.includes(script.id)
      );

      // trigger onSubmit
      await onSubmit?.(importedScripts);

      // close and send response
      popup.close({ importedScripts });
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    setScripts(null);
    setErrors([]);
    setSelection([]);
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

        console.log(result.scripts);

        setScripts(result.scripts);
        setSelection(result.scripts.map((script) => script.id));
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
      title="Import Scripts as JSON"
      onEnter={handleAccept}
      onEscape={handleCancel}
      onClickOut={handleCancel}
      onClickX={handleCancel}
    >
      <p className="mb-4">
        Select <code>*.json</code> file to import:
      </p>

      <FileUpload
        error={!!errors.length}
        wrapperStyle={cn(!!scripts && "min-h-none h-10")}
        headerStyle={cn(!!scripts && "hidden")}
        onFileSelect={(file) => setFile(file?.[0] ?? null)}
      />

      {scripts ? (
        <>
          <p className="mt-4">Select scripts to import:</p>
          <MultiSelect
            className="w-full mt-4 h-60"
            onValueChange={(value) => setSelection(value)}
          >
            {scripts.map((script) => (
              <Option
                key={script.id}
                value={script.id}
                selected={selection.includes(script.id)}
              >
                {script.name || "<Unnamed>"}
              </Option>
            ))}
          </MultiSelect>
        </>
      ) : null}

      <div className="flex flex-row justify-between mt-4">
        <Button
          disabled={loading || !selection.length}
          variant="primary"
          className="flex flex-row items-center gap-2"
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
