import { useState } from "preact/hooks";
import type { ScriptLanguage, StoredScript } from "../../includes/webscripts";
import { Monaco } from "../Monaco";
import { TextBox } from "../TextBox";
import { IconButton } from "../IconButton";
import { XIcon } from "lucide-preact";
import { Dropdown, Option } from "../Dropdown";

export interface EditorPanelProps {
  script: StoredScript;
  onClose?: () => void;
}

export const EditorPanel = ({ script, onClose }: EditorPanelProps) => {
  const [language, setLanguage] = useState(script.language);
  const [code, setCode] = useState(script.code);
  const [name, setName] = useState(script.name);

  const [saved, setSaved] = useState(true);

  return (
    <div className="absolute inset-0 flex flex-col bg-black/40">
      <div className="h-12 flex flex-row justify-between items-center gap-2">
        <TextBox
          className="ml-2"
          value={name}
          onChange={(evt) => {
            setName((evt.target as HTMLInputElement).value);
            setSaved(false);
          }}
        />

        <Dropdown
          value={language}
          onChange={(evt) => {
            setLanguage(
              (evt.target as HTMLSelectElement).value as ScriptLanguage
            );
            setSaved(false);
          }}
        >
          <Option value="javascript">JavaScript</Option>
          <Option value="typescript">TypeScript</Option>
        </Dropdown>

        <div className="grow" />

        <IconButton className="p-0.5 w-8 h-8 mr-2" onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <div className="h-0 grow flex flex-col">
        <Monaco language={language} initialValue={code} />
      </div>
    </div>
  );
};
