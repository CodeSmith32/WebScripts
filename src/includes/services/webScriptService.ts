import { randAlphaNum } from "../utils";
import { CodePack } from "../core/codepack";
import { storageService } from "./storageService";
import {
  executionWorlds,
  scriptLanguages,
  whenTimes,
  type ExecutionWorld,
  type ScriptLanguage,
  type StoredScript,
  type WhenTime,
} from "../types";
import { arraysEqual } from "../core/arrayFns";
import { pick } from "../core/pick";
import { mergeDefined } from "../core/mergeDefined";

export type HeaderData = Partial<
  Pick<
    StoredScript,
    "name" | "language" | "patterns" | "prettify" | "when" | "world" | "csp"
  >
>;

export class WebScripts {
  /** Generate default property values for an empty script. */
  getScriptDefaults(): StoredScript {
    return {
      id: "",
      name: "",
      language: "javascript",
      patterns: [],
      prettify: false,
      when: "start",
      world: "main",
      csp: "leave",
      code: "",
    };
  }

  /** Generate default property values for an empty header data object. */
  getHeaderDefaults(): Required<HeaderData> {
    return pick(this.getScriptDefaults(), [
      "name",
      "language",
      "patterns",
      "prettify",
      "when",
      "world",
      "csp",
    ]);
  }

  /** Generate an id for a script. */
  generateId() {
    let id = "";
    // guarantee uniqueness
    do {
      id = randAlphaNum(16);
    } while (storageService.latestScripts.some((script) => script.id === id));
    return id;
  }

  /** Take parts of a stored script, reconstitute it, and resynchronize parts with code
   * header. */
  normalizeScript(sourceScript: Readonly<Partial<StoredScript>>) {
    let code = CodePack.unpack(sourceScript.code ?? "");

    // extract details from script code header
    const header = this.parseHeader(code);

    // get defaults for script
    const defaults = this.getScriptDefaults();

    // merge results: prioritize code header, fallback to source script, fallback to defaults
    const script: StoredScript = mergeDefined(defaults, sourceScript, header);

    // fill in missing values
    script.id ||= this.generateId();
    script.name ||= defaults.name;
    if (!script.patterns.length) {
      // if code header gave array with no matches, fallback to source script, or defaults
      script.patterns = sourceScript.patterns ?? defaults.patterns;
    }
    // update code header, then update script code
    code = this.updateHeaderInCode(code, script);
    script.code = CodePack.pack(code);

    return script;
  }

  /** Parse the header comment of a script. */
  parseHeader(code: string): HeaderData {
    const header = this.extractHeader(code).replace(/^s*/, "");
    const defaults = this.getHeaderDefaults();

    const data: HeaderData = {};

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

      if (params.has("name")) {
        data.name = params.get("name")![0] || defaults.name;
      }
      if (params.has("match")) {
        data.patterns = params.get("match")!;
      }
      if (params.has("language")) {
        const language = params.get("language")![0].toLowerCase();
        data.language = (scriptLanguages as Record<string, boolean>)[language]
          ? (language as ScriptLanguage)
          : defaults.language;
      }
      if (params.has("prettify")) {
        data.prettify = parseBool(params.get("prettify")![0]);
      }
      if (params.has("when")) {
        const when = params.get("when")![0].toLowerCase();
        data.when = (whenTimes as Record<string, boolean>)[when]
          ? (when as WhenTime)
          : defaults.when;
      }
      if (params.has("world")) {
        const world = params.get("world")![0].toLowerCase();
        data.world = (executionWorlds as Record<string, boolean>)[world]
          ? (world as ExecutionWorld)
          : defaults.world;
      }
      if (params.has("csp")) {
        const policy = params.get("csp")![0].toLowerCase();
        data.csp = ["disable", "disabled", "off", "false", "no"].includes(
          policy
        )
          ? "disable"
          : ["leave", "on", "true", "yes"].includes(policy)
            ? "leave"
            : defaults.csp;
      }
    }
    return data;
  }

  /** Checks to see if two header data objects contain equivalent values. */
  headersEqual(a: HeaderData, b: HeaderData) {
    return (
      a.name === b.name &&
      a.language === b.language &&
      arraysEqual(a.patterns ?? [], b.patterns ?? []) &&
      a.prettify === b.prettify &&
      a.when === b.when &&
      a.world === b.world &&
      a.csp === b.csp
    );
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

  /** Helper to generate header key-value pair tuple, or null if not set. */
  private makeHeaderKey(
    key: string,
    value: string | number | boolean | undefined
  ): [string, string] | null {
    return value == null ? null : [key, "" + value];
  }

  /** Update the given header data in the header comment, and return a new header comment. */
  updateHeader(
    header: string,
    { name, patterns, language, prettify, when, world, csp }: HeaderData
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

    // regenerate header lines
    removeKeys("name", "language", "prettify", "when", "world", "csp", "match");
    lines = [
      this.makeHeaderKey("name", name),
      this.makeHeaderKey("language", language),
      this.makeHeaderKey("prettify", prettify),
      this.makeHeaderKey("when", when === "start" ? undefined : when),
      this.makeHeaderKey("world", world === "main" ? undefined : world),
      this.makeHeaderKey("csp", csp === "leave" ? undefined : csp),
      ...lines,
      ...(patterns ?? []).map((pattern) =>
        this.makeHeaderKey("match", pattern)
      ),
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
  generateHeader({
    name,
    patterns,
    language,
    prettify,
    when,
    world,
    csp,
  }: HeaderData) {
    // generate header lines
    const lines: [string, string][] = [
      this.makeHeaderKey("name", name ?? ""),
      this.makeHeaderKey("language", language ?? "javascript"),
      this.makeHeaderKey("prettify", prettify ? "true" : "false"),
      this.makeHeaderKey("when", when === "start" ? undefined : when),
      this.makeHeaderKey("world", world === "main" ? undefined : world),
      this.makeHeaderKey("csp", csp === "disable" ? "disable" : undefined),
      ...(patterns ?? []).map(
        (pattern) => ["match", pattern] as [string, string]
      ),
    ].filter((v) => !!v);

    return this.buildHeaderLines(lines);
  }
}

export const webScripts = new WebScripts();
