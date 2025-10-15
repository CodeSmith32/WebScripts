import type { PluginOption } from "vite";
import {
  importMetaDir,
  join,
  readDir,
  readFile,
  type FileEntryDetails,
} from "./utils";

const rootDir = join(importMetaDir(import.meta.url), "..");

/** Get map of Monaco editor worker scripts under internal /assets.
 *
 * Maps prefix name ("js", "css", "ts", etc.) to FileEntryDetails for the script file. */
export const getWorkerFiles = async () => {
  // get absolute path to internal /assets folder
  const workerSourceDir = join(
    rootDir,
    "node_modules/monaco-editor/min/vs/assets"
  );

  // map workers by key
  const languageWorkerMap = new Map<string, FileEntryDetails>();
  for (const file of await readDir(workerSourceDir)) {
    const m = file.name.match(/^(\w+)\.worker\b.*\.js$/);
    if (m) languageWorkerMap.set(m[1], file);
  }

  // return map
  return languageWorkerMap;
};

/** A Vite plugin for redirecting dev server "./monaco-workers/*.worker.js" requests to the
 * actual script under Monaco's internal worker /assets directory. */
export const monacoEditorVitePlugin = async (): Promise<PluginOption> => {
  const workerMap = await getWorkerFiles();

  return {
    name: "monaco-editor-vite-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // match url
        const match = req.url?.match(/^\/monaco-workers\/(\w+)\.worker\.js\b/);
        if (!match) return next();

        // find mapped script
        const worker = workerMap.get(match[1]);
        if (!worker) return next();

        // respond with worker script contents
        res.setHeader("content-type", "application/javascript");
        const code = await readFile(worker.path);
        return res.end(code);
      });
    },
  };
};
