import { useState } from "preact/hooks";
import { usePopup } from "../popupCore/ClassPopup";
import { Popup } from "../popupCore/Popup";
import { TextBox } from "../core/TextBox";
import { Checkbox } from "../core/Checkbox";
import { Button } from "../core/Button";
import { LanguageDropdown } from "../dropdowns/LanguageDropdown";
import type {
  ExecutionWorld,
  WhenTime,
  CSPAction,
  ScriptLanguage,
} from "../../includes/types";
import { CSPActionDropdown } from "../dropdowns/CSPActionDropdown";
import { ChevronDownIcon } from "lucide-preact";
import { cn } from "../../includes/core/classes";
import { storageService } from "../../includes/services/storageService";
import { WhenTimeDropdown } from "../dropdowns/WhenTimeDropdown";
import { ExecutionWorldDropdown } from "../dropdowns/ExecutionWorldDropdown";

export type PopupCreateNewCloseData = {
  name: string;
  language: ScriptLanguage;
  prettify: boolean;
  when: WhenTime;
  world: ExecutionWorld;
  csp: CSPAction;
} | null;

export const PopupCreateNew = () => {
  const popup = usePopup<PopupCreateNewCloseData>();

  const { defaultLanguage, defaultPrettify, defaultWhen, defaultWorld } =
    storageService.latestSettings;

  const [name, setName] = useState<string>("");
  const [language, setLanguage] = useState<ScriptLanguage>(defaultLanguage);
  const [prettify, setPrettify] = useState<boolean>(defaultPrettify);
  const [when, setWhen] = useState<WhenTime>(defaultWhen);
  const [world, setWorld] = useState<ExecutionWorld>(defaultWorld);
  const [csp, setCsp] = useState<CSPAction>("leave");

  const [advanced, setAdvanced] = useState(false);

  const isValid = !!(name && language);

  const onCancel = () => {
    popup.close(null);
  };
  const onCreate = () => {
    if (!isValid) return;
    popup.close({ name, language, prettify, when, world, csp });
  };

  return (
    <Popup
      title="Create New Script"
      onClickOut={onCancel}
      onClickX={onCancel}
      onEnter={onCreate}
      onEscape={onCancel}
      contentClassName="flex flex-col p-0"
    >
      <div className="flex flex-col gap-4 p-4 grow overflow-y-auto">
        <label className="flex flex-col gap-2">
          <span>Name:</span>
          <TextBox
            className="w-full"
            value={name}
            onValueChange={setName}
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>Language:</span>
          <LanguageDropdown value={language} onValueChange={setLanguage} />
        </label>

        <div className="flex flex-col gap-2">
          <span>Prettify</span>
          <Checkbox
            label="Enable code Prettify on save"
            checked={prettify}
            onValueChange={setPrettify}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="flex flex-row justify-between w-full px-3 py-1 rounded-md"
            onClick={() => setAdvanced((advanced) => !advanced)}
          >
            <p>Advanced Options</p>
            <ChevronDownIcon className={cn(advanced && "rotate-180")} />
          </Button>

          <div className="w-full h-[0.5px] bg-text/50" />

          <div className={cn("flex flex-col gap-4", advanced || "hidden")}>
            <div className="flex flex-col gap-2">
              <span>Execution Time</span>
              <WhenTimeDropdown value={when} onValueChange={setWhen} />
            </div>

            <div className="flex flex-col gap-2">
              <span>Execution World</span>
              <ExecutionWorldDropdown value={world} onValueChange={setWorld} />
            </div>

            <div className="flex flex-col gap-2">
              <span>Content-Security-Policy Action</span>
              <CSPActionDropdown value={csp} onValueChange={setCsp} />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-row justify-between shrink-0">
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
