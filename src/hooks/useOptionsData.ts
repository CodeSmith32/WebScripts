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

export class OptionsData {
  scripts: StoredScript[] = [];
  settings: StoredSettings = { ...storageService.defaultSettings };
  refer: string | null = null;
  refresh: () => void;

  constructor({ refresh = () => {} }: { refresh?: () => void }) {
    this.refresh = refresh;
  }

  /** Wait for settings and config to load. */
  async initialize() {
    try {
      this.scripts = await storageService.loadScripts();
    } catch (_err) {}

    try {
      this.settings = await storageService.loadSettings();
    } catch (_err) {}

    try {
      this.refer = await storageService.getReferred();
    } catch (_err) {}

    this.updateManagerConfigs();
  }

  /** Update managers from settings. */
  private updateManagerConfigs() {
    editorSettingsManager.setEditorSettings(this.settings.editorSettingsJson);
    keybindingManager.setKeybindings(this.settings.editorKeybindingsJson);
    typescriptConfigManager.setTypeScriptConfig(
      this.settings.typescriptConfigJson
    );
    prettierConfigManager.setPrettierConfig(this.settings.prettierConfigJson);
  }

  /** Save all scripts (expects that script objects changed directly). */
  async saveAllScripts() {
    this.scripts.sort((a, b) => lexSort(a.name, b.name) || lexSort(a.id, b.id));

    await storageService.saveScripts(this.scripts);
  }

  /** Update and save a script to the extension storage. */
  async saveScript(script: StoredScript) {
    let found = false;

    for (let i = 0; i < this.scripts.length; i++) {
      if (script.id === this.scripts[i].id) {
        found = true;
        this.scripts[i] = script;
      }
    }

    if (!found) this.scripts.push(script);

    await this.saveAllScripts();

    this.refresh();
  }

  /** Add a batch of scripts. */
  async addScripts(newScripts: StoredScript[]) {
    const newScriptMap = newScripts.reduce(
      (map, script) => map.set(script.id, script),
      new Map()
    );

    for (let i = 0; i < this.scripts.length; i++) {
      const id = this.scripts[i].id;
      const newScript = newScriptMap.get(id);

      if (newScript) {
        this.scripts[i] = newScript;
        newScriptMap.delete(id);
      }
    }

    for (const script of newScriptMap.values()) {
      this.scripts.push(script);
    }

    await this.saveAllScripts();

    this.refresh();
  }

  /** Remove a script and save to the extension storage. */
  async deleteScript(script: StoredScript) {
    let found = false;

    for (let i = 0; i < this.scripts.length; i++) {
      if (script.id === this.scripts[i].id) {
        found = true;
        this.scripts.splice(i, 1);
      }
    }

    if (!found) return;

    await storageService.saveScripts(this.scripts);

    this.refresh();
  }

  /** Save settings. */
  async saveSettings() {
    await storageService.saveSettings(this.settings);
  }

  /** Reload a specific script by id. */
  async reloadScript(id: string, justHeader: boolean) {
    const updatedScripts = await storageService.loadScripts();
    const oldScript = this.scripts.find((script) => script.id === id);
    const newScript = updatedScripts.find((script) => script.id === id);
    if (!oldScript || !newScript) return null;

    const oldCode = oldScript.code;
    Object.assign(oldScript, newScript);

    if (justHeader) {
      let code = CodePack.unpack(oldCode);
      code = webScripts.updateHeaderInCode(code, oldScript);
      oldScript.code = CodePack.pack(code);
    }

    return oldScript;
  }
}

export const useOptionsData = () => {
  const [, refresh] = useState({});

  return useAsyncLoader(async () => {
    const optionsData = new OptionsData({
      refresh: () => refresh({}),
    });

    await optionsData.initialize();

    return optionsData;
  });
};
