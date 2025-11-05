import { randAlphaNum } from "../utils";
import { CodePack } from "../core/codepack";
import { storageService } from "./storageService";
import {
  scriptLanguages,
  type ScriptLanguage,
  type StoredScript,
} from "../types";
import { arraysEqual } from "../core/arrayFns";
import { pick } from "../core/pick";

export type HeaderData = Partial<
  Pick<StoredScript, "name" | "language" | "patterns" | "prettify" | "csp">
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
    let { name, patterns, language, prettify, csp } = this.parseHeader(code);

    const defaults = this.getScriptDefaults();

    // fallback to details from script object, or otherwise global defaults
    name ||= sourceScript.name ?? defaults.name;
    if (!patterns?.length)
      patterns = sourceScript.patterns ?? defaults.patterns;
    language ??= sourceScript.language ?? defaults.language;
    prettify ??= sourceScript.prettify ?? defaults.prettify;
    csp ??= sourceScript.csp ?? defaults.csp;

    // update header
    code = this.updateHeaderInCode(code, {
      name,
      patterns,
      language,
      prettify,
      csp,
    });

    // generate new script
    const script: StoredScript = {
      id: sourceScript.id ?? this.generateId(),
      name,
      patterns,
      language,
      prettify,
      csp,
      code: CodePack.pack(code),
    };

    return script;
  }

  /** Parse the header comment of a script. */
  parseHeader(code: string): HeaderData {
    const header = this.extractHeader(code).replace(/^s*/, "");

    let name: string = "";
    let patterns: string[] = [];
    let language: ScriptLanguage | undefined = undefined;
    let prettify: boolean | undefined = undefined;
    let csp: HeaderData["csp"] = undefined;

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
        name = params.get("name")![0];
      }
      if (params.has("language")) {
        const lang = params.get("language")![0].toLowerCase();
        language = (scriptLanguages as Record<string, boolean>)[lang]
          ? (lang as ScriptLanguage)
          : "javascript";
      }
      if (params.has("prettify")) {
        prettify = parseBool(params.get("prettify")![0]);
      }
      if (params.has("csp")) {
        const policy = params.get("csp")![0].toLowerCase();
        csp = ["disable", "disabled", "off", "false", "no"].includes(policy)
          ? "disable"
          : "leave";
      }
      if (params.has("match")) {
        patterns = params.get("match")!;
      }
    }
    return { name, patterns, language, prettify, csp };
  }

  /** Checks to see if two header data objects contain equivalent values. */
  headersEqual(a: HeaderData, b: HeaderData) {
    return (
      a.name === b.name &&
      a.language === b.language &&
      arraysEqual(a.patterns ?? [], b.patterns ?? []) &&
      a.prettify === b.prettify &&
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

  /** Update the given header data in the header comment, and return a new header comment. */
  updateHeader(
    header: string,
    { name, patterns, language, prettify, csp }: HeaderData
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
    removeKeys("name", "language", "prettify", "csp", "match");
    lines = [
      makeKey("name", name),
      makeKey("language", language),
      makeKey("prettify", prettify),
      makeKey("csp", csp === "leave" ? undefined : csp),
      ...lines,
      ...(patterns ?? []).map((pattern) => makeKey("match", pattern)),
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
  generateHeader({ name, patterns, language, prettify, csp }: HeaderData) {
    // exclude csp line if not disabled
    const cspLine: [string, string][] =
      csp === "disable" ? [["csp", "disable"]] : [];

    // generate header lines
    const lines: [string, string][] = [
      ["name", name ?? ""],
      ["language", language ?? "javascript"],
      ["prettify", prettify ? "true" : "false"],
      ...cspLine,
      ...(patterns ?? []).map(
        (pattern) => ["match", pattern] as [string, string]
      ),
    ];

    return this.buildHeaderLines(lines);
  }
}

export const webScripts = new WebScripts();
