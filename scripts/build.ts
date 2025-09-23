import {
  arrayFromAsync,
  copy,
  getCommandLineArgs,
  importMetaDir,
  join,
  recurseDir,
  remove,
} from "./utils";

const args = getCommandLineArgs();
const position = args.get("pre") ? "pre" : args.get("post") ? "post" : null;

const rootDir = join(importMetaDir(import.meta.url), "..");

const preBuild = async () => {
  // clear dist directory
  await remove(join(rootDir, "dist"));
};

const postBuild = async () => {
  // copy manifest
  await copy(
    join(rootDir, "manifest.json"),
    join(rootDir, "dist/manifest.json")
  );

  // copy icons
  const images = await arrayFromAsync(
    recurseDir({
      dir: join(rootDir, "img"),
    })
  );
  for (const entry of images) {
    await copy(entry.path, join(rootDir, "dist/img", entry.fromBase));
  }
};

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
