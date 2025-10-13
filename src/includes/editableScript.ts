import ts from "typescript";
import { CodePack } from "./codepack";
import {
  webScripts,
  type ScriptLanguage,
  type StoredScript,
} from "./webscripts";
import { randAlphaNum } from "./utils";
import { arraysEqual } from "./arrayFns";

const scriptLanguages: Record<ScriptLanguage, true> = {
  javascript: true,
  typescript: true,
};
Object.setPrototypeOf(scriptLanguages, null);

const tsCompileOptions: ts.CompilerOptions = {
  experimentalDecorators: true,
};

const compile = (code: string, language: ScriptLanguage = "javascript") =>
  language === "typescript"
    ? CodePack.pack(ts.transpile(code, tsCompileOptions))
    : null;

/** A class to manage the state for editable scripts. */
export class EditableScript {
  #script: StoredScript;
  #saved: boolean = true;
  #code: string | null = null;
  #codeChanged: boolean = false;

  private constructor(script: StoredScript) {
    this.#script = script;
  }

  /** Create a fresh new EditableScript. */
  static createNew(details: Partial<StoredScript>) {
    const code = details.code ?? "";

    const script: StoredScript = {
      id: randAlphaNum(16),
      name: "",
      patterns: [],
      language: "javascript",
      ...details,
      code: CodePack.pack(code),
      compiled: null,
    };
    script.compiled = compile(code, script.language);

    return new EditableScript(script);
  }

  /** Create an EditableScript from a StoredScript. */
  static fromStoredScript(details: StoredScript) {
    return new EditableScript(details);
  }

  /** Create an EditableScript from code, by parsing the header. */
  static fromCode(code: string) {
    const { name, language, patterns, prettify } = webScripts.parseHeader(code);
    const script: StoredScript = {
      id: randAlphaNum(16),
      name,
      patterns,
      language,
      prettify,
      code: CodePack.pack(code),
      compiled: null,
    };
    script.compiled = compile(script.code, script.language);

    return new EditableScript(script);
  }

  /** If the script has unsaved changes. */
  get saved(): boolean {
    return this.#saved;
  }

  /** Mark the script as saved. */
  markSaved() {
    this.#saved = true;
  }

  /** Mark the script as having unsaved changes. */
  markUnsaved() {
    this.#saved = false;
  }

  /** Get the stored script object to be saved. Compresses / recompiles code if necessary. */
  storedScript(): StoredScript {
    if (this.#codeChanged) {
      this.#script.code = CodePack.pack(this.#code!);
      this.#script.compiled = compile(this.#code!, this.language);
      this.#codeChanged = false;
    }
    return this.#script;
  }

  /** The script id. */
  get id(): string {
    return this.#script.id;
  }

  /** The script name. */
  get name(): string {
    return this.#script.name;
  }
  set name(name: string) {
    this.#script.name = name;
    this.markUnsaved();
  }

  /** The language the script was written in. */
  get language(): ScriptLanguage {
    return this.#script.language ?? "javascript";
  }
  set language(language: ScriptLanguage | undefined) {
    if (typeof language === "string" && !scriptLanguages[language]) {
      language = "javascript";
    }
    this.#script.language = language;
    this.#codeChanged = true; // compilation may be necessary
    this.markUnsaved();
  }

  /** Whether or not code is prettified when saved. */
  get prettify(): boolean {
    return this.#script.prettify ?? false;
  }
  set prettify(prettify: boolean | undefined) {
    this.#script.prettify = prettify;
  }

  /** The url match patterns. */
  get patterns(): string[] {
    return this.#script.patterns ?? [];
  }
  set patterns(patterns: string[]) {
    this.#script.patterns = patterns;
    this.markUnsaved();
  }

  /** The script code. */
  get code(): string {
    this.#code ??= CodePack.unpack(this.#script.code);
    return this.#code;
  }
  set code(code: string) {
    this.#code = code;
    this.#codeChanged = true;
    this.markUnsaved();
  }

  /** Parses the header and updates the script's details accordingly. */
  reloadHeader(): boolean {
    const { name, patterns, language, prettify } = webScripts.parseHeader(
      this.code
    );
    if (
      this.#script.name === name &&
      this.#script.language === language &&
      arraysEqual(this.#script.patterns, patterns) &&
      this.#script.prettify === prettify
    ) {
      return false;
    }

    this.#script.name = name;
    this.#script.patterns = patterns;
    this.#script.language = language;
    this.#script.prettify = prettify;
    this.markUnsaved();
    return true;
  }

  /** Regenerates the header from the script's details. */
  regenerateHeader(): boolean {
    const newCode = webScripts.updateHeader(this.code, this.#script);
    if (this.code === newCode) return false;

    this.code = newCode;
    return true;
  }
}
