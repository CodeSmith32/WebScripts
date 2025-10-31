import { useEffect, useState } from "preact/hooks";
import { ScriptList } from "../components/ScriptList";
import { useOptionsData } from "../hooks/useOptionsData";
import {
  webScripts,
  type StoredScript,
  type UserScriptsErrorType,
} from "../includes/webscripts";
import { IconButton } from "../components/core/IconButton";
import { SettingsIcon, TriangleAlertIcon } from "lucide-preact";
import { cn } from "../includes/core/classes";
import { BlankPanel } from "../components/panels/BlankPanel";
import { SettingsPanel } from "../components/panels/SettingsPanel";
import { EditorPanel } from "../components/panels/EditorPanel";
import { useEditorModel } from "../hooks/useEditorModel";
import { usePopupManager } from "../components/popupCore/ClassPopupManager";
import {
  PopupCreateNew,
  type PopupCreateNewCloseData,
} from "../components/popups/PopupCreateNew";
import { EditableScript } from "../includes/editableScript";
import {
  PopupConfirm,
  type PopupConfirmCloseData,
} from "../components/popups/PopupConfirm";
import type { OnlyRequire } from "../includes/core/types/utility";
import { ScriptIcon } from "../components/ScriptIcon";
import { usePreventDefaultSave } from "../hooks/usePreventDefaultSave";
import { PopupAlert } from "../components/popups/PopupAlert";
import type { ComponentChildren } from "preact";

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
    await webScripts.removeUserScript(script);
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

  // show error if userScripts is disabled
  useEffect(() => {
    let cancel = false;

    (async () => {
      const userScripts = await webScripts.getUserScripts();
      if (cancel) return;

      if (userScripts) {
        // Make sure scripts are up-to-data:
        // Run resync task in background when options page is opened.
        await webScripts.resynchronizeUserScripts();
      } else {
        const messageTable: Record<UserScriptsErrorType, ComponentChildren> = {
          allowUserScripts: (
            <div>
              <p className="mb-3">
                You must enable <em>Allow User Scripts</em> for this extension
                in order to be able to use it.
              </p>
              <p className="mb-3">
                Go to <code>chrome://extensions</code>, find the{" "}
                <em>WebScripts</em> extension, and switch on the{" "}
                <em>Allow User Scripts</em> option.
              </p>
            </div>
          ),
          enableDeveloperMode: (
            <div>
              <p className="mb-3">
                You must enable <em>Developer Mode</em> in extensions in order
                to be able to use this extension.
              </p>
              <p className="mb-3">
                Go to <code>chrome://extensions</code>, and at the top-right
                look for and toggle on the <em>Developer Mode</em> switch.
              </p>
            </div>
          ),
          "": (
            <div>
              <p className="mb-3">
                An unknown error prevented the extension from accessing the
                userScripts API. Be sure to enable this extension's{" "}
                <em>Allow User Scripts</em> option, or <em>Developer Mode</em>.
              </p>
            </div>
          ),
        };
        const message = messageTable[webScripts.getUserScriptsError()];

        popupManager.open(
          <PopupAlert
            title="User Scripts Not Allowed"
            message={
              <div className="flex flex-row items-start">
                <TriangleAlertIcon
                  className="text-destructive px-4 py-1.5 box-content shrink-0"
                  size={40}
                />
                {message}
              </div>
            }
          />
        );
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

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
