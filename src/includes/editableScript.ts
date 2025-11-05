import { CodePack } from "./core/codepack";
import {
  scriptLanguages,
  type CSPAction,
  type ScriptLanguage,
  type StoredScript,
} from "./types";

// DEPRECATED: This layer adds unnecessary abstraction

/** A class to manage the state for editable scripts. */
export class EditableScript {
  #script: StoredScript;
  #code: string | null = null;
  #codeChanged: boolean = false;

  constructor(script: StoredScript) {
    this.#script = script;
  }

  /** Get the stored script object to be saved. Compresses / recompiles code if necessary. */
  storedScript(): StoredScript {
    if (this.#codeChanged) {
      this.#script.code = CodePack.pack(this.#code!);
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
  }

  /** The language the script was written in. */
  get language(): ScriptLanguage {
    return this.#script.language ?? "javascript";
  }
  set language(language: ScriptLanguage | undefined) {
    if (typeof language !== "string" || !scriptLanguages[language]) {
      language = "javascript";
    }
    this.#script.language = language;
  }

  /** The url match patterns. */
  get patterns(): string[] {
    return this.#script.patterns ?? [];
  }
  set patterns(patterns: string[]) {
    this.#script.patterns = patterns;
  }

  /** Whether or not code is prettified when saved. */
  get prettify(): boolean {
    return this.#script.prettify ?? false;
  }
  set prettify(prettify: boolean | undefined) {
    this.#script.prettify = prettify ?? false;
  }

  /** The csp action. */
  get csp(): CSPAction {
    return this.#script.csp ?? "leave";
  }
  set csp(csp: CSPAction) {
    this.#script.csp = csp;
  }

  /** The script code. */
  get code(): string {
    this.#code ??= CodePack.unpack(this.#script.code);
    return this.#code;
  }
  set code(code: string) {
    this.#code = code;
    this.#codeChanged = true;
  }
}
