import { CSPHeader, CSPValue } from "./csp";
import {
  Chrome,
  chromiumVersion,
  hostFromURL,
  type SendMessageOptions,
  type UserScript,
} from "./utils";
import { wrapAsyncLast, wrapAsyncMerge } from "./core/wrapAsync";
import { minifyJson, prettifyJson } from "./core/prettifyJson";
import { CodePack } from "./core/codepack";
import type { OnlyRequire } from "./core/types/utility";
import { isDomainSupersetOf } from "./core/isDomainSupersetOf";

export type ScriptLanguage = "typescript" | "javascript";

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
  language?: ScriptLanguage;
  /** If the code will be prettified on save. */
  prettify?: boolean;
  /** The source code, compressed with CodePack. */
  code: string;
  /** The compiled code, compressed with CodePack. */
  compiled?: string | null;

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

export const defaultSettings: StoredSettings = {
  defaultLanguage: "javascript",
  defaultPrettify: false,
  editorSettingsJson: "{}",
  editorKeybindingsJson: "[]",
  typescriptConfigJson: "{}",
  prettierConfigJson: "{}",
};

export type HeaderData = Pick<
  StoredScript,
  "name" | "patterns" | "language" | "prettify"
>;

export type MessageTypes =
  | { cmd: "listRunning" }
  | { cmd: "updateBackgroundScripts" }
  | { cmd: "reloaded" };

export type UserScriptsErrorType =
  | "allowUserScripts"
  | "enableDeveloperMode"
  | "";

const rgxPatternRegex = /^(-?)\s*\/(.*)\/(\w*)$/;
const rgxPatternDomain = /^(-?)\s*([\w\.\*-]+)$/;

export interface PatternParts {
  /** The type of pattern, if it's a regex (`/pattern/`), or a domain with wildcards
   * (`*.domain.com`). */
  type: "regex" | "domain";
  /** The original pattern, without the negation `-` flag. */
  original: string;
  /** A regex pattern string to use for this match pattern. */
  pattern: string;
  /** A regex flags string to use for this match pattern. */
  flags: string;
  /** What the pattern should be tested on: The full url, or just the hostname. */
  target: "url" | "host";
  /** If the match is negated. If `true`, when this pattern matches, the script should *not*
   * load. */
  negated: boolean;
}

export interface IncludesExcludes {
  include: string[];
  exclude: string[];
}

class WebScripts {
  /** Send a message to the extension runtime. */
  async sendMessage<T>(
    message: MessageTypes,
    options: SendMessageOptions = {}
  ): Promise<T | undefined> {
    return await (
      Chrome.runtime?.sendMessage as
        | ((message: unknown, options?: SendMessageOptions) => Promise<T>)
        | undefined
    )?.(message, options);
  }

  /** Save all user scripts. Async-wrapped to prevent simultaneous calls. */
  saveScripts = wrapAsyncLast(
    async (scripts: StoredScript[]): Promise<void> => {
      await Chrome.storage?.local.set({ scripts });
    }
  );

  /** Load all user scripts. Async-wrapped to prevent simultaneous calls. */
  loadScripts = wrapAsyncMerge(async (): Promise<StoredScript[]> => {
    return (await Chrome.storage?.local.get("scripts"))?.scripts ?? [];
  });

