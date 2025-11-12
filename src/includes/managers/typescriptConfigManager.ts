import {
  array,
  boolean,
  intersection,
  number,
  object,
  partial,
  prettifyError,
  record,
  string,
  union,
  enum as zenum,
  null as znull,
  ZodMiniEnum,
} from "zod/mini";
import { MonacoLanguages, monacoService } from "../services/monacoService";

type TSConfig = MonacoLanguages.typescript.CompilerOptions;

const typescriptConfigRaw = object({
  allowJs: boolean(),
  allowSyntheticDefaultImports: boolean(),
  allowUmdGlobalAccess: boolean(),
  allowUnreachableCode: boolean(),
  allowUnusedLabels: boolean(),
  alwaysStrict: boolean(),
  baseUrl: string(),
  charset: string(),
  checkJs: boolean(),
  declaration: boolean(),
  declarationMap: boolean(),
  emitDeclarationOnly: boolean(),
  declarationDir: string(),
  disableSizeLimit: boolean(),
  disableSourceOfProjectReferenceRedirect: boolean(),
  downlevelIteration: boolean(),
  emitBOM: boolean(),
  emitDecoratorMetadata: boolean(),
  experimentalDecorators: boolean(),
  forceConsistentCasingInFileNames: boolean(),
  importHelpers: boolean(),
  inlineSourceMap: boolean(),
  inlineSources: boolean(),
  isolatedModules: boolean(),
  jsx: zenum([
    "None",
    "Preserve",
    "React",
    "ReactNative",
    "ReactJSX",
    "ReactJSXDe",
  ]),
  keyofStringsOnly: boolean(),
  lib: array(string()),
  locale: string(),
  mapRoot: string(),
  maxNodeModuleJsDepth: number(),
  module: zenum([
    "None",
    "CommonJS",
    "AMD",
    "UMD",
    "System",
    "ES2015",
    "ESNext",
  ]),
  moduleResolution: zenum(["Classic", "NodeJs"]),
  newLine: zenum(["CarriageReturnLineFeed", "LineFeed"]),
  noEmit: boolean(),
  noEmitHelpers: boolean(),
  noEmitOnError: boolean(),
  noErrorTruncation: boolean(),
  noFallthroughCasesInSwitch: boolean(),
  noImplicitAny: boolean(),
  noImplicitReturns: boolean(),
  noImplicitThis: boolean(),
  noStrictGenericChecks: boolean(),
  noUnusedLocals: boolean(),
  noUnusedParameters: boolean(),
  noImplicitUseStrict: boolean(),
  noLib: boolean(),
  noResolve: boolean(),
  out: string(),
  outDir: string(),
  outFile: string(),
  paths: record(string(), array(string())),
  preserveConstEnums: boolean(),
  preserveSymlinks: boolean(),
  project: string(),
  reactNamespace: string(),
  jsxFactory: string(),
  composite: boolean(),
  removeComments: boolean(),
  rootDir: string(),
  rootDirs: array(string()),
  skipLibCheck: boolean(),
  skipDefaultLibCheck: boolean(),
  sourceMap: boolean(),
  sourceRoot: string(),
  strict: boolean(),
  strictFunctionTypes: boolean(),
  strictBindCallApply: boolean(),
  strictNullChecks: boolean(),
  strictPropertyInitialization: boolean(),
  stripInternal: boolean(),
  suppressExcessPropertyErrors: boolean(),
  suppressImplicitAnyIndexErrors: boolean(),
  target: zenum([
    "ES3",
    "ES5",
    "ES2015",
    "ES2016",
    "ES2017",
    "ES2018",
    "ES2019",
    "ES2020",
    "ESNext",
    "JSON",
    "Latest",
  ]),
  traceResolution: boolean(),
  resolveJsonModule: boolean(),
  types: array(string()),
  typeRoots: array(string()),
  esModuleInterop: boolean(),
  useDefineForClassFields: boolean(),
});
const typescriptConfigSchema = intersection(
  partial(typescriptConfigRaw),
  record(
    string(),
    union([
      string(),
      number(),
      boolean(),
      array(union([string(), number()])),
      array(string()),
      record(string(), array(string())),
      znull(),
    ])
  )
);

const enumKeys: string[] = Object.keys(typescriptConfigRaw.shape).filter(
  (key) =>
    typescriptConfigRaw.shape[
      key as keyof (typeof typescriptConfigRaw)["shape"]
    ] instanceof ZodMiniEnum
);
const enumTables = {
  jsx: MonacoLanguages.typescript.JsxEmit,
  module: MonacoLanguages.typescript.ModuleKind,
  moduleResolution: MonacoLanguages.typescript.ModuleResolutionKind,
  newLine: MonacoLanguages.typescript.NewLineKind,
  target: MonacoLanguages.typescript.ScriptTarget,
};
const enumNames: Record<TSConfigEnumKey, string> = {
  jsx: "JsxEmit",
  module: "ModuleKind",
  moduleResolution: "ModuleResolutionKind",
  newLine: "NewLineKind",
  target: "ScriptTarget",
};

type TSConfigEnumKey = keyof typeof enumTables;

export class TypeScriptConfigManager {
  #lastErrors: string[] = [];

  private updateTypeScriptConfig(config: TSConfig) {
    monacoService.configureTypeScript(config);
  }

  private parseTypeScriptConfig(json: string): TSConfig | null {
    this.#lastErrors = [];

    let jsonData: unknown;
    try {
      jsonData = JSON.parse(json);
    } catch (err) {
      this.#lastErrors.push((err as Error).message);
      return null;
    }

    const tsConfigParsed = typescriptConfigSchema.safeParse(jsonData);
    if (!tsConfigParsed.success) {
      this.#lastErrors.push(...prettifyError(tsConfigParsed.error).split("\n"));
      return null;
    }

    const tsConfig: TSConfig = tsConfigParsed.data as TSConfig;

    // convert enum string values to numeric values
    for (const rawEnumKey of enumKeys) {
      const enumKey = rawEnumKey as TSConfigEnumKey;

      if (!enumTables[enumKey]) {
        throw new Error(
          `Assertion failed: Enum table missing for tsconfig key '${enumKey}'`
        );
      }

      if (tsConfig[enumKey] != null) {
        tsConfig[enumKey as string] =
          enumTables[enumKey][tsConfig[enumKey] as never];

        // sanity double-check
        if (tsConfig[enumKey] == null) {
          this.#lastErrors.push(
            `Error with config.${enumKey}: Invalid option for enum ${enumNames[enumKey]}: '${tsConfig[enumKey]}'`
          );
          delete tsConfig[enumKey];
        }
      }
    }

    return tsConfig;
  }

  validateTypeScriptConfig(json: string): boolean {
    return !!this.parseTypeScriptConfig(json);
  }

  setTypeScriptConfig(json: string): boolean {
    const config = this.parseTypeScriptConfig(json);
    if (!config) {
      this.revokeTypeScriptConfig();
      return false;
    }

    this.updateTypeScriptConfig(config);
    return true;
  }

  revokeTypeScriptConfig() {
    this.updateTypeScriptConfig({});
  }

  getErrors(): string[] {
    return this.#lastErrors;
  }
}

export const typescriptConfigManager = new TypeScriptConfigManager();
