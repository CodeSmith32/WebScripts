import { useEffect, useState } from "preact/hooks";
import { ScriptList } from "../components/ScriptList";
import { useOptionsData } from "../hooks/useOptionsData";
import { webScripts, type StoredScript } from "../includes/webscripts";
import { IconButton } from "../components/core/IconButton";
import { SettingsIcon } from "lucide-preact";
import { cn } from "../includes/core/classes";
import { BlankPanel } from "../components/panels/BlankPanel";
import { SettingsPanel } from "../components/panels/SettingsPanel";
import { EditorPanel } from "../components/panels/EditorPanel";
import { useEditorModel } from "../hooks/useEditorModel";
import { usePopupManager } from "../components/popups/ClassPopupManager";
import {
  PopupCreateNew,
  type PopupCreateNewCloseData,
} from "../components/PopupCreateNew";
import { EditableScript } from "../includes/editableScript";
import {
  PopupConfirm,
  type PopupConfirmCloseData,
} from "../components/PopupConfirm";
import type { OnlyRequire } from "../includes/core/types/utility";
import { ScriptIcon } from "../components/ScriptIcon";
import { usePreventDefaultSave } from "../hooks/usePreventDefaultSave";

const settingsIdentifier = Symbol("SETTINGS");

export const OptionsPage = () => {
  usePreventDefaultSave();

  const { data: optionsData } = useOptionsData();
  const [active, setActive] = useState<StoredScript | symbol | null>(null);
  const currentModel = useEditorModel(
    typeof active === "symbol" ? null : active,
    optionsData?.saveAllScripts
  );

  const popupManager = usePopupManager();

  const onSettings = () => {
    setActive(settingsIdentifier);
  };
  const onClose = () => {
    setActive(null);
  };
  const onAddNew = async () => {
    if (!optionsData) return;

    const newData: OnlyRequire<
      StoredScript,
      "name" | "language" | "prettify"
    > | null = await popupManager.open<PopupCreateNewCloseData>(
      <PopupCreateNew />
    ).waitClose;
    if (!newData) return;

    newData.code =
      webScripts.generateHeader(Object.assign(newData, { patterns: [] })) +
      "\n\n";

    const newScript = EditableScript.createNew(newData);
    const script = newScript.storedScript();
    await optionsData.saveScript(script);

    setActive(script);
  };
  const onDelete = async (script: StoredScript) => {
    if (!optionsData) return;

    const result = await popupManager.open<PopupConfirmCloseData>(
      <PopupConfirm
        title="Delete Script"
        message={
          <>
            <p className="mb-3">Are you sure you want to delete this script?</p>
            <div className="mb-3 flex flex-row gap-2 items-center p-2 rounded-md bg-background">
              <ScriptIcon script={script} />
              <span>{script.name}</span>
            </div>
          </>
        }
        yesLabel="Delete"
        yesVariant="destructive"
      />
    ).waitClose;
    if (result.decision !== true) return;

    if (active === script) setActive(null);
    await optionsData.deleteScript(script);
  };

  // trigger jump to referred script
  useEffect(() => {
    if (optionsData?.refer) {
      const id = optionsData.refer;
      const script = optionsData.scripts.find((script) => script.id === id);
      optionsData.refer = null;

      if (script) setActive(script);
    }
  }, [optionsData?.refer]);

  return (
    <div className="text-text fixed inset-0 bg-background flex flex-col">
      <div className="h-20 flex flex-row justify-center items-center gap-4">
        <div className="w-20 flex flex-row items-center justify-center">
          <IconButton
            onClick={onSettings}
            className={cn(
              "w-12 h-12 opacity-20 hover:opacity-100",
              active === settingsIdentifier && "opacity-100"
            )}
          >
            <SettingsIcon size={30} />
          </IconButton>
        </div>
        <div className="grow" />
        <img className="w-16 h-16" src="img/icon.svg" />
        <p className="text-4xl font-bold">WebScripts</p>
        <div className="grow" />
        <div className="w-20" />
      </div>

      <div className="h-0 grow flex flex-row">
        <div className="w-0 grow-[1] relative">
          <ScriptList
            className="absolute inset-0"
            scripts={optionsData?.scripts}
            active={active}
            onAdd={onAddNew}
            onDelete={onDelete}
            onSelect={(script) => setActive(script)}
          />
        </div>

        <div className="w-0 grow-[4] flex relative mr-2 mb-2 rounded-lg overflow-hidden">
          {active === settingsIdentifier ? (
            optionsData?.settings ? (
              <SettingsPanel
                onClose={onClose}
                settings={optionsData.settings}
                onSave={optionsData.saveSettings}
              />
            ) : null
          ) : active && typeof active === "object" ? (
            currentModel ? (
              <EditorPanel
                key={active.id}
                model={currentModel}
                onClose={onClose}
              />
            ) : null
          ) : (
            <BlankPanel />
          )}
        </div>
      </div>
    </div>
  );
};
