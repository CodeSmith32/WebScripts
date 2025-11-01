import { useEffect, useState } from "preact/hooks";
import { webScripts, type StoredScript } from "../../includes/webscripts";
import { usePopup } from "../popupCore/ClassPopup";
import { Popup } from "../popupCore/Popup";
import {
  array,
  boolean,
  object,
  optional,
  prettifyError,
  string,
  enum as zenum,
  ZodMiniType,
} from "zod/mini";
import { FileUpload } from "../core/FileUpload";
import { Button } from "../core/Button";
import { Spinner } from "../core/Spinner";
import { ErrorList } from "../ErrorList";
import { CodePack } from "../../includes/core/codepack";
import type { OnlyRequire } from "../../includes/core/types/utility";
import { useFutureCallback } from "../../hooks/core/useFutureCallback";
import { cn } from "../../includes/core/classes";
import { MultiSelect, Option } from "../core/Dropdown";
import { ImportIcon } from "lucide-preact";

const importedScriptsSchema: ZodMiniType<{
  compressed?: boolean;
  scripts: OnlyRequire<StoredScript, "code">[];
}> = object({
  compressed: optional(boolean()),
  scripts: array(
    object({
      id: optional(string()),
      name: optional(string()),
      patterns: optional(array(string())),
      language: optional(zenum(["typescript", "javascript"])),
      prettify: optional(boolean()),
      code: string(),
      // compiled: nullish(string()),
    })
  ),
});

const importInitialError = "Error occurred trying to import scripts.";

type ParseResult =
  | {
      success: true;
      scripts: StoredScript[];
    }
  | {
      success: false;
      errors: string[];
    };

const parseScriptsFromFile = async (file: Blob): Promise<ParseResult> => {
  // try parsing json
  let jsonData: unknown;
  try {
    jsonData = JSON.parse(await file.text());
  } catch (err) {
    return {
      success: false,
      errors: [
        importInitialError,
        "Failed to parse JSON:",
        (err as Error).message,
      ],
    };
  }

  // try validating as script type
  const parsed = importedScriptsSchema.safeParse(jsonData);
  if (!parsed.success) {
    return {
      success: false,
      errors: [
        importInitialError,
        "Failed to interpret object as scripts:",
        ...prettifyError(parsed.error).split("\n"),
      ],
    };
  }
  const { scripts, compressed } = parsed.data;

  // if compressed, validate compression; otherwise apply compression
  if (compressed) {
    const errors = [importInitialError, "Some compressed scripts are corrupt:"];
    let failed = false;

    for (const script of scripts) {
      try {
        CodePack.validate(script.code);
      } catch (err) {
        failed = true;
        errors.push(`${script.name} (${script.id}): `, (err as Error).message);
      }
    }

    if (failed) {
      return { success: false, errors };
    }
  } else {
    for (const script of scripts) {
      script.code = CodePack.pack(script.code);
    }
  }

  // normalize scripts
  return {
    success: true,
    scripts: scripts.map((script) => webScripts.normalizeScript(script)),
  };
};

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
        const result = await parseScriptsFromFile(file);
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
      title="Import Scripts"
      onEnter={handleAccept}
      onEscape={handleCancel}
      onClickOut={handleCancel}
      onClickX={handleCancel}
    >
      <p className="mb-4">Import scripts as JSON:</p>

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
