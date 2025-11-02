import { useState } from "preact/hooks";
import { webScripts } from "../includes/services/webScriptService";
import { useAsyncLoader } from "./core/useAsyncLoader";
import { lexSort } from "../includes/utils";
import { CodePack } from "../includes/core/codepack";
import { editorSettingsManager } from "../includes/managers/editorSettingsManager";
import { keybindingManager } from "../includes/managers/keybindingManager";
import { typescriptConfigManager } from "../includes/managers/typescriptConfigManager";
import { prettierConfigManager } from "../includes/managers/prettierConfigManager";
import { storageService } from "../includes/services/storageService";
import type { StoredScript, StoredSettings } from "../includes/types";

export const useOptionsData = () => {
  const [, refresh] = useState({});

  return useAsyncLoader(async () => {
    let scripts: StoredScript[] = [];
    let settings: StoredSettings = { ...storageService.defaultSettings };
    let refer: string | null = null;

    try {
      scripts = await storageService.loadScripts();
    } catch (_err) {}

    try {
      settings = await storageService.loadSettings();
    } catch (_err) {}

    try {
      refer = await storageService.getReferred();
    } catch (_err) {}

    // update managers from settings
    editorSettingsManager.setEditorSettings(settings.editorSettingsJson);
    keybindingManager.setKeybindings(settings.editorKeybindingsJson);
    typescriptConfigManager.setTypeScriptConfig(settings.typescriptConfigJson);
    prettierConfigManager.setPrettierConfig(settings.prettierConfigJson);

    // Temporary test scripts
    if (!scripts.length) {
      scripts.push(
        webScripts.normalizeScript({
          id: "example",
          name: "Example Script",
          language: "typescript",
          patterns: ["/.*/"],
          code: CodePack.pack(
            'const x: string = "hello world";\nconsole.log(x);'
          ),
        }),
        webScripts.normalizeScript({
          id: "example2",
          name: "Test",
          language: "javascript",
          patterns: [],
          code: CodePack.pack('console.log("Test!");'),
        })
      );
    }

    /** Save all scripts (expects that script objects changed directly). */
    const saveAllScripts = async () => {
      scripts.sort((a, b) => lexSort(a.name, b.name) || lexSort(a.id, b.id));

      await storageService.saveScripts(scripts);
    };

    /** Update and save a script to the extension storage. */
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

    /** Add a batch of scripts. */
    const addScripts = async (newScripts: StoredScript[]) => {
      const newScriptMap = newScripts.reduce(
        (map, script) => map.set(script.id, script),
        new Map()
      );

      for (let i = 0; i < scripts.length; i++) {
        const id = scripts[i].id;
        const newScript = newScriptMap.get(id);

        if (newScript) {
          scripts[i] = newScript;
          newScriptMap.delete(id);
        }
      }

      for (const script of newScriptMap.values()) {
        scripts.push(script);
      }

      await saveAllScripts();

      refresh({});
    };

    /** Remove a script and save to the extension storage. */
    const deleteScript = async (script: StoredScript) => {
      let found = false;

      for (let i = 0; i < scripts.length; i++) {
        if (script.id === scripts[i].id) {
          found = true;
          scripts.splice(i, 1);
        }
      }

      if (!found) return;

      await storageService.saveScripts(scripts);

      refresh({});
    };

    /** Save settings. */
    const saveSettings = async () => {
      await storageService.saveSettings(settings);
    };

    return {
      scripts,
      settings,
      refer,
      saveAllScripts,
      saveScript,
      addScripts,
      deleteScript,
      saveSettings,
    };
  });
};
