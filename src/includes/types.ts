export interface StoredScript {
  /** Random alphanumeric id. */
  id: string;
  /** Script name. */
  name: string;
  /** Pattern strings.
   *
   * `/pattern/i` indicates regex-type match.
   * `*.domain.com` indicates domain-type match. */
  patterns: string[];
  /** The language of the script. `"javascript"` or `"typescript"`. */
  language: ScriptLanguage;
  /** If the code will be prettified on save. */
  prettify: boolean;
  /** If the content security policy header should be removed for pages this script runs on. */
  csp: CSPAction;
  /** The source code, compressed with CodePack. */
  code: string;

  // This is a trick to force EditableScript to never be assignable to StoredScript:
  saved?: never;
}

export interface StoredSettings {
  /** The default language for newly created scripts. */
  defaultLanguage: ScriptLanguage;
  /** If prettifying code should be checked by default for newly created scripts. */
  defaultPrettify: boolean;
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

/** Type of an HTTP header in an intercepted request. */
export type HttpHeader = Omit<
  browser.webRequest._HttpHeaders & chrome.webRequest.HttpHeader,
  "binaryValue"
>;

export type ScriptLanguage = "typescript" | "javascript";

export type CSPAction = "disable" | "leave";

export const scriptLanguages: Record<ScriptLanguage, true> = {
  javascript: true,
  typescript: true,
};
Object.setPrototypeOf(scriptLanguages, null);
