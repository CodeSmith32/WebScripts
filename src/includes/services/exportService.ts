import { CodePack } from "../core/codepack";
import { parseValidJson } from "../core/prettifyJson";
import type { StoredScript, StoredSettings } from "../types";

export class ExportService {
  async exportScriptsToBlob({
    scripts = [],
    settings,
    compress = true,
  }: {
    scripts?: StoredScript[];
    settings?: Partial<StoredSettings>;
    compress?: boolean;
  } = {}) {
    let json: string = "";

    const timestamp = new Date().toISOString();

    // try parsing and merging settings json in with export data
    if (settings) {
      const expandJson = (key: keyof StoredSettings) => {
        if (settings![key] !== undefined) {
          settings![key] = parseValidJson(settings![key] as string);
        }
      };
      expandJson("editorKeybindingsJson");
      expandJson("editorSettingsJson");
      expandJson("prettierConfigJson");
      expandJson("typescriptConfigJson");

      if (!Object.keys(settings).length) {
        settings = undefined;
      }
    }

    if (compress) {
      // compression:
      const contents: Record<string, unknown> = {
        timestamp,
        compress: true,
        // settings
        settings,
        // extract only code; leave compressed
        scripts: scripts.map(({ code }) => ({ code })),
      };
      // generate minified json
      json = JSON.stringify(contents);
    } else {
      // no compression:
      const contents = {
        timestamp,
        // settings
        settings,
        // extract all script properties; decompress code
        scripts: scripts.map(({ id: _id, code, ...script }) => ({
          ...script,
          code: CodePack.unpack(code),
        })),
      };
      // generate prettified json
      json = JSON.stringify(contents, null, "  ");
    }

    // create blob from json
    return new Blob([json], { type: "application/json" });
  }
}

export const exportService = new ExportService();
