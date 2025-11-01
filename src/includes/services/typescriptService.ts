import ts from "typescript";
import type { ScriptLanguage } from "./webScriptService";

const tsCompileOptions: ts.CompilerOptions = {
  experimentalDecorators: true,
};

export class TypeScriptService {
  /** Compile source code from script. */
  compile(code: string, language: ScriptLanguage = "javascript") {
    return language === "typescript"
      ? ts.transpile(code, tsCompileOptions)
      : null;
  }
}

export const typescriptService = new TypeScriptService();
