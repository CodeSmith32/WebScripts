import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, promises as fs } from "node:fs";
import { promises as readline } from "node:readline";

/** Convert import.meta.url to __dirname. */
export const importMetaDir = (dir: string) => path.dirname(fileURLToPath(dir));

/** Is the environment Windows */
export const isWindows = /^win/.test(process.platform);

/** Join path parts together. Coerces to unix-style paths (uses / instead of \). */
export function join(...parts: string[]) {
  return path.join(...parts).replace(/\\+/g, "/");
}

/** Strip leading and trailing slashes from path.
 * Coerces to unix-style paths (uses / instead of \). */
export function stripSlashes(path: string) {
  return path.replace(/^[\\/]+|[\\/]+$/g, "").replace(/[\\/]+/g, "/");
}

/** Get the extension from a file. */
export function extractExt(path: string) {
  return path.match(/\.([^\\/.]+)$/)?.[1] ?? "";
}

/** Remove extension from path. */
export function stripExt(path: string) {
  return path.replace(/\.\w+$/, "");
}

/** Get stats from file at the given path, or null if no file exists. */
export async function fileStat(file: string) {
  // get details of file
  try {
    return await fs.stat(file);
  } catch (_e) {
    return null;
  }
}

/** Read the file at the given path as a string. */
export async function readFile(file: string) {
  const stat = await fileStat(file);
  if (!stat) throw new Error(`Cannot read inexistent file: ${file}`);
  if (stat.isDirectory()) throw new Error(`Cannot read directory: ${file}`);

  return await fs.readFile(file, { encoding: "utf-8" });
}

/** Write to a file the contents given as a string. If the contents have not changed, no action
 * is taken. This helps prevent watch-mode actions from re-running indefinitely. */
export async function writeFile(
  file: string,
  contents: string,
  binary: boolean = false
) {
  // if file path has newlines, the path / contents arguments were likely switched
  if (/[\r\n]/.test(file)) {
    throw new Error(
      "writeFile: Invalid file path. Arguments may be in the wrong order."
    );
  }
  if (existsSync(file)) {
    const current = await readFile(file);
    if (contents === current) return;

    if (!binary) {
      // if only line endings have changed, disregard
      if (contents.replace(/\r/g, "") === current.replace(/\r/g, "")) return;

      // detect which line ending is more common, and update contents to use the same ending
      const crlf = current.match(/\r\n/g)?.length ?? 0;
      const lf = (current.match(/\n/g)?.length ?? 0) - crlf;
      contents = contents.replace(/\r?\n/g, crlf > lf ? "\r\n" : "\n");
    }
  }
  await fs.writeFile(file, contents, { encoding: "utf-8" });
}

/** Read the json file at the given path as a json object. If parsing fails, `null` is
 * returned. */
export async function readJson(file: string) {
  const contents = await readFile(file);
  try {
    return JSON.parse(contents);
  } catch (_err) {
    return null;
  }
}

/** Write to a json file the contents given as json. If the contents have not changed, no action
 * is taken. */
export async function writeJson(file: string, json: object) {
  const contents = JSON.stringify(json, null, "  ");
  await writeFile(file, contents);
}

/** Execute the file at the given path as a module and return its exports. */
export async function runFile(file: string) {
  return await import("file://" + file);
}

/** An entry returned by recursively iterating files in a directory. */
export interface FileEntryDetails {
  /** The type of entry. e.g., `"file"` */
  type: "file" | "dir";
  /** The full path to the entry. e.g.,
   * `"C:/Users/John Doe/Documents/projects/MyProject/apps/api/src/controllers/index.ts"` */
  path: string;
  /** The file's extension (no dot). e.g., `"ts"` */
  extension: string;
  /** A relative path to the file (with extension). Directly starts from the base directory with
   * no path prefix. e.g., `"controllers/index.ts"` */
  fromBase: string;
  /** A relative path to import this entry (without extension). Prefixes the path with `"./"` to
   * enable it to work as an import. e.g., `"./controllers/index"` */
  importPath: string;
  /** The filename (with extension). e.g., `"index.ts"` */
  name: string;
}

