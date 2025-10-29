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

const rgxPatternRegex = /^(-?)\s*\/(.*)\/(\w*)$/;
const rgxPatternDomain = /^(-?)\s*([\w\.\*-]+)$/;

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

  /** Check if url matches the pattern-list for a user script. */
  match(url: string, patterns: string[]): boolean {
    let m: RegExpMatchArray | null; // pattern match
    let found = false;
    const host = hostFromURL(url);

    // iterate patterns
    for (const pattern of patterns) {
      if ((m = pattern.match(rgxPatternRegex))) {
        // pattern is a regex: m[] 1: negated, 2: pattern, 3: flags
        const [, negated, regexPattern, regexFlags] = m;

        const regex = new RegExp(
          regexPattern,
          regexFlags.replace(/[^ugimsy]/g, "")
        );

        if (regex.test(url)) found = negated ? false : true;
      } else if ((m = pattern.match(rgxPatternDomain))) {
        // pattern is a domain: m[] 1: negated, 2: domain
        const [, negated, domain] = m;

        if (!host) continue;

        const regexPattern = domain.replace(/\./g, "\\.").replace(/\*/g, ".*");
        const regex = new RegExp("^" + regexPattern + "$", "i");

        if (regex.test(host)) found = negated ? false : true;
      }
    }

    return found;
  }

  /** Convert the match patterns to a standard host match pattern set.
   *
   * This process is not an exact conversion, since host matching doesn't support regexs. But
   * the generated patterns will at least be loose enough to cover any host that matches the
   * original patterns. */
  matchesToUrlPatterns(patterns: string[]): {
    include: string[];
    exclude: string[];
  } {
    let m: RegExpMatchArray | null;

    let include: string[] = [];
    let exclude: string[] = [];

    for (const pattern of patterns) {
      if ((m = pattern.match(rgxPatternRegex))) {
        // pattern is a regex: m[] 1: negated, 2: pattern, 3: flags
        const [, negated, _regexPattern, _regexFlags] = m;

        if (!negated) {
          include = ["*://*/*"];
          exclude = [];
        }
      } else if ((m = pattern.match(rgxPatternDomain))) {
        // pattern is a domain: m[] 1: negated, 2: domain
        const [, negated, domain] = m;

        if (negated) {
          exclude.push(`*://${domain}/*`);
        } else {
          include.push(`*://${domain}/*`);
        }
      }
    }

    return { include, exclude };
  }

  /** Convert the match patterns to a piece of code that will test the url and return if
   * matching fails. */
  matchesToCode(patterns: string[]): string {
    let m: RegExpMatchArray | null; // pattern match

    let conditions: string[] = [];

    for (const pattern of patterns) {
      let rgx: string;
      let neg: boolean;
      let fullUrl: boolean;

      if ((m = pattern.match(rgxPatternRegex))) {
        // pattern is a regex: m[] 1: negated, 2: pattern, 3: flags
        const [, negated, regexPattern, regexFlags] = m;

        const flags = regexFlags.replace(/[^ugimsy]/g, "");
        rgx = `new RegExp(${JSON.stringify(regexPattern)}, ${JSON.stringify(flags)})`;
        neg = !!negated;
        fullUrl = true;
      } else if ((m = pattern.match(rgxPatternDomain))) {
        // pattern is a domain: m[] 1: negated, 2: domain
        const [, negated, domain] = m;

        const regexPattern =
          "^" + domain.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$";
        rgx = `new RegExp(${JSON.stringify(regexPattern)}, "i")`;
        neg = !!negated;
        fullUrl = false;
      } else {
        continue;
      }

      conditions.push(
        `${neg ? "!" : ""}${rgx}.test(${fullUrl ? "location.href" : "location.hostname"})`
      );
    }

    return `if(${conditions.join("\n&& ")}) return;\n`;
  }

  /** Parse the header of a user script. */
  parseHeader(code: string): HeaderData {
    const headerMatch = code.match(
      /^\s*(\/\/\/[^\r\n]*(?:\r?\n\/\/\/[^\r\n]*)*)/
    );
    let name: string = "";
    let patterns: string[] = [];
    let language: ScriptLanguage | undefined = undefined;
    let prettify: boolean | undefined = undefined;

    const allowedLanguages = ["typescript", "javascript"];

    const parseBool = (value: string) => {
      return ["true", "yes", "on"].includes(value.toLowerCase());
    };

    if (headerMatch) {
      const params = new Map<string, string[]>();
      const lines = headerMatch[1].split(/\r?\n/);

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

  /** Safely update the header in the code to use the newly provided field values. */
  updateHeader(
    code: string,
    { name, patterns, language, prettify }: HeaderData
  ) {
    const headerMatch = code.match(
      /^\s*(\/\/\/[^\r\n]*(?:\r?\n\/\/\/[^\r\n]*)*)/
    );

    // parse old lines
    let lines: [string, string][] = (headerMatch?.[1].split(/\r?\n/) ?? []).map(
      (line) => {
        let [, key, value] = line.match(/^\/+([\w\s]+):\s*(.*)$/) ?? [];
        return [key.trim().toLowerCase(), value];
      }
    );

    // line mutation utilities
    const removeKey = (key: string) => {
      lines = lines.filter((line) => line[0] !== key);
    };
    const updateKey = (
      key: string,
      value: string | number | boolean | undefined
    ) => {
      if (value == null) {
        removeKey(key);
        return;
      }

      if (typeof value !== "string") value = "" + value;

      let found = false;
      lines = lines.map((line) => {
        if (line[0] !== key) return line;
        found = true;
        return [line[0], value];
      });
      if (!found) lines.unshift([key, value]);
    };

    // generate header lines
    removeKey("match");
    updateKey("prettify", prettify);
    updateKey("language", language);
    updateKey("name", name);
    lines = [
      ...lines,
      ...patterns.map((pattern) => ["match", pattern] as [string, string]),
    ];

    // build header
    const newHeader = this.buildHeaderLines(lines);

    // replace old header with new header
    code = code.slice(headerMatch?.[0].length ?? 0); // cut off old header
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
  private userScriptsError: string = "";

  /** Initiate userScripts access. */
  initiateUserScripts() {
    try {
      Chrome.userScripts?.getScripts();
      this.userScripts = Chrome.userScripts as (typeof chrome)["userScripts"];
    } catch (_err) {
      this.userScriptsError =
        chromiumVersion >= 138
          ? "You must enable 'Allow User Scripts' for this extension in order to be able to use it"
          : "You must enable 'Developer Mode' in extensions in order to be able to use this extension.";
    }
  }

  /** Get the userScripts utility, or capture an error indicating which toggle must be
   * enabled. */
  getUserScripts() {
    this.initiateUserScripts();
    return this.userScripts;
  }

  /** Get the message indicating which toggle must be enabled for userScripts to work. */
  getUserScriptsError() {
    return this.userScriptsError;
  }

  /** Resynchronize stored scripts with registered userScripts. */
  resynchronizeScripts = wrapAsyncLast(async () => {
    const userScripts = this.getUserScripts();
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
      const codePrefix = this.matchesToCode(script.patterns);
      const source = CodePack.unpack(script.compiled ?? script.code);
      const code = `(()=>{\n${codePrefix}\n${source}\n})();`;
      const matches = this.matchesToUrlPatterns(script.patterns);

      const userScript: UserScript = {
        id: script.id,
        js: [{ code }],
        allFrames: false,
        runAt: "document_start",
        world: "MAIN",
        includeGlobs: matches.include,
        excludeGlobs: matches.exclude,
      };

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
}
export const webScripts = new WebScripts();
