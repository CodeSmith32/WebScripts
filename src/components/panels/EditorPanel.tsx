import { Monaco } from "../Monaco";
import { TextBox } from "../core/TextBox";
import { IconButton } from "../core/IconButton";
import { XIcon } from "lucide-preact";
import type { EditorModelData } from "../../hooks/useEditorModel";
import { Checkbox } from "../core/Checkbox";
import { LanguageDropdown } from "../LanguageDropdown";

export interface EditorPanelProps {
  model: EditorModelData;
  onClose?: () => void;
}

export const EditorPanel = ({ model, onClose }: EditorPanelProps) => {
  const { script } = model;

  return (
    <div
      className="absolute inset-0 flex flex-col bg-background-dark"
      onKeyDown={async (evt) => {
        if (evt.key === "s" && evt.ctrlKey) {
          evt.preventDefault();
          if (script.prettify) {
            await model.prettifyCode();
          }
          await model.save();
        }
      }}
    >
      <div className="h-12 flex flex-row justify-between items-center gap-2">
        <TextBox
          className="ml-2"
          value={script.name}
          onValueChange={(value) => {
            script.name = value;
            model.rebuildHeader();
          }}
        />

        <LanguageDropdown
          value={script.language}
          onValueChange={(value) => {
            script.language = value;
            model.rebuildHeader();
          }}
        />

        <Checkbox
          label="Prettify"
          checked={script.prettify}
          onValueChange={(checked) => {
            script.prettify = checked;
            model.rebuildHeader();
          }}
        />

        <div className="grow" />

        <IconButton className="p-0.5 w-8 h-8 mr-2" onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <div className="h-0 grow flex flex-col">
        <Monaco
          language={script.language}
          model={model.model}
          editorContainer={model}
        />
      </div>
    </div>
  );
};
