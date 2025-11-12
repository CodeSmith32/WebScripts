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
  "prettify",
  "locked",
  "when",
  "world",
  "csp",
  "match",
];
const headerDataKeysNoPatterns = headerDataKeys.filter(
  (key) => key !== "match"
);

type KeyValue = [string, string];

export class WebScripts {
  /** Generate default property values for an empty script. */
  getScriptDefaults(): StoredScript {
    return {
      id: "",
      name: "",
      language: "javascript",
      prettify: false,
      locked: false,
      when: "start",
      world: "main",
      csp: "leave",
      match: [],
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

  /** Take parts of a stored script, reconstitute it, and resynchronize parts with the code
   * header.
   *
   * If `preserveCode` is true, the code will not be modified. Only header values specified in
   * the code header will be set accordingly. Other values will become their defaults.
   *
   * If `preserveCode` is false (default), the code's header fields will take precedence over
   * the settings in the script, but the code will then be updated in case any script settings
   * were present that were not in the code header. */
  normalizeScript(
    sourceScript: Readonly<Partial<StoredScript>>,
    preserveCode: boolean = false
  ) {
    let code = CodePack.unpack(sourceScript.code ?? "");

    // if code must be preserved, then the script settings can only be derived from the code
    if (preserveCode) {
      sourceScript = { id: sourceScript.id, code: sourceScript.code };
    }

    // extract details from script code header
    const header = this.parseHeader(code);

    // get defaults for script
    const defaults = this.getScriptDefaults();

    // merge results: prioritize code header, fallback to source script, fallback to defaults
    const script: StoredScript = mergeDefined(defaults, sourceScript, header);
    script.id ||= this.generateId(); // fill in missing ids
    script.name = header.name || sourceScript.name || defaults.name; // merge name
    script.match = header.match?.length // merge patterns
      ? header.match
      : sourceScript.match?.length
        ? sourceScript.match
        : defaults.match;

    if (!preserveCode) {
      // update code header, then update script code
      code = this.updateHeaderInCode(code, script);
      script.code = CodePack.pack(code);
    }

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
      // match
      if (params.has("match")) {
        data.match = params.get("match")!;
      }
    }
    return data;
  }

  /** Checks to see if two header data objects contain equivalent values. */
  headersEqual(a: HeaderData, b: HeaderData) {
    return (
      a.name === b.name &&
      a.language === b.language &&
      a.prettify === b.prettify &&
      a.locked === b.locked &&
      a.when === b.when &&
      a.world === b.world &&
      a.csp === b.csp &&
      arraysEqual(a.match ?? [], b.match ?? [])
    );
  }

  /** Take a list of [ string, string ] pairs, and generate new header string.
   * Use pair[0] as property key, and pair[1] as property value. */
  private buildHeaderLines(lines: KeyValue[]) {
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
      /^\s*(\/\/\/[^\r\n]*(?:(?:\r?\n)+\/\/\/[^\r\n]*)*)/
    );
    if (headerMatch) return headerMatch[0];
    return "";
  }

  /** Helper to generate header key-value pair tuple, or null if not set. */
  private makeHeaderKey(
    key: string,
    value: string | number | boolean | undefined
  ): KeyValue | null {
    return value == null ? null : [key, "" + value];
  }

  /** Update the given header data in the header comment, and return a new header comment. */
  updateHeader(header: string, headerData: HeaderData): string {
    // trim off leading white-space
    header = header.replace(/^\s*/, "");

    const defaults = this.getHeaderDefaults();

    // parse old lines
    let lines: KeyValue[] = (header ? header.split(/\r?\n/) : [])
      .map((line): KeyValue | null => {
        let [, key, value] = line.match(/^\/+([\w\s]+):\s*(.*)$/) ?? [];
        if (key == null || value == null) return null;
        return [key.trim().toLowerCase(), value];
      })
      .filter((v) => !!v);

    // get current set of field names
    const setFields = new Set(lines.map((line) => line[0]));

    // line mutation utilities
    const removeKeys = (...keys: string[]) => {
      lines = lines.filter((line) => !keys.includes(line[0]));
    };

    // regenerate header lines

    // remove core headers
    removeKeys(...headerDataKeysNoPatterns, "match");

    // update and re-order headers
    lines = [
      ...headerDataKeysNoPatterns.map((key) =>
        this.makeHeaderKey(
          key,
          headerData[key] !== defaults[key]
            ? headerData[key]
            : setFields.has(key)
              ? defaults[key]
              : undefined
        )
      ),
      ...lines,
      ...(headerData.match ?? []).map((pattern) =>
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
    language,
    prettify,
    locked,
    when,
    world,
    csp,
    match,
  }: HeaderData) {
    // generate header lines
    const lines: KeyValue[] = [
      this.makeHeaderKey("name", name ?? ""),
      this.makeHeaderKey("language", language ?? "javascript"),
      this.makeHeaderKey("prettify", prettify ? "true" : "false"),
      this.makeHeaderKey("locked", locked ? "true" : undefined),
      this.makeHeaderKey("when", when === "start" ? undefined : when),
      this.makeHeaderKey("world", world === "main" ? undefined : world),
      this.makeHeaderKey("csp", csp === "disable" ? "disable" : undefined),
      ...(match ?? []).map((pattern) => ["match", pattern] as KeyValue),
    ].filter((v) => !!v);

    return this.buildHeaderLines(lines);
  }
}

export const webScripts = new WebScripts();
