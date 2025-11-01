import { useState } from "preact/hooks";
import { usePopup } from "../popupCore/ClassPopup";
import { Popup } from "../popupCore/Popup";
import { TextBox } from "../core/TextBox";
import type { ScriptLanguage } from "../../includes/services/webScriptService";
import { Checkbox } from "../core/Checkbox";
import { Button } from "../core/Button";
import { LanguageDropdown } from "../LanguageDropdown";

export type PopupCreateNewCloseData = {
  name: string;
  language: ScriptLanguage;
  prettify: boolean;
} | null;

export const PopupCreateNew = () => {
  const popup = usePopup<PopupCreateNewCloseData>();
  const [name, setName] = useState<string>("");
  const [language, setLanguage] = useState<ScriptLanguage>("javascript");
  const [prettify, setPrettify] = useState<boolean>(false);

  const isValid = !!(name && language);

  const onCancel = () => {
    popup.close(null);
  };
  const onCreate = () => {
    if (!isValid) return;
    popup.close({ name, language, prettify });
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

      <div className="pt-1 flex flex-row justify-between">
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
