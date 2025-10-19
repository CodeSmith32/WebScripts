import { useState } from "preact/hooks";
import {
  webScripts,
  type StoredSettings,
  type StoredScript,
  defaultSettings,
} from "../includes/webscripts";
import { useAsyncLoader } from "./core/useAsyncLoader";
import { lexSort } from "../includes/utils";
import { CodePack } from "../includes/codepack";
import { editorSettingsManager } from "../includes/managers/editorSettingsManager";
import { keybindingManager } from "../includes/managers/keybindingManager";
import { typescriptConfigManager } from "../includes/managers/typescriptConfigManager";
import { prettierConfigManager } from "../includes/managers/prettierConfigManager";

export const useOptionsData = () => {
  const [, refresh] = useState({});

  return useAsyncLoader(async () => {
    let scripts: StoredScript[] = [];
    let settings: StoredSettings = { ...defaultSettings };
    let refer: string | null = null;

    try {
      scripts = await webScripts.loadScripts();
    } catch (_err) {}

    try {
      settings = await webScripts.loadSettings();
    } catch (_err) {}

    try {
      refer = await webScripts.getReferred();
    } catch (_err) {}

    // update managers from settings
    editorSettingsManager.setEditorSettings(settings.editorSettingsJson);
    keybindingManager.setKeybindings(settings.editorKeybindingsJson);
    typescriptConfigManager.setTypeScriptConfig(settings.typescriptConfigJson);
    prettierConfigManager.setPrettierConfig(settings.prettierConfigJson);

    // temporary test scripts
    if (!scripts.length) {
      scripts.push(
        {
          id: "example",
          name: "Example Script",
          language: "typescript",
          patterns: ["/.*/"],
          code: CodePack.pack(
            'const x: string = "hello world";\nconsole.log(x);'
          ),
          compiled: "",
        },
        {
          id: "example2",
          name: "Test",
          language: "javascript",
          patterns: [],
          code: CodePack.pack('console.log("Test!");'),
          compiled: "",
        }
      );
    }

    // save all scripts (expects that script objects changed directly)
    const saveAllScripts = async () => {
      scripts.sort((a, b) => lexSort(a.name, b.name) || lexSort(a.id, b.id));

      await webScripts.saveScripts(scripts);
    };

    // update and save a script to the extension storage
    const saveScript = async (script: StoredScript) => {
      let found = false;

      for (let i = 0; i < scripts.length; i++) {
        if (script.id === scripts[i].id) {
          found = true;
          scripts[i] = script;
        }
      }

      if (!found) scripts.push(script);

      await saveAllScripts();

      refresh({});
    };

    // remove a script and save to the extension storage
    const deleteScript = async (script: StoredScript) => {
      let found = false;

      for (let i = 0; i < scripts.length; i++) {
        if (script.id === scripts[i].id) {
          found = true;
          scripts.splice(i, 1);
        }
      }

      if (!found) return;

      await webScripts.saveScripts(scripts);

      refresh({});
    };

    // save settings
    const saveSettings = async () => {
      await webScripts.saveSettings(settings);
    };

    return {
      scripts,
      settings,
      refer,
      saveAllScripts,
      saveScript,
      deleteScript,
      saveSettings,
    };
  });
};
