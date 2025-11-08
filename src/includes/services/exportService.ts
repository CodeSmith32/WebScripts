import { CodePack } from "../core/codepack";
import type { StoredScript } from "../types";

export class ExportService {
  async exportScriptsToBlob({
    scripts = [],
    compress = true,
  }: { scripts?: StoredScript[]; compress?: boolean } = {}) {
    let json: string = "";

    if (compress) {
      // compression:
      const contents = {
        compress: true,
        // extract only code; leave compressed
        scripts: scripts.map(({ code }) => ({ code })),
      };
      // generate minified json
      json = JSON.stringify(contents);
    } else {
      // no compression:
      const contents = {
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
