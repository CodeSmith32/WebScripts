import {
  any,
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
import type { StoredScript, StoredSettings } from "../types";
import { CodePack } from "../core/codepack";
import { webScripts } from "./webScriptService";
import { stringifyValidJson } from "../core/prettifyJson";

export type ParseResult =
  | {
      success: true;
      settings: Partial<StoredSettings>;
      scripts: StoredScript[];
    }
  | { success: false; errors: string[] };

const importSchema: ZodMiniType<{
  compressed?: boolean;
  settings?: Partial<StoredSettings>;
  scripts?: OnlyRequire<StoredScript, "code">[];
}> = object({
  timestamp: optional(string()),
  compressed: optional(boolean()),
  settings: optional(
    object({
      defaultLanguage: optional(zenum(["typescript", "javascript"])),
      defaultLocked: optional(boolean()),
      defaultPrettify: optional(boolean()),
      defaultWhen: optional(zenum(["start", "end", "idle"])),
      defaultWorld: optional(zenum(["main", "isolated"])),
      editorKeybindingsJson: optional(any()),
      editorSettingsJson: optional(any()),
      prettierConfigJson: optional(any()),
      typescriptConfigJson: optional(any()),
    } satisfies Record<keyof StoredSettings, ZodMiniType>)
  ),
  scripts: optional(
    array(
      object({
        // id: optional(string()),
        name: optional(string()),
        patterns: optional(array(string())),
        language: optional(zenum(["typescript", "javascript"])),
        prettify: optional(boolean()),
        locked: optional(boolean()),
        when: optional(zenum(["start", "end", "idle"])),
        world: optional(zenum(["main", "isolated"])),
        csp: optional(zenum(["disable", "leave"])),
        code: string(),
      } satisfies Record<Exclude<keyof StoredScript, "id">, ZodMiniType>)
    )
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
    const parsed = importSchema.safeParse(jsonData);
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
    const { compressed, settings, scripts } = parsed.data;

    // reconstitute settings: convert json objects back to strings
    if (settings) {
      if (settings.editorKeybindingsJson !== undefined) {
        settings.editorKeybindingsJson = stringifyValidJson(
          settings.editorKeybindingsJson
        );
      }
      if (settings.editorSettingsJson !== undefined) {
        settings.editorSettingsJson = stringifyValidJson(
          settings.editorSettingsJson
        );
      }
      if (settings.prettierConfigJson !== undefined) {
        settings.prettierConfigJson = stringifyValidJson(
          settings.prettierConfigJson
        );
      }
      if (settings.typescriptConfigJson !== undefined) {
        settings.typescriptConfigJson = stringifyValidJson(
          settings.typescriptConfigJson
        );
      }
    }

    // if compressed, validate compression; otherwise apply compression
    if (scripts) {
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
    }

    // normalize scripts
    return {
      success: true,
      settings: settings ?? {},
      scripts:
        scripts?.map((script) => {
          const normalized = webScripts.normalizeScript(script);
          normalized.id = webScripts.generateId();
          return normalized;
        }) ?? [],
    };
  }
}

export const importService = new ImportService();
