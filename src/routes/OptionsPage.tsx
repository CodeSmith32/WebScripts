import { useEffect, useState } from "preact/hooks";
import { ScriptList } from "../components/ScriptList";
import { useOptionsData } from "../hooks/useOptionsData";
import { webScripts } from "../includes/services/webScriptService";
import { IconButton } from "../components/core/IconButton";
import { SettingsIcon, Trash2Icon } from "lucide-preact";
import { cn } from "../includes/core/classes";
import { BlankPanel } from "../components/panels/BlankPanel";
import { SettingsPanel } from "../components/panels/SettingsPanel";
import { EditorPanel } from "../components/panels/EditorPanel";
import { EditorModelData, useEditorModels } from "../hooks/useEditorModels";
import { usePopupManager } from "../components/core/popups/ClassPopupManager";
import {
  PopupCreateNew,
  type PopupCreateNewCloseData,
} from "../components/popups/PopupCreateNew";
import {
  PopupConfirm,
  type PopupConfirmCloseData,
} from "../components/popups/PopupConfirm";
import { ScriptIcon } from "../components/ScriptIcon";
import { usePreventDefaultSave } from "../hooks/core/usePreventDefaultSave";
import { PopupUserScriptsWarning } from "../components/popups/PopupUserScriptsWarning";
import type { Popup } from "../components/core/popups/ClassPopup";
import { userScriptService } from "../includes/services/userScriptService";
import type { StoredScript } from "../includes/types";
import { messageService } from "../includes/services/messageService";
import { useCarried } from "../hooks/core/useCarried";
import { useWindowFocus } from "../hooks/core/useWindowFocus";
import type { ImportData } from "../components/popups/PopupImport";

const settingsIdentifier = Symbol("SETTINGS");

export const OptionsPage = () => {
  usePreventDefaultSave();

  const { data: optionsData } = useOptionsData();
  const [active, setActive] = useState<StoredScript | symbol | null>(null);
  const models = useEditorModels(
    typeof active === "symbol" ? null : active,
    () => optionsData?.saveAllScripts()
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

    const newData = await popupManager.open<PopupCreateNewCloseData>(
      <PopupCreateNew />
    ).waitClose;
    if (!newData) return;

    const script = webScripts.prepareNewScript({
      ...newData,
      version: optionsData.settings.defaultVersion || undefined,
      author: optionsData.settings.defaultAuthor || undefined,
      description: optionsData.settings.defaultDescription || undefined,
    });
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
        yesLabel={
          <>
            <Trash2Icon size={20} /> Delete
          </>
        }
        yesVariant="destructive"
      />
    ).waitClose;
    if (result.decision !== true) return;

    if (active === script) setActive(null);
    await optionsData.deleteScript(script);
    await userScriptService.removeUserScript(script);
  };
  const onImportScripts = async ({ settings, scripts }: ImportData) => {
    if (!optionsData) return;

    Object.assign(optionsData.settings, settings);
    await optionsData.addScripts(scripts);
  };

  // make sure listener gets latest version of optionsData
  const carried = useCarried({ optionsData });

  // listen for domain toggles from popup, and update affected scripts
  useEffect(() => {
    const unsubscribe = messageService.listen(
      "scriptsUpdated",
      async (message) => {
        const { optionsData } = carried;
        if (!optionsData) return;

        const resyncScripts: StoredScript[] = [];

        for (const id of message.ids) {
          // get the editor model, and recompress the script to get the latest code
          const model = models[id] as EditorModelData | undefined;
          model?.recompressScript();

          // reload script from stored scripts, updating the header
          const script = await optionsData.reloadScript(id, true);
          if (!script) return;

          // update code in editor
          model?.reloadCompressedCode();

          resyncScripts.push(script);
        }
        // re-save any missing editor updates over background-saved scripts
        await optionsData.saveAllScripts();
        if (resyncScripts.length === 1) {
          await userScriptService.resynchronizeUserScript(resyncScripts[0]);
        } else if (resyncScripts.length > 0) {
          await userScriptService.resynchronizeUserScripts();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // trigger jump to referred script
  useEffect(() => {
    if (optionsData?.refer) {
      const id = optionsData.refer;
      const script = optionsData.scripts.find((script) => script.id === id);
      optionsData.refer = null;

      if (script) setActive(script);
    }
  }, [optionsData?.refer]);

  // jump to referred script, even while options page is open
  useWindowFocus(() => {
    optionsData?.reloadRefer();
  });

  // show error if userScripts is disabled
  useEffect(() => {
    let cancel = false;
    let popup: Popup | null = null;

    (async () => {
      const userScripts = await userScriptService.getUserScripts();
      if (cancel) return;

      if (userScripts) {
        // Make sure scripts are up-to-data:
        // Run resync task in background when options page is opened.
        messageService.send("resyncAll", {});
      } else {
        popup = popupManager.open(
          <PopupUserScriptsWarning
            errorType={userScriptService.getUserScriptsError()}
          />
        );
      }
    })();

    return () => {
      cancel = true;
      popup?.close();
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
                onSave={async () => await optionsData.saveSettings()}
                onImportScripts={onImportScripts}
                getScripts={() => optionsData.scripts}
              />
            ) : null
          ) : active && typeof active === "object" ? (
            models[active.id] ? (
              <EditorPanel
                key={active.id}
                model={models[active.id]}
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
