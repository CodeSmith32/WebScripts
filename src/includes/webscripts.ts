import { CSPHeader, CSPValue } from "./csp";
import { Chrome, hostFromURL, type SendMessageOptions } from "./utils";
import { wrapAsyncLast, wrapAsyncMerge } from "./wrapAsync";

export type ScriptLanguage = "typescript" | "javascript";

export interface StoredScript {
  id: string;
  name: string;
  patterns: string[];
  language?: ScriptLanguage;
  prettify?: boolean;
  code: string;
  compiled?: string | null;

  saved?: never; // EditableScript must not be assignable to StoredScript
}

export interface StoredSettings {
  defaultLanguage: ScriptLanguage;
  defaultPrettify: boolean;
}

export const defaultSettings: StoredSettings = {
  defaultLanguage: "javascript",
  defaultPrettify: false,
};

export type HeaderData = Pick<
  StoredScript,
  "name" | "patterns" | "language" | "prettify"
>;

export type MessageTypes =
  | { cmd: "listRunning" }
  | { cmd: "updateBackgroundScripts" }
  | { cmd: "reloaded" };

class WebScripts {
  /** Send a message to the extension runtime. */
  async sendMessage<T>(
    message: MessageTypes,
    options: SendMessageOptions = {}
  ): Promise<T | undefined> {
    return await (
      Chrome.runtime?.sendMessage as (
        message: unknown,
        options?: SendMessageOptions
      ) => Promise<T>
    )(message, options);
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
      await Chrome.storage?.local.set({ settings });
    }
  );

  /** Load all user settings. Async-wrapped to prevent simultaneous calls. */
  loadSettings = wrapAsyncMerge(async (): Promise<StoredSettings> => {
    const settings = (await Chrome.storage?.local.get("settings"))?.settings;
    return { ...defaultSettings, ...settings };
  });

  /** Get referred script. */
  getRefered = wrapAsyncMerge(
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
      if ((m = pattern.match(/^(-?)\s*\/(.*)\/(\w*)$/))) {
        // pattern is a regex: m[] 1: negated, 2: pattern, 3: flags

        const [, negated, regexPattern, regexFlags] = m;
        const regex = new RegExp(
          regexPattern,
          regexFlags.replace(/[^ugimsy]/g, "")
        );

        if (regex.test(url)) found = negated ? false : true;
      } else if ((m = pattern.match(/^(-?)\s*([\w\.\*-]+)$/))) {
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
}
export const webScripts = new WebScripts();
