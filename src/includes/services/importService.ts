import {
  array,
  boolean,
  object,
  optional,
  prettifyError,
  string,
  enum as zenum,
  ZodMiniType,
} from "zod/mini";
import type { OnlyRequire } from "../../includes/core/types/utility";
import type { StoredScript } from "../types";
import { CodePack } from "../core/codepack";
import { webScripts } from "./webScriptService";

export type ParseResult =
  | { success: true; scripts: StoredScript[] }
  | { success: false; errors: string[] };

const importedScriptsSchema: ZodMiniType<{
  compressed?: boolean;
  scripts: OnlyRequire<StoredScript, "code">[];
}> = object({
  compressed: optional(boolean()),
  scripts: array(
    object({
      // id: optional(string()),
      name: optional(string()),
      patterns: optional(array(string())),
      language: optional(zenum(["typescript", "javascript"])),
      prettify: optional(boolean()),
      when: optional(zenum(["start", "end", "idle"])),
      world: optional(zenum(["main", "isolated"])),
      csp: optional(zenum(["disable", "leave"])),
      code: string(),
    })
  ),
});

export class ImportService {
  /** Try to parse scripts from the given Blob. Return the parsed and normalized scripts on
   * success. Otherwise, return an array of errors. */
  async parseScriptsFromFile(file: Blob): Promise<ParseResult> {
    const importInitialError = "Error occurred trying to import scripts.";

    // try parsing json
    let jsonData: unknown;
    try {
      jsonData = JSON.parse(await file.text());
    } catch (err) {
      return {
        success: false,
        errors: [
          importInitialError,
          "Failed to parse JSON:",
          (err as Error).message,
        ],
      };
    }

    // try validating as script type
    const parsed = importedScriptsSchema.safeParse(jsonData);
    if (!parsed.success) {
      return {
        success: false,
        errors: [
          importInitialError,
          "Failed to interpret object as scripts:",
          ...prettifyError(parsed.error).split("\n"),
        ],
      };
    }
    const { scripts, compressed } = parsed.data;

    // if compressed, validate compression; otherwise apply compression
    if (compressed) {
      const errors = [
        importInitialError,
        "Some compressed scripts are corrupt:",
      ];
      let failed = false;

      for (const script of scripts) {
        try {
          CodePack.validate(script.code);
        } catch (err) {
          failed = true;
          errors.push(
            `${script.name} (${script.id}): `,
            (err as Error).message
          );
        }
      }

      if (failed) {
        return { success: false, errors };
      }
    } else {
      for (const script of scripts) {
        script.code = CodePack.pack(script.code);
      }
    }

    // normalize scripts
    return {
      success: true,
      scripts: scripts.map((script) => {
        const normalized = webScripts.normalizeScript(script);
        normalized.id = webScripts.generateId();
        return normalized;
      }),
    };
  }
}

export const importService = new ImportService();
