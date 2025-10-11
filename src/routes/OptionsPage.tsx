import { useState } from "preact/hooks";
import { ScriptList } from "../components/ScriptList";
import { useOptionsData } from "../hooks/useOptionsData";
import type { StoredScript } from "../includes/webscripts";
import { IconButton } from "../components/IconButton";
import { SettingsIcon } from "lucide-preact";
import { cn } from "../includes/classes";
import { BlankPanel } from "../components/panels/BlankPanel";
import { SettingsPanel } from "../components/panels/SettingsPanel";
import { EditorPanel } from "../components/panels/EditorPanel";
import { useEditorModel } from "../hooks/useEditorModel";

const settingsIdentifier = Symbol("SETTINGS");

export const OptionsPage = () => {
  const { data } = useOptionsData();

  const [active, setActive] = useState<StoredScript | symbol | null>(null);

  const currentModel = useEditorModel(
    typeof active === "symbol" ? null : active,
    data?.saveAllScripts
  );

  const onSettings = () => {
    setActive(settingsIdentifier);
  };

  const onClose = () => {
    setActive(null);
  };

  return (
    <div className="text-white fixed inset-0 bg-neutral-900 flex flex-col">
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

      <div className="grow flex flex-row">
        <div className="w-0 grow-[1] flex">
          <ScriptList
            scripts={data?.scripts}
            active={active}
            onSelect={(script) => setActive(script)}
          />
        </div>

        <div className="w-0 grow-[4] flex relative mr-2 mb-2 rounded-lg overflow-hidden">
          {active === settingsIdentifier ? (
            <SettingsPanel onClose={onClose} />
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