/** Read entry names within a directory as a FileEntryDetails[]. */
export async function readDir(dir: string) {
  const entries: FileEntryDetails[] = [];

  for (const name of await fs.readdir(dir)) {
    const path = join(dir, name);
    const stat = await fs.stat(path);
    const type = stat.isDirectory() ? "dir" : stat.isFile() ? "file" : null;
    if (!type) continue;

    const extension = extractExt(name);
    const fromBase = name;
    const importPath = "./" + (type === "dir" ? fromBase : stripExt(fromBase));

    entries.push({ type, path, extension, fromBase, importPath, name });
  }
  return entries;
}

/** Async generator for recursively iterating the contents of a directory.
 *
 * Yields objects:
 *
 * ```
 * {
 *   type: "file" | "dir", // the type of entry
 *   path: string,         // the full path to the entry
 *   extension: string,    // the file's extension (no dot)
 *   fromBase: string,     // a relative path to the file (with extension)
 *   importPath: string,   // a relative path to import this entry (without extension)
 *   name: string,         // the filename (with extension)
 * }
 * ```
 *
 * Use argument `baseDir` as a prefix for generating relative paths. `fromBase` includes this
 * path as a prefix, and `importPath` includes this path additionally prefixed with `./`.
 *
 * e.g. When iterating directory, `dir = "/some/path/to"`
 *
 * with `baseDir = "/path/to"`,
 *
 * and encountering file, `/some/path/to/file.ext`,
 *
 * the yielded object would look like,
 * ```
 * {
 *   type: "file",
 *   path: "/some/path/to/file.ext",
 *   extension: "ext",
 *   fromBase: "path/to/file.ext",
 *   importPath: "./path/to/file",
 *   name: "file.ext",
 * }
 * ```
 */
export async function* recurseDir({
  dir,
  baseDir = "",
}: {
  /** The full path to the directory to recursively iterate. */
  dir: string;
  /** Optional. The base directory used as a prefix for generating relative paths. */
  baseDir?: string;
}): AsyncGenerator<FileEntryDetails, void, boolean | undefined> {
  baseDir = stripSlashes(baseDir);

  for (const name of await fs.readdir(dir)) {
    const path = join(dir, name);
    const stat = await fs.stat(path);
    const type = stat.isDirectory() ? "dir" : stat.isFile() ? "file" : null;
    const extension = extractExt(name);
    const fromBase = join(baseDir, name);
    const importPath = "./" + (type === "dir" ? fromBase : stripExt(fromBase));

    if (type) {
      const skip = yield { type, path, extension, fromBase, importPath, name };
      if (skip) continue;
    }

    if (type === "dir") {
      yield* recurseDir({ dir: path, baseDir: fromBase });
    }
  }
}

/** Recursively iterate the sub-directories of the specified root, matching files by extension
 * or test, and return an array of matched files. */
export async function* recurseMatching({
  dir,
  baseDir,
  extensions,
  test,
  testDir,
}: {
  /** The root directory to iterate from. */
  dir: string;
  /** Optional. The base directory used as a prefix for generating relative paths. */
  baseDir?: string;
  /** Optional. Extensions to match. Either a string array, or a RegExp.
   * (Strings are case-insensitive. No dot.) */
  extensions?: string[] | RegExp;
  /** Optional. A test to run for file entries. If this function returns false for an entry,
   * the entry will be skipped. */
  test?: (entry: FileEntryDetails) => boolean | Promise<boolean>;
  /** Optional. A test to run for directory entries. If this function returns false for a
   * directory, the entire directory, and all its contents, will be skipped. */
  testDir?: (entry: FileEntryDetails) => boolean | Promise<boolean>;
}): AsyncGenerator<FileEntryDetails> {
  if (Array.isArray(extensions)) {
    extensions = extensions.map((ext) => ext.toLowerCase());
  }

  const extMatches =
    extensions instanceof RegExp
      ? (ext: string) => extensions.test(ext)
      : Array.isArray(extensions)
      ? (ext: string) => extensions.includes(ext.toLowerCase())
      : () => true;

  const generator = recurseDir({ dir, baseDir });
  let skip: boolean = false;

  while (true) {
    const value = await generator.next(skip);
    skip = false;
    if (value.done) break;

    const entry = value.value;

    if (entry.type === "dir") {
      if (testDir && !testDir(entry)) skip = true;
      continue;
    }
    if (!extMatches(entry.extension)) continue;
    if (test && !test(entry)) continue;

    yield entry;
  }
}

