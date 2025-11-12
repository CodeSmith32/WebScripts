export interface StoredScript {
  /** Random alphanumeric id. */
  id: string;
  /** Script name. */
  name: string;
  /** The language of the script. `"javascript"` or `"typescript"`. */
  language: ScriptLanguage;
  /** If the code will be prettified on save. */
  prettify: boolean;
  /** If the script's popup toggle should be disabled, to help prevent accidental changes.. */
  locked: boolean;
  /** A point during the page load when the script will be executed. */
  when: WhenTime;
  /** The world that the script should be executed within. */
  world: ExecutionWorld;
  /** If the content security policy header should be removed for pages this script runs on. */
  csp: CSPAction;
  /** Pattern strings for matching urls.
   *
   * `/pattern/i` indicates regex-type match.
   * `*.domain.com` indicates domain-type match. */
  match: string[];
  /** The source code, compressed with CodePack. */
  code: string;
}

export interface StoredSettings {
  /** The default language for newly created scripts. */
  defaultLanguage: ScriptLanguage;
  /** If prettifying code should be checked by default for newly created scripts. */
  defaultPrettify: boolean;
  /** If script locking should be checked by default for new scripts. */
  defaultLocked: boolean;
  /** The default time to execute scripts. */
  defaultWhen: WhenTime;
  /** The default world to execute scripts in. */
  defaultWorld: ExecutionWorld;
  /** The editor settings json string.
   *
   * This JSON is stored minified, but is prettified when displayed. */
  editorSettingsJson: string;
  /** Keybindings json, designed to match the keybindings pattern in VSCode.
   *
   * This JSON is stored minified, but is prettified when displayed. */
  editorKeybindingsJson: string;
  /** Typescript `compilerOptions` configuration JSON.
   *
   * This JSON is stored minified, but is prettified when displayed. */
  typescriptConfigJson: string;
  /** Prettier configuration JSON.
   *
   * This JSON is stored minified, but is prettified when displayed. */
  prettierConfigJson: string;
}

export type ScriptLanguage = "typescript" | "javascript";

export type WhenTime = "start" | "end" | "idle";

export type ExecutionWorld = "main" | "isolated";

export type CSPAction = "disable" | "leave";

export const scriptLanguages: Record<ScriptLanguage, true> = {
  javascript: true,
  typescript: true,
};
Object.setPrototypeOf(scriptLanguages, null);

export const whenTimes: Record<WhenTime, true> = {
  start: true,
  end: true,
  idle: true,
};
Object.setPrototypeOf(whenTimes, null);

export const executionWorlds: Record<ExecutionWorld, true> = {
  main: true,
  isolated: true,
};
Object.setPrototypeOf(executionWorlds, null);
