import {
  arrayFromAsync,
  copy,
  getCommandLineArgs,
  importMetaDir,
  join,
  readDir,
  recurseDir,
  remove,
  type FileEntryDetails,
} from "./utils";

const args = getCommandLineArgs();
const position = args.get("pre") ? "pre" : args.get("post") ? "post" : null;

const rootDir = join(importMetaDir(import.meta.url), "..");

////////////////////////////////////////////////////////////////////
// Prebuild
////////////////////////////////////////////////////////////////////

const preBuild = async () => {
  // clear dist directory
  await remove(join(rootDir, "dist"));
};

////////////////////////////////////////////////////////////////////
// Postbuild
////////////////////////////////////////////////////////////////////

const postBuild = async () => {
  const distDir = join(rootDir, "dist");

  // copy manifest
  await copy(join(rootDir, "manifest.json"), join(distDir, "manifest.json"));

  // copy icons
  const images = await arrayFromAsync(
    recurseDir({
      dir: join(rootDir, "img"),
    })
  );
  for (const entry of images) {
    await copy(entry.path, join(distDir, "img", entry.fromBase));
  }

  // copy monaco editor workers
  await copy(
    join(rootDir, "src/assets/monaco.js"),
    join(distDir, "assets/monaco.js")
  );

  const languages = ["editor", "ts", "json"];

  const workerSourceDir = join(
    rootDir,
    "node_modules/monaco-editor/min/vs/assets"
  );
  const languageWorkerMap = new Map<string, FileEntryDetails>();
  for (const file of await readDir(workerSourceDir)) {
    const m = file.name.match(/^(\w+)\.worker\.[\da-f]+\.js$/);
    if (!m) continue;

    languageWorkerMap.set(m[1], file);
  }

  for (const lang of languages) {
    const file = languageWorkerMap.get(lang);
    if (file) {
      await copy(
        file.path,
        join(distDir, "monaco-workers", `${lang}.worker.js`)
      );
    } else {
      console.error(`Failed to load worker for language '${lang}'`);
    }
  }
};

////////////////////////////////////////////////////////////////////

switch (position) {
  case "pre":
    preBuild().catch((err) => console.error(err));
    break;
  case "post":
    postBuild().catch((err) => console.error(err));
    break;
  default:
    console.error(
      "Failed to execute command. Must specify either `--pre` or `--post`."
    );
}