/** Splat the outputs of an AsyncGenerator into an array. */
export const arrayFromAsync = async <T>(generator: AsyncGenerator<T>) => {
  const values: T[] = [];
  for await (const value of generator) values.push(value);
  return values;
};

const rawShell = async ({
  cmd,
  args = [],
  cwd,
  env,
}: {
  cmd: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}) => {
  try {
    const proc = spawn(cmd, args, { cwd, env: { ...process.env, ...env } });

    let stdOut = "";
    let errOut = "";
    proc.stdout.on("data", (data) => (stdOut += data.toString("utf8")));
    proc.stderr.on("data", (data) => (errOut += data.toString("utf8")));

    await new Promise((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });

    return [stdOut, errOut];
  } catch (err) {
    console.log({ cmd, args, cwd });
    throw err;
  }
};

/** Execute the shell command with the given arguments in the given working directory. */
export const shell = async ({
  cmd,
  args = [],
  cwd,
  env,
}: {
  cmd: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}) => {
  // if on windows, and cmd is not a filepath, try to find the command location
  if (isWindows && !/^[a-z]:[\\/]/i.test(cmd)) {
    // use "where" to find command path
    const [where] = await rawShell({
      cmd: "where",
      args: [cmd],
      cwd,
    });

    // find valid "Drive:/..." lines
    const lines = where
      .split(/\r?\n/)
      .filter((v) => !!v && /^[a-z]:[\\/]/i.test(v));
    // try to find .cmd / .exe / .bat files
    const bash = lines.filter((v) => /\.(cmd|exe|bat)$/i.test(v));
    // use any .cmd / .exe / .bat files, or fall back to first command in list
    cmd = bash.length ? bash[0] : lines.length ? lines[0] : cmd;
    cmd = path.basename(cmd);
  }

  return await rawShell({ cmd, args, cwd, env });
};

/** Copy files from one folder to another. */
export const copy = async (
  src: string,
  dest: string,
  overwrite: boolean = false
) => {
  if (!existsSync(src)) {
    console.warn("Nothing to copy. Path does not exist: " + src);
    return;
  }

  await fs.cp(src, dest, {
    recursive: true,
    errorOnExist: !overwrite,
    force: overwrite,
  });
};

/** Delete a directory recursively. */
export const remove = async (dir: string) => {
  if (!existsSync(dir)) return;

  await fs.rm(dir, {
    recursive: true,
  });
};

/** Move all files from one directory to another location. */
export const move = async (
  src: string,
  dest: string,
  overwrite: boolean = false
) => {
  if (!existsSync(src)) {
    console.warn("Nothing to move. Path does not exist: " + src);
    return;
  }

  await copy(src, dest, overwrite);
  await remove(src);
};

export const deleteFile = async (file: string) => {
  if (!existsSync(file)) return;

  await fs.unlink(file);
};

/** Compress files to a zip. */
export const compress = async (directory: string, output: string) => {
  const inputName = path.basename(directory);
  const cwd = join(directory, "..");

  if (isWindows) {
    return await shell({
      cmd: "tar",
      args: ["-acf", output, inputName],
      cwd,
    });
  } else {
    return await shell({
      cmd: "zip",
      args: [output, inputName],
      cwd,
    });
  }
};

let inputItf: readline.Interface | null = null;

/** Read user input from terminal. */
export const readUserInput = async (log: string = ""): Promise<string> => {
  inputItf ??= readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return await inputItf.question(log);
};
