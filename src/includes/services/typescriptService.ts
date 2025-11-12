import ts from "typescript";
import type { ScriptLanguage } from "../types";

export class TypeScriptService {
  tsCompileOptions: ts.CompilerOptions = {
    experimentalDecorators: true,
  };

  /** Compile source code from script. */
  compile(code: string, language: ScriptLanguage = "javascript"): string {
    return language === "typescript"
      ? ts.transpile(code, { ...this.tsCompileOptions })
      : code;
  }
}

export const typescriptService = new TypeScriptService();
