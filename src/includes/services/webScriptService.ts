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
import { arrayify, stringify } from "../core/cast";
import { nullObject } from "../core/nullObject";

export type HeaderValue =
  | (string | number | boolean | undefined)
  | (string | number | boolean | undefined)[];
export type KeyValue = [string, string];

export type HeaderData = Partial<Omit<StoredScript, "id" | "code">>;
export type AugmentedHeaderData = Record<string, HeaderValue>;

const boolValues: Record<string, boolean | undefined> = nullObject({
  // true
  true: true,
  yes: true,
  on: true,
  // false
  false: false,
  no: false,
  off: false,
});

const cspValues: Record<string, CSPAction | undefined> = nullObject({
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
});

const headerDataKeyMap: Record<keyof HeaderData, true> = nullObject({
  name: true,
  language: true,
  prettify: true,
  locked: true,
  when: true,
  world: true,
  csp: true,
  match: true,
});
const headerDataKeys = Object.keys(headerDataKeyMap) as (keyof HeaderData)[];

// A list of code header fieldnames, in the order they should appear in.
// * indicates the insertion point for any other fields
const codeHeaderMap = nullObject({
  name: true,
  version: true,
  author: true,
  description: true,
  "*": true,
  language: true,
  prettify: true,
  locked: true,
  when: true,
  world: true,
  csp: true,
  match: true,
} as const satisfies Record<keyof HeaderData | (string & {}), true>);
const codeHeaderFields = Object.keys(
  codeHeaderMap
) as (keyof typeof codeHeaderMap)[];

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

  /** Generate a new script with details from the given header data. */
  prepareNewScript(header: AugmentedHeaderData) {
    header = this.removeDefaultedFields(header);

    const code = this.generateHeader(header) + "\n\n";
    return this.normalizeScript({ code: CodePack.pack(code) }, true);
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
          `/// ${key}:${" ".repeat(nameLen - key.length)}  ${value}`
      )
      .join("\n");
  }

  /** Remove fields from header data that are already set to default. Optionally supply an array
   * of fieldnames that will forcibly be included. */
  removeDefaultedFields(
    headerData: HeaderData,
    forceInclude?: string[]
  ): HeaderData;
  removeDefaultedFields(
    headerData: AugmentedHeaderData,
    forceInclude?: string[]
  ): AugmentedHeaderData;
  removeDefaultedFields(
    headerData: AugmentedHeaderData,
    forceInclude: string[] = []
  ): AugmentedHeaderData {
    const defaults = this.getHeaderDefaults();
    const include = new Set(forceInclude);

    // remove defaulted fields
    const header = headerDataKeys.reduce((data, key) => {
      // don't include headers if they're set to default and not present in the code:
      data[key] = include?.has(key)
        ? (headerData[key] ?? defaults[key]) // field is force-included: keep value
        : headerData[key] !== defaults[key]
          ? headerData[key] // field is not default: keep value (or leave out if unset)
          : undefined; // field is default: leave out
      return data;
    }, nullObject() as AugmentedHeaderData);

    // add augmented fields back in
    for (const key of Object.keys(headerData)) {
      if (!(key in headerDataKeyMap)) {
        header[key] = headerData[key];
      }
    }

    // return header data with defaulted fields removed
    return header;
  }

  /** Extract header comment from start of code. */
  extractHeader(code: string): string {
    const headerMatch = code.match(
      /^\s*(\/\/\/[^\r\n]*(?:(?:\r?\n)+\/\/\/[^\r\n]*)*)/
    );
    if (headerMatch) return headerMatch[0];
    return "";
  }

  /** Helper to convert header value(s) to key-value pair tuples. */
  private makeHeaderFields(key: string, value: HeaderValue): KeyValue[] {
    return arrayify(value)
      .map((value) =>
        value == null ? null : ([key, stringify(value)] as KeyValue)
      )
      .filter((v) => !!v);
  }

  /** Update the given header data in the header comment, and return a new header comment. */
  updateHeader(headerCode: string, headerData: HeaderData): string {
    // trim off leading white-space
    headerCode = headerCode.replace(/^\s*/, "");

    // parse old lines
    let lines: KeyValue[] = (headerCode ? headerCode.split(/\r?\n/) : [])
      .map((line): KeyValue | null => {
        let [, key, value] = line.match(/^\/+([\w\s]+):\s*(.*)$/) ?? [];
        if (key == null || value == null) return null;
        return [key.trim().toLowerCase(), value];
      })
      .filter((v) => !!v);

    // get current set of field names
    const present = lines.map((line) => line[0]);

    // line mutation utilities
    const removeKeys = (...keys: string[]) => {
      lines = lines.filter((line) => !keys.includes(line[0]));
    };
    const pullKey = (key: string): string[] => {
      const value: string[] = [];
      lines = lines.filter((line) => {
        if (line[0] === key) value.push(line[1]);
        return line[0] !== key;
      });
      return value;
    };

    // remove core headers
    removeKeys(...headerDataKeys);

    // prepare header values for insertion
    const header = this.removeDefaultedFields(
      headerData as AugmentedHeaderData,
      present
    );

    // add in extra fields
    header.version = pullKey("version");
    header.author = pullKey("author");
    header.description = pullKey("description");

    // regenerate header
    return this.generateHeader(header, lines);
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
  generateHeader(
    augmentedHeaderData: AugmentedHeaderData,
    otherLines?: KeyValue[]
  ) {
    const newLines = ([] as KeyValue[]).concat(
      ...codeHeaderFields.map((key) => {
        if (key === "*") return otherLines ?? [];
        return this.makeHeaderFields(key, augmentedHeaderData[key]);
      })
    );

    return this.buildHeaderLines(newLines);
  }
}

export const webScripts = new WebScripts();
