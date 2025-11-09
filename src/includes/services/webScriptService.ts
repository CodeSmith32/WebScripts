import { randAlphaNum } from "../utils";
import { CodePack } from "../core/codepack";
import { storageService } from "./storageService";
import {
  executionWorlds,
  scriptLanguages,
  whenTimes,
  type CSPAction,
  type ExecutionWorld,
  type ScriptLanguage,
  type StoredScript,
  type WhenTime,
} from "../types";
import { arraysEqual } from "../core/arrayFns";
import { pick } from "../core/pick";
import { mergeDefined } from "../core/mergeDefined";

export type HeaderData = Partial<Omit<StoredScript, "id" | "code">>;

const boolValues: Record<string, boolean | undefined> = {
  // true
  true: true,
  yes: true,
  on: true,
  // false
  false: false,
  no: false,
  off: false,
};
const cspValues: Record<string, CSPAction | undefined> = {
  // disable
  disable: "disable",
  disabled: "disable",
  off: "disable",
  false: "disable",
  no: "disable",
  // leave
  leave: "leave",
  on: "leave",
  true: "leave",
  yes: "leave",
};

const headerDataKeys: (keyof HeaderData)[] = [
  "name",
  "language",
  "patterns",
  "prettify",
  "locked",
  "when",
  "world",
  "csp",
];
const codeHeaderKeys = headerDataKeys.map((key) =>
  key === "patterns" ? "match" : key
);

export class WebScripts {
  /** Generate default property values for an empty script. */
  getScriptDefaults(): StoredScript {
    return {
      id: "",
      name: "",
      language: "javascript",
      patterns: [],
      prettify: false,
      locked: false,
      when: "start",
      world: "main",
      csp: "leave",
      code: "",
    };
  }

  /** Generate default property values for an empty header data object. */
  getHeaderDefaults(): Required<HeaderData> {
    return pick(this.getScriptDefaults(), headerDataKeys);
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

      // name
      if (params.has("name")) {
        data.name = params.get("name")![0] || defaults.name;
      }
      // language
      if (params.has("language")) {
        const language = params.get("language")![0].toLowerCase();
        data.language = (scriptLanguages as Record<string, boolean>)[language]
          ? (language as ScriptLanguage)
          : defaults.language;
      }
      // patterns
      if (params.has("match")) {
        data.patterns = params.get("match")!;
      }
      // prettify
      if (params.has("prettify")) {
        const prettify = params.get("prettify")![0].toLowerCase();
        data.prettify = boolValues[prettify] ?? defaults.prettify;
      }
      // locked
      if (params.has("locked")) {
        const locked = params.get("locked")![0].toLowerCase();
        data.locked = boolValues[locked] ?? defaults.locked;
      }
      // when
      if (params.has("when")) {
        const when = params.get("when")![0].toLowerCase();
        data.when = (whenTimes as Record<string, boolean>)[when]
          ? (when as WhenTime)
          : defaults.when;
      }
      // world
      if (params.has("world")) {
        const world = params.get("world")![0].toLowerCase();
        data.world = (executionWorlds as Record<string, boolean>)[world]
          ? (world as ExecutionWorld)
          : defaults.world;
      }
      // csp
      if (params.has("csp")) {
        const policy = params.get("csp")![0].toLowerCase();
        data.csp = cspValues[policy] ?? defaults.csp;
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
      a.locked === b.locked &&
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
    { name, patterns, language, prettify, locked, when, world, csp }: HeaderData
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
    removeKeys(...codeHeaderKeys);
    lines = [
      this.makeHeaderKey("name", name),
      this.makeHeaderKey("language", language),
      this.makeHeaderKey("prettify", prettify),
      this.makeHeaderKey("locked", locked ? "true" : undefined),
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
    locked,
    when,
    world,
    csp,
  }: HeaderData) {
    // generate header lines
    const lines: [string, string][] = [
      this.makeHeaderKey("name", name ?? ""),
      this.makeHeaderKey("language", language ?? "javascript"),
      this.makeHeaderKey("prettify", prettify ? "true" : "false"),
      this.makeHeaderKey("locked", locked ? "true" : undefined),
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
