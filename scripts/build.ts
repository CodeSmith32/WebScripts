import { copy, importMetaDir, join } from "./utils";

const rootDir = join(importMetaDir(import.meta.url), "..");

const postBuild = async () => {
  // copy manifest
  await copy(
    join(rootDir, "manifest.json"),
    join(rootDir, "dist/manifest.json")
  );
};

postBuild().catch((err) => console.error(err));