  /** Save all user settings. Async-wrapped to prevent simultaneous calls. */
  saveSettings = wrapAsyncLast(
    async (settings: StoredSettings): Promise<void> => {
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
      ...defaultSettings,
      ...settings,
    };
    settings = {
      ...settings,
      editorSettingsJson: prettifyJson(settings.editorSettingsJson),
      editorKeybindingsJson: prettifyJson(settings.editorKeybindingsJson),
      typescriptConfigJson: prettifyJson(settings.typescriptConfigJson),
      prettierConfigJson: prettifyJson(settings.prettierConfigJson),
    };
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

  /** Parse pattern and return regex parts. */
  parsePattern(original: string): PatternParts | null {
    let m: RegExpMatchArray | null; // pattern match

    if ((m = original.match(rgxPatternRegex))) {
      // pattern is a regex: m[] 1: negated, 2: pattern, 3: flags
      const [, negated, pattern, flags] = m;

      return {
        type: "regex",
        original: original.replace(/^-/, ""),
        pattern,
        flags: flags.replace(/[^ugimsy]/g, ""),
        negated: !!negated,
        target: "url",
      };
    }
    if ((m = original.match(rgxPatternDomain))) {
      // pattern is a domain: m[] 1: negated, 2: domain
      const [, negated, domain] = m;

      const pattern = domain.replace(/^\*\.|\.\*$|\.(\*\.)*/g, (m) => {
        if (m === "*.") return "(.+\\.)?";
        if (m === ".*") return "(\\..+)?";
        if (m === ".") return "\\.";
        return "\\.(.+\\.)?";
      });

      return {
        type: "domain",
        original: original.replace(/^-/, ""),
        pattern: `^${pattern}$`,
        flags: "i",
        negated: !!negated,
        target: "host",
      };
    }
    return null;
  }

  /** Check if url matches the pattern-list for a user script. */
  match(url: string, patterns: string[]): boolean {
    let found = false;
    const host = hostFromURL(url);

    // iterate patterns
    for (const matchPattern of patterns) {
      // parse pattern
      const parts = this.parsePattern(matchPattern);
      if (!parts) continue;

      // build regex
      const { pattern, flags, negated, target } = parts;
      const regex = new RegExp(pattern, flags);
      const urlHost = target === "host" ? host : url;
      if (!urlHost) continue;

      // apply test
      if (regex.test(urlHost)) found = !negated;
    }

    return found;
  }

  /** Convert the match patterns to a standard host match pattern set.
   *
   * This process is not an exact conversion, since host matching doesn't support regexs. But
   * the generated patterns will at least be loose enough to cover any host that matches the
   * original patterns. */
  matchesToUrlPatterns(patterns: string[]): IncludesExcludes {
    let include: string[] = [];
    let exclude: string[] = [];

    for (const matchPattern of patterns) {
      // parse the pattern
      const parts = this.parsePattern(matchPattern);
      if (!parts) continue;

      const { type, negated, original } = parts;

      if (type === "regex") {
        // if it's a regex, we cannot know what it will match: match everything
        if (!negated) {
          include = ["<all_urls>", "file:///*"];
          exclude = [];
        }
      } else if (type === "domain") {
        // if it's a domain...
        if (/^\*?[^*]*$/.test(original)) {
          // if it only has a wildcard at the start, add it to exclusions or inclusions
          // dependent on the negation flag
          if (negated) {
            exclude.push(`*://${original}/*`);
          } else {
            const newInclude = original.toLowerCase();

            // remove exclusions that are culled or would otherwise cull the newest inclusion
            exclude = exclude.filter((exclude) => {
              exclude = exclude.slice(4, -2).toLowerCase(); // cut off *:// and /*

              // remove in any of the three cases:

              // exclusion equals inclusion
              // (because exclusion has no effect)
              // match  -www.google.com
              // match  www.google.com
              if (exclude === newInclude) {
                return false;
              }

              // exclusion is a subset of inclusion
              // (because exclusion has no effect)
              // match  -www.google.com
              // match  *.google.com
              if (isDomainSupersetOf(newInclude, exclude)) {
                return false;
              }

              // inclusion is a subset of exclusion
              // (because exclusions are applied after inclusions in userScripts)
              // match  -*.google.com
              // match  www.google.com
              if (isDomainSupersetOf(exclude, newInclude)) {
                return false;
              }

              return true;
            });

            // add the new inclusion
            include.push(`*://${original}/*`);
          }
        } else {
          // if it has wildcards not at the start, we cannot know what it will match, other than
          // that it's a non-file url
          if (!negated) {
            include = ["<all_urls>"];
            exclude = [];
          }
        }
      }
    }

    return { include, exclude };
  }

  /** Convert the match patterns to a piece of code that will test the url and return if
   * matching fails. */
  matchesToCode(patterns: string[]): string {
    // initialize condition: final decision is to fail match
    const conditions: string[] = ["true"];

    for (const matchPattern of patterns) {
      // parse pattern
      const parts = this.parsePattern(matchPattern);
      if (!parts) continue;

      // generate regex and test condition
      const pattern = JSON.stringify(parts.pattern);
      const flags = JSON.stringify(parts.flags);
      const target =
        parts.target === "host" ? "location.hostname" : "location.href";
      const negated = JSON.stringify(parts.negated);

      // push in reverse order (last expression takes highest precedence)
      conditions.unshift(
        `new RegExp(${pattern}, ${flags}).test(${target}) ? ${negated}\n : `
      );
    }

    // join and return condition code
    return `if(${conditions.join("")}) return;\n`;
  }

  /** Parse the header comment of a script. */
  parseHeader(code: string): HeaderData {
    const header = this.extractHeader(code).replace(/^s*/, "");

    let name: string = "";
    let patterns: string[] = [];
    let language: ScriptLanguage | undefined = undefined;
    let prettify: boolean | undefined = undefined;

    const allowedLanguages = ["typescript", "javascript"];

    const parseBool = (value: string) => {
      return ["true", "yes", "on"].includes(value.toLowerCase());
    };

    if (header) {
      const params = new Map<string, string[]>();
      const lines = header.split(/\r?\n/);

      for (let line of lines) {
        let [, key, value] = line.match(/^\/+([\w\s]+):\s*(.*)$/) ?? [];
        if (key == null || value == null) continue;

        key = key.trim().toLowerCase();

        let arr = params.get(key);
        if (!arr) params.set(key, (arr = []));
        arr.push(value);
      }

      if (params.has("name")) name = params.get("name")![0];
      if (params.has("match")) patterns = params.get("match")!;
      if (params.has("prettify"))
        prettify = parseBool(params.get("prettify")![0]);
      if (params.has("language")) {
        const lang = params.get("language")![0].toLowerCase();
        language = allowedLanguages.includes(lang)
          ? (lang as ScriptLanguage)
          : "javascript";
      }
    }
    return { name, patterns, language, prettify };
  }

  /** Take a list of [ string, string ] pairs, and generate new header string.
   * Use pair[0] as property key, and pair[1] as property value. */
  private buildHeaderLines(lines: [string, string][]) {
    // get longest line key (for padding alignment)
    const nameLen = lines.reduce((max, [key]) => Math.max(max, key.length), 0);

    // generate new header
    return lines
      .map(
        ([key, value]) =>
          `/// ${key}:${" ".repeat(nameLen - key.length)} ${value}`
      )
      .join("\n");
  }

  /** Extract header comment from start of code. */
  extractHeader(code: string): string {
    const headerMatch = code.match(
      /^\s*(\/\/\/[^\r\n]*(?:\r?\n\/\/\/[^\r\n]*)*)/
    );
    if (headerMatch) return headerMatch[0];
    return "";
  }

  /** Update the given header data in the header comment, and return a new header comment. */
  updateHeader(
    header: string,
    { name, patterns, language, prettify }: HeaderData
  ): string {
    // trim off leading white-space
    header = header.replace(/^\s*/, "");

    // parse old lines
    let lines: [string, string][] = (header ? header.split(/\r?\n/) : []).map(
      (line) => {
        let [, key, value] = line.match(/^\/+([\w\s]+):\s*(.*)$/) ?? [];
        return [key.trim().toLowerCase(), value];
      }
    );

    // line mutation utilities
    const removeKeys = (...keys: string[]) => {
      lines = lines.filter((line) => !keys.includes(line[0]));
    };
    const makeKey = (
      key: string,
      value: string | number | boolean | undefined
    ): [string, string] | null => {
      if (value == null) return null;
      return [key, "" + value];
    };

    // regenerate header lines
    removeKeys("name", "language", "prettify", "match");
    lines = [
      makeKey("name", name),
      makeKey("language", language),
      makeKey("prettify", prettify),
      ...lines,
      ...patterns.map((pattern) => makeKey("match", pattern)),
    ].filter((v) => !!v);

    // build header
    return this.buildHeaderLines(lines);
  }

  /** Safely update the header in the code to use the newly provided field values. */
  updateHeaderInCode(code: string, headerData: HeaderData) {
    const header = this.extractHeader(code);
    const newHeader = this.updateHeader(header, headerData);

    // replace old header with new header
    code = code.slice(header.length ?? 0); // cut off old header
    code = newHeader + "\n\n" + code.replace(/^\s+/, ""); // add new header and separating line

    return code;
  }

  /** Generate a header from header details. */
  generateHeader({ name, patterns, language, prettify }: HeaderData) {
    // generate header lines
    const lines: [string, string][] = [
      ["name", name],
      ["language", language ?? "javascript"],
      ["prettify", prettify ? "true" : "false"],
      ...patterns.map((pattern) => ["match", pattern] as [string, string]),
    ];

    return this.buildHeaderLines(lines);
  }

  /** Process content-security-policy header: allow executing user scripts. */
  processCSPHeader(header: string): string {
    // parse csp header string
    const csp = CSPHeader.fromString(header);

    // iterate and tweak policies
    for (const policy of csp.policies) {
      // remove reporting
      policy.deleteDirective("report-to");
      policy.deleteDirective("report-uri");

      // find script policy
      const scriptDirective = (
        policy.getDirective("script-src-elem") ??
        policy.getDirective("script-src") ??
        policy.getDirective("object-src")
      )?.clone();

      // if some policy is in place for scripts...
      if (scriptDirective) {
        // clear nonce / hash allowances (not allowed when 'unsafe-inline' is set)
        scriptDirective.values = scriptDirective.values.filter(
          (value) => value.type !== "nonce" && value.type !== "hash"
        );
        // allow 'unsafe-inline'
        scriptDirective.values.push(new CSPValue("'unsafe-inline'"));

        // assign as the 'script-src-elem' directive
        scriptDirective.type = "script-src-elem";
        policy.setDirective(scriptDirective);
      }
    }

    // re-serialize to csp header string
    return csp.toString();
  }

  /** Open scripts management page. Async-wrapped to prevent simultaneous calls. */
  openEditor = wrapAsyncMerge(async (refer: string) => {
    await Chrome.storage?.local.set({ refer });
    await Chrome.runtime?.openOptionsPage();
  });

  private userScripts: (typeof chrome)["userScripts"] | null = null;
  private userScriptsError: UserScriptsErrorType | "" = "";

  /** Initiate userScripts access. */
  async initiateUserScripts() {
    try {
      this.userScriptsError = "";
      await Chrome.userScripts!.getScripts();
      this.userScripts = Chrome.userScripts as (typeof chrome)["userScripts"];
    } catch (_err) {
      this.userScriptsError =
        chromiumVersion >= 138 ? "allowUserScripts" : "enableDeveloperMode";
    }
  }

  /** Get the userScripts utility, or capture an error indicating which toggle must be
   * enabled. */
  async getUserScripts() {
    await this.initiateUserScripts();
    return this.userScripts;
  }

  /** Get the message indicating which toggle must be enabled for userScripts to work. */
  getUserScriptsError() {
    return this.userScriptsError;
  }

  /** Convert a stored script to a user script. */
  storedScriptToUserScript(script: StoredScript): UserScript {
    const debug = `console.log(${JSON.stringify({
      name: script.name,
      id: script.id,
      patterns: script.patterns,
    })})`;

    const codePrefix = this.matchesToCode(script.patterns);
    const source = CodePack.unpack(script.compiled ?? script.code);
    const code = `(async()=>{\n${debug}\n${codePrefix}\n${source}\n})();`;
    const matches = this.matchesToUrlPatterns(script.patterns);

    const userScript: UserScript = {
      id: script.id,
      js: [{ code }],
      allFrames: false,
      runAt: "document_start",
      world: "MAIN",
      matches: matches.include,
      excludeMatches: matches.exclude,
    };

    if (!userScript.matches!.length) {
      userScript.matches = ["*://bad.invalid/*"];
    }
    if (!userScript.excludeMatches!.length) {
      delete userScript.excludeMatches;
    }

    console.log(userScript);
    return userScript;
  }

  /** Update all user scripts to match the list of stored scripts. Adds missing, removes
   * deleted, and updates other user scripts to synchronize user scripts with stored scripts. */
  resynchronizeUserScripts = wrapAsyncLast(async () => {
    const userScripts = await this.getUserScripts();
    if (!userScripts) return;

    const storedScripts = await this.loadScripts();
    const registeredScripts = await userScripts.getScripts();

    const storedMap = storedScripts.reduce(
      (map, obj) => (map.set(obj.id, obj), map),
      new Map<string, StoredScript>()
    );
    const registeredMap = registeredScripts.reduce(
      (map, obj) => (map.set(obj.id, obj), map),
      new Map<string, UserScript>()
    );

    const removeList: string[] = [];
    const updateList: UserScript[] = [];
    const addList: UserScript[] = [];

    // find difference between registered scripts and stored scripts

    // search for removed scripts
    for (const script of registeredScripts) {
      if (!storedMap.has(script.id)) {
        removeList.push(script.id);
      }
    }
    // add or update existing scripts
    for (const script of storedScripts) {
      const userScript = this.storedScriptToUserScript(script);

      if (registeredMap.has(script.id)) {
        updateList.push(userScript);
      } else {
        addList.push(userScript);
      }
    }

    // apply updates

    // remove old scripts
    await userScripts.unregister({ ids: removeList });
    // update existing scripts
    await userScripts.update(updateList);
    // add new scripts
    await userScripts.register(addList);
  });

  /** Resynchronize a single user script associated with the given stored script. If the script
   * doesn't exist, it will be added. If it does, it will be updated. */
  async resynchronizeUserScript(script: StoredScript) {
    const userScripts = await this.getUserScripts();
    if (!userScripts) return;

    const exists =
      (await userScripts.getScripts({ ids: [script.id] })).length > 0;

    const userScript = this.storedScriptToUserScript(script);

    if (exists) {
      await userScripts.update([userScript]);
    } else {
      await userScripts.register([userScript]);
    }
  }

  /** Remove the user script registered for the given stored script. */
  async removeUserScript(script: OnlyRequire<StoredScript, "id">) {
    const userScripts = await this.getUserScripts();
    if (!userScripts) return;

    await userScripts.unregister({ ids: [script.id] });
  }
}
export const webScripts = new WebScripts();
