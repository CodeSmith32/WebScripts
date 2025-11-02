import ts from "typescript";
import type { ScriptLanguage } from "../types";

export class TypeScriptService {
  tsCompileOptions: ts.CompilerOptions = {
    experimentalDecorators: true,
  };

  /** Compile source code from script. */
  compile(code: string, language: ScriptLanguage = "javascript") {
    return language === "typescript"
      ? ts.transpile(code, { ...this.tsCompileOptions })
      : null;
  }
}

export const typescriptService = new TypeScriptService();
