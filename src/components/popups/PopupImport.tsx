import { useState } from "preact/hooks";
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

const importedScriptsSchema: ZodMiniType<{
  compressed?: boolean;
  scripts: OnlyRequire<StoredScript, "code">[];
}> = object({
  compressed: optional(boolean()),
  scripts: array(
    object({
      id: optional(string()),
      name: optional(string()),
      patterns: array(string()),
      language: optional(zenum(["typescript", "javascript"])),
      prettify: optional(boolean()),
      code: string(),
      // compiled: nullish(string()),
    })
  ),
});

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

  const handleCancel = () => {
    popup.close({ importedScripts: null });
  };

  const handleAccept = useFutureCallback(async () => {
    if (!file || loading) return;

    setLoading(true);

    const error = (messages: string[]) => {
      setErrors(["Error occurred trying to import scripts.", ...messages]);
    };

    try {
      // try parsing json
      let jsonData: unknown;
      try {
        jsonData = JSON.parse(await file.text());
      } catch (err) {
        error(["Failed to parse JSON:", (err as Error).message]);
        return;
      }

      // try validating as script type
      const parsed = importedScriptsSchema.safeParse(jsonData);
      if (!parsed.success) {
        error([
          "Failed to interpret object as scripts:",
          ...prettifyError(parsed.error).split("\n"),
        ]);
        return;
      }
      const { scripts, compressed } = parsed.data;

      // if compressed, validate compression; otherwise apply compression
      if (compressed) {
        let errors = ["Some compressed scripts are corrupt:"];
        let failed = false;

        for (const script of scripts) {
          try {
            CodePack.validate(script.code);
          } catch (err) {
            failed = true;
            errors.push(
              `${script.name} (${script.id}): `,
              (err as Error).message
            );
          }
        }

        if (failed) {
          error(errors);
          return;
        }
      } else {
        for (const script of scripts) {
          script.code = CodePack.pack(script.code);
        }
      }

      // normalize scripts
      const importedScripts = scripts.map((script) =>
        webScripts.normalizeScript(script)
      );

      // trigger onSubmit
      await onSubmit?.(importedScripts);

      // close and send response
      popup.close({ importedScripts });
    } finally {
      setLoading(false);
    }
  });

  return (
    <Popup
      title="Import Scripts"
      onEnter={handleAccept}
      onEscape={handleCancel}
      onClickOut={handleCancel}
      onClickX={handleCancel}
    >
      <p className="mb-4">Import scripts as JSON:</p>

      <FileUpload onFileSelect={(file) => setFile(file?.[0] ?? null)} />

      <div className="flex flex-row justify-between mt-4">
        <Button
          disabled={loading || !file}
          variant="primary"
          className="flex flex-row items-center gap-2"
          onClick={handleAccept}
        >
          {loading && <Spinner size={20} />} Import
        </Button>

        <Button disabled={loading} variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      <ErrorList errors={errors} className="mt-4" />
    </Popup>
  );
};
