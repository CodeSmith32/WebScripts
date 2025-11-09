import { useAsyncLoader } from "./core/useAsyncLoader";
import { messageService } from "../includes/services/messageService";
import { storageService } from "../includes/services/storageService";
import { tabService } from "../includes/services/tabService";
import { getUrlType } from "../includes/utils";

export const usePopupData = () => {
  return useAsyncLoader(async () => {
    // get current tab / load scripts
    const tab = await tabService.active();
    const allScripts = await storageService.loadScripts();

    // try to get currently running scripts
    let runningScripts: Record<string, true> = Object.create(null);
    try {
      const running = await messageService.sendToTab(
        tab,
        "listRunning",
        {},
        { frameId: 0 }
      );

      if (!running) {
        console.error("Failed to retrieve running scripts.");
      } else {
        runningScripts = running.reduce(
          (map, id) => ((map[id] = true), map),
          Object.create(null)
        );
      }
    } catch (_err) {
      // page doesn't support scripts, OR it loaded before extension was enabled
    }

    let urlType = getUrlType(tab?.url);
    let scriptable = urlType !== "internal" && urlType !== "notab";

    // try simple injection
    if (scriptable) {
      if (!(await messageService.send("testScriptable", { tabId: tab?.id }))) {
        scriptable = false;
        urlType = "unscriptable";
      }
    }

    return { allScripts, runningScripts, tab, urlType, scriptable };
  });
};
