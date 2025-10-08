import { CSPHeader, CSPValue } from "./csp";
import { Chrome, hostFromURL, type SendMessageOptions } from "./utils";
import { wrapAsyncLast, wrapAsyncMerge } from "./wrapAsync";

export type ScriptLanguage = "typescript" | "javascript";

export interface StoredScript {
  id: string;
  name: string;
  patterns: string[];
  language: ScriptLanguage;
  code: string;
  compiled: string;
}

export interface HeaderData {
  name: string;
  patterns: string[];
  language: ScriptLanguage;
}

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
      Chrome.runtime.sendMessage as (
        message: unknown,
        options?: SendMessageOptions
      ) => Promise<T>
    )(message, options);
  }

  /** Save all user scripts. Async-wrapped to prevent simultaneous calls. */
  saveScripts = wrapAsyncLast(
    async (scripts: StoredScript[]): Promise<void> => {
      await Chrome.storage.local.set({ scripts });
    }
  );

  /** Load all user scripts. Async-wrapped to prevent simultaneous calls. */
  loadScripts = wrapAsyncMerge(async (): Promise<StoredScript[]> => {
    return (await Chrome.storage.local.get("scripts"))?.scripts ?? [];
  });

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
    let language: ScriptLanguage = "javascript";

    const allowedLanguages = ["typescript", "javascript"];

    if (headerMatch) {
      const params = new Map();
      const lines = headerMatch[1].split(/\r?\n/);

      for (let line of lines) {
        let [, key, value] = line.match(/^\/+([\w\s]+):\s*(.*)$/) ?? [];
        if (key == null || value == null) continue;

        key = key.trim().toLowerCase();

        let arr = params.get(key);
        if (!arr) params.set(key, (arr = []));
        arr.push(value);
      }

      if (params.has("name")) name = params.get("name")[0];
      if (params.has("match")) patterns = params.get("match");
      if (params.has("language")) {
        const lang = params.get("language")[0].toLowerCase();
        language = allowedLanguages.includes(lang) ? lang : "javascript";
      }
    }
    return { name, patterns, language };
  }

  updateHeader(code: string, { name, patterns, language }: HeaderData) {
    const headerMatch = code.match(
      /^\s*(\/\/\/[^\r\n]*(?:\r?\n\/\/\/[^\r\n]*)*)/
    );

    // generate header lines
    const newHeaderLines: [string, string][] = [
      ["name", name],
      ["language", language],
      ...patterns.map((pattern) => ["match", pattern] as [string, string]),
    ];

    // get longest line key (for padding alignment)
    const longestLineName = newHeaderLines.reduce(
      (max, [key]) => Math.max(max, key.length),
      0
    );

    // generate new header
    const newHeader = newHeaderLines
      .map(
        ([key, value]) =>
          `/// ${key}${" ".repeat(longestLineName - key.length)}  ${value}`
      )
      .join("\n");

    // replace old header with new header
    code = code.slice(headerMatch?.[0].length ?? 0); // cut off old header
    code = newHeader + "\n\n" + code.replace(/^\s+/, ""); // add new header and separating line

    return code;
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
    await Chrome.storage.local.set({ refer });
    await Chrome.runtime.openOptionsPage();
  });
}
export const webScripts = new WebScripts();
