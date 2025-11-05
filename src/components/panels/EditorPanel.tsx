import { Monaco } from "../Monaco";
import { TextBox } from "../core/TextBox";
import { IconButton } from "../core/IconButton";
import { XIcon } from "lucide-preact";
import type { EditorModelData } from "../../hooks/useEditorModels";
import { Checkbox } from "../core/Checkbox";
import { LanguageDropdown } from "../LanguageDropdown";
import { useSavingStatus } from "../../hooks/useSavingStatus";
import { SavingIndicator } from "../SavingIndicator";
import { useEffect, useMemo, useState } from "preact/hooks";
import { debounce } from "../../includes/core/debounce";
import { PrettierStatus } from "../PrettierStatus";

export interface EditorPanelProps {
  model: EditorModelData;
  onClose?: () => void;
}

export const EditorPanel = ({ model, onClose }: EditorPanelProps) => {
  const { script } = model;

  const [saveStatus, triggerSave, triggerUnsaved] = useSavingStatus(() =>
    model.save()
  );
  const saveAfter = useMemo(() => debounce(triggerSave, 2000), []);
  const [prettierStatus, setPrettierStatus] =
    useState<PrettierStatus>("waiting");

  useEffect(() => {
    const subscription = model.model.onDidChangeContent(() => {
      triggerUnsaved();
      setPrettierStatus("waiting");
      saveAfter();
    });

    return () => {
      model.save();
      subscription.dispose();
    };
  }, []);

  return (
    <div
      className="absolute inset-0 flex flex-col bg-background-dark"
      onKeyDown={async (evt) => {
        if (evt.key === "s" && evt.ctrlKey) {
          evt.preventDefault();
          if (script.prettify) {
            const success = await model.prettifyCode();
            setPrettierStatus(success ? "formatted" : "failed");
          }
          triggerSave();
        }
      }}
    >
      <div className="p-2 flex flex-row flex-wrap justify-between items-center gap-2">
        <TextBox
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
            model.setEditorLanguage(value);
            model.rebuildHeader();
          }}
        />

        <div className="flex flex-row items-center gap-1">
          <Checkbox
            label="Prettify"
            checked={script.prettify}
            onValueChange={(checked) => {
              script.prettify = checked;
              model.rebuildHeader();
            }}
          />

          {script.prettify && <PrettierStatus status={prettierStatus} />}
        </div>

        <div className="grow" />

        <SavingIndicator status={saveStatus} />

        <IconButton className="p-0.5 w-8 h-8" onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <div className="h-0 grow flex flex-col">
        <Monaco model={model.model} editorContainer={model} />
      </div>
    </div>
  );
};
