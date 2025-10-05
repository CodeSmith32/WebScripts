import type { ScriptLanguage } from "../../includes/webscripts";
import { Monaco } from "../Monaco";
import { TextBox } from "../TextBox";
import { IconButton } from "../IconButton";
import { XIcon } from "lucide-preact";
import { Dropdown, Option } from "../Dropdown";
import type { EditorModelData } from "../../hooks/useEditorModel";

export interface EditorPanelProps {
  model: EditorModelData;
  onClose?: () => void;
}

export const EditorPanel = ({ model, onClose }: EditorPanelProps) => {
  const { script } = model;

  return (
    <div className="absolute inset-0 flex flex-col bg-black/40">
      <div className="h-12 flex flex-row justify-between items-center gap-2">
        <TextBox
          className="ml-2"
          value={script.name}
          onChange={(evt) => {
            model.setName((evt.target as HTMLInputElement).value);
          }}
        />

        <Dropdown
          value={script.language}
          onChange={(evt) => {
            model.setLanguage(
              (evt.target as HTMLSelectElement).value as ScriptLanguage
            );
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
        <Monaco language={script.language} model={model.model} />
      </div>
    </div>
  );
};
