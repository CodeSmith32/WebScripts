import { type Options } from "prettier";
import {
  boolean,
  int,
  object,
  partial,
  prettifyError,
  enum as zenum,
} from "zod/mini";

type PrettierConfig = Options;

const defaultPrettierConfig: PrettierConfig = {};

const prettierConfigSchema = partial(
  object({
    semi: boolean(),
    singleQuote: boolean(),
    jsxSingleQuote: boolean(),
    trailingComma: zenum(["none", "es5", "all"]),
    bracketSpacing: boolean(),
    objectWrap: zenum(["preserve", "collapse"]),
    bracketSameLine: boolean(),
    requirePragma: boolean(),
    insertPragma: boolean(),
    checkIgnorePragma: boolean(),
    proseWrap: zenum(["always", "never", "preserve"]),
    arrowParens: zenum(["avoid", "always"]),
    htmlWhitespaceSensitivity: zenum(["css", "strict", "ignore"]),
    endOfLine: zenum(["auto", "lf", "crlf", "cr"]),
    quoteProps: zenum(["as-needed", "consistent", "preserve"]),
    vueIndentScriptAndStyle: boolean(),
    embeddedLanguageFormatting: zenum(["auto", "off"]),
    singleAttributePerLine: boolean(),
    experimentalOperatorPosition: zenum(["start", "end"]),
    experimentalTernaries: boolean(),
    jsxBracketSameLine: boolean(),
    printWidth: int(),
    tabWidth: int(),
    useTabs: boolean(),

    // inapplicable settings:

    // rangeStart: number,
    // rangeEnd: number,
    // parser: LiteralUnion<BuiltInParserName>,
    // filepath: string,
    // plugins: Array<string | URL | Plugin>,
    // [_: string]: unknown,
  })
);

export class PrettierConfigManager {
  #lastErrors: string[] = [];
  #config: PrettierConfig = { ...defaultPrettierConfig };

  readonly helpUrl: string = "https://prettier.io/docs/options";

  private updatePrettierConfig(config: PrettierConfig) {
    this.#config = {
      ...defaultPrettierConfig,
      ...config,
    };
  }

  private parsePrettierConfig(json: string): PrettierConfig | null {
    this.#lastErrors = [];

    let jsonData: unknown;
    try {
      jsonData = JSON.parse(json);
    } catch (err) {
      this.#lastErrors.push((err as Error).message);
      return null;
    }

    const prettierConfigParsed = prettierConfigSchema.safeParse(jsonData);
    if (!prettierConfigParsed.success) {
      this.#lastErrors.push(
        ...prettifyError(prettierConfigParsed.error).split("\n")
      );
      return null;
    }

    return prettierConfigParsed.data;
  }

  validatePrettierConfig(json: string): boolean {
    return !!this.parsePrettierConfig(json);
  }

  setPrettierConfig(json: string): boolean {
    const prettierConfig = this.parsePrettierConfig(json);
    if (!prettierConfig) {
      this.revokePrettierConfig();
      return false;
    }

    this.updatePrettierConfig(prettierConfig);
    return true;
  }

  getPrettierConfig(): PrettierConfig {
    return this.#config;
  }

  revokePrettierConfig() {
    this.updatePrettierConfig({});
  }

  getErrors(): string[] {
    return this.#lastErrors;
  }
}

export const prettierConfigManager = new PrettierConfigManager();
