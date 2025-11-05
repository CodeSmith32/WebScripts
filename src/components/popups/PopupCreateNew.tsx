import { useState } from "preact/hooks";
import { usePopup } from "../popupCore/ClassPopup";
import { Popup } from "../popupCore/Popup";
import { TextBox } from "../core/TextBox";
import { Checkbox } from "../core/Checkbox";
import { Button } from "../core/Button";
import { LanguageDropdown } from "../LanguageDropdown";
import type { CSPAction, ScriptLanguage } from "../../includes/types";
import { CSPActionDropdown } from "../CSPActionDropdown";
import { ChevronDownIcon } from "lucide-preact";
import { cn } from "../../includes/core/classes";
import { storageService } from "../../includes/services/storageService";

export type PopupCreateNewCloseData = {
  name: string;
  language: ScriptLanguage;
  prettify: boolean;
  csp: CSPAction;
} | null;

export const PopupCreateNew = () => {
  const popup = usePopup<PopupCreateNewCloseData>();

  const { defaultLanguage, defaultPrettify } = storageService.latestSettings;

  const [name, setName] = useState<string>("");
  const [language, setLanguage] = useState<ScriptLanguage>(defaultLanguage);
  const [prettify, setPrettify] = useState<boolean>(defaultPrettify);
  const [csp, setCsp] = useState<CSPAction>("leave");

  const [advanced, setAdvanced] = useState(false);

  const isValid = !!(name && language);

  const onCancel = () => {
    popup.close(null);
  };
  const onCreate = () => {
    if (!isValid) return;
    popup.close({ name, language, prettify, csp });
  };

  return (
    <Popup
      title="Create New Script"
      onClickOut={onCancel}
      onClickX={onCancel}
      onEnter={onCreate}
      onEscape={onCancel}
    >
      <label className="flex flex-col gap-2 mb-4">
        <span>Name:</span>
        <TextBox
          className="w-full"
          value={name}
          onValueChange={setName}
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-2 mb-4">
        <span>Language:</span>
        <LanguageDropdown value={language} onValueChange={setLanguage} />
      </label>

      <div className="flex flex-col gap-2 mb-4">
        <span>Prettify</span>
        <Checkbox
          label="Enable code Prettify on save"
          checked={prettify}
          onValueChange={setPrettify}
        />
      </div>

      <div className="flex flex-col">
        <Button
          className="flex flex-row justify-between w-full px-3 py-1 rounded-md bg-text/5"
          onClick={() => setAdvanced((advanced) => !advanced)}
        >
          <p>Advanced Options</p>{" "}
          <ChevronDownIcon className={cn(advanced && "rotate-180")} />
        </Button>

        <div className={cn("mt-4", advanced || "hidden")}>
          <div className="flex flex-col gap-2">
            <span>Content-Security-Policy Action</span>
            <CSPActionDropdown value={csp} onValueChange={setCsp} />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-row justify-between">
        <Button variant="primary" onClick={onCreate} disabled={!isValid}>
          Create
        </Button>

        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Popup>
  );
};
