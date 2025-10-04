import { webScripts, type StoredScript } from "../includes/webscripts";
import { useAsyncLoader } from "./useAsyncLoader";

export const useOptionsData = () => {
  return useAsyncLoader(async () => {
    let scripts: StoredScript[] = [];

    try {
      scripts = await webScripts.loadScripts();
    } catch (_err) {}

    if (!scripts.length) {
      scripts.push({
        id: "example",
        name: "Example Script",
        code: 'const x: string = "hello world";\nconsole.log(x);',
        patterns: ["/.*/"],
      });
    }

    return { scripts };
  });
};
