import { useState } from "preact/hooks";
import { webScripts } from "../../includes/services/webScriptService";
import { Checkbox } from "../core/Checkbox";
import { MultiSelect, Option } from "../core/Dropdown";
import { usePopup } from "../popupCore/ClassPopup";
import { Popup } from "../popupCore/Popup";
import { Button } from "../core/Button";
import { DownloadIcon } from "lucide-preact";
import { Spinner } from "../core/Spinner";
import { useFutureCallback } from "../../hooks/core/useFutureCallback";
import { wait } from "../../includes/utils";
import { downloadBlob } from "../../includes/core/download";
import { CodePack } from "../../includes/core/codepack";
import type { StoredScript } from "../../includes/types";

export interface PopupExportProps {
  scripts: StoredScript[];
}

export const PopupExport = ({ scripts }: PopupExportProps) => {
  const popup = usePopup<void>();

  const [compress, setCompress] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>(
    scripts.map(({ id }) => id)
  );

  const handleClose = () => {
    popup.close();
  };

  const handleExport = useFutureCallback(async () => {
    if (loading) return;

    setLoading(true);

    await wait(200);

    // filter / normalize selected scripts
    const set = new Set(selected);
    const selection = scripts
      .filter((script) => set.has(script.id))
      .map((script) => webScripts.normalizeScript(script));

    // generate json
    let json: string = "";
    if (compress) {
      const contents = {
        compress: true,
        scripts: selection.map(({ code }) => ({ code })),
      };
      json = JSON.stringify(contents);
    } else {
      const contents = {
        scripts: selection.map(({ id: _id, code, ...script }) => ({
          ...script,
          code: CodePack.unpack(code),
        })),
      };
      json = JSON.stringify(contents, null, "  ");
    }

    // download
    downloadBlob(
      new Blob([json], { type: "application/json" }),
      "webscripts-export.json"
    );

    await wait(200);

    setLoading(false);

    popup.close();
  });

  return (
    <Popup
      title="Export Scripts"
      onEnter={handleExport}
      onEscape={handleClose}
      onClickOut={handleClose}
      onClickX={handleClose}
    >
      <p className="mb-4">Exports scripts to JSON:</p>

      <MultiSelect
        className="w-full min-h-56"
        onValueChange={(value) => setSelected(value)}
      >
        {scripts.map((script) => (
          <Option
            key={script.id}
            value={script.id}
            selected={selected.includes(script.id)}
          >
            {script.name || "<Unnamed>"}
          </Option>
        ))}
      </MultiSelect>

      <Checkbox
        wrapperStyles="mt-4"
        checked={compress}
        onValueChange={(value) => setCompress(value)}
        label="Compressed / Minified"
      />

      <div className="flex flex-row justify-between mt-4">
        <Button
          disabled={loading || !selected.length}
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
