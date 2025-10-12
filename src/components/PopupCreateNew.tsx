import { useState } from "preact/hooks";
import { usePopup } from "./popups/ClassPopup";
import { Popup } from "./popups/Popup";
import { TextBox } from "./TextBox";
import { Dropdown, Option } from "./Dropdown";
import type { ScriptLanguage } from "../includes/webscripts";
import { Checkbox } from "./Checkbox";
import { Button } from "./Button";

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

  const onCancel = () => {
    popup.close(null);
  };
  const onCreate = () => {
    popup.close({ name, language, prettify });
  };

  const isValid = !!(name && language);

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
        <TextBox className="w-full" value={name} onValueChange={setName} />
      </label>

      <label className="flex flex-col gap-2 mb-4">
        <span>Language:</span>
        <Dropdown
          value={language}
          onValueChange={(language) => {
            setLanguage(language as ScriptLanguage);
          }}
        >
          <Option value="javascript">JavaScript</Option>
          <Option value="typescript">TypeScript</Option>
        </Dropdown>
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
        <Button variant="primary" onClick={onCreate} disabled={isValid}>
          Create
        </Button>

        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Popup>
  );
};
