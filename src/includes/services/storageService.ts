import { minifyJson, prettifyJson } from "../core/prettifyJson";
import { wrapAsyncLast, wrapAsyncMerge } from "../core/wrapAsync";
import type { StoredScript, StoredSettings } from "../types";
import { Chrome } from "../utils";

export class StorageService {
  waitForPreload: Promise<void>;

  defaultSettings: StoredSettings = {
    defaultLanguage: "javascript",
    defaultPrettify: false,
    editorSettingsJson: "{}",
    editorKeybindingsJson: "[]",
    typescriptConfigJson: "{}",
    prettierConfigJson: "{}",
  };
  latestScripts: StoredScript[] = [];
  latestSettings: StoredSettings = { ...this.defaultSettings };

  constructor() {
    // preload scripts and settings
    this.waitForPreload = Promise.all([
      this.loadScripts(),
      this.loadSettings(),
    ]).then(() => {});
  }

  /** Save all user scripts. Async-wrapped to prevent simultaneous calls. */
  saveScripts = wrapAsyncLast(
    async (scripts: StoredScript[]): Promise<void> => {
      this.latestScripts = scripts;
      await Chrome.storage?.local.set({ scripts });
    }
  );

  /** Load all user scripts. Async-wrapped to prevent simultaneous calls. */
  loadScripts = wrapAsyncMerge(async (): Promise<StoredScript[]> => {
    const scripts = (await Chrome.storage?.local.get("scripts"))?.scripts ?? [];
    this.latestScripts = scripts;
    return scripts;
  });

  /** Save all user settings. Async-wrapped to prevent simultaneous calls. */
  saveSettings = wrapAsyncLast(
    async (settings: StoredSettings): Promise<void> => {
      this.latestSettings = settings;
      const compressedSettings: StoredSettings = {
        ...settings,
        editorSettingsJson: minifyJson(settings.editorSettingsJson),
        editorKeybindingsJson: minifyJson(settings.editorKeybindingsJson),
        typescriptConfigJson: minifyJson(settings.typescriptConfigJson),
        prettierConfigJson: minifyJson(settings.prettierConfigJson),
      };
      await Chrome.storage?.local.set({ settings: compressedSettings });
    }
  );

  /** Load all user settings. Async-wrapped to prevent simultaneous calls. */
  loadSettings = wrapAsyncMerge(async (): Promise<StoredSettings> => {
    let settings: StoredSettings = (await Chrome.storage?.local.get("settings"))
      ?.settings;
    settings = {
      ...this.defaultSettings,
      ...settings,
    };
    settings = {
      ...settings,
      editorSettingsJson: prettifyJson(settings.editorSettingsJson),
      editorKeybindingsJson: prettifyJson(settings.editorKeybindingsJson),
      typescriptConfigJson: prettifyJson(settings.typescriptConfigJson),
      prettierConfigJson: prettifyJson(settings.prettierConfigJson),
    };
    this.latestSettings = settings;
    return settings;
  });

  /** Get referred script. */
  getReferred = wrapAsyncMerge(
    async (preserve: boolean = false): Promise<string | null> => {
      const refer = (await Chrome.storage?.local.get("refer"))?.refer;
      if (!preserve) await Chrome.storage?.local.set({ refer: null });
      return refer ?? null;
    }
  );
}

export const storageService = new StorageService();
