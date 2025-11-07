import { useAsyncLoader } from "./core/useAsyncLoader";
import { messageService } from "../includes/services/messageService";
import { storageService } from "../includes/services/storageService";
import { tabService } from "../includes/services/tabService";

export const usePopupData = () => {
  return useAsyncLoader(async () => {
    // get current tab / load scripts
    const tab = await tabService.active();
    const allScripts = await storageService.loadScripts();

    // try to get currently running scripts
    let runningScripts: string[] | null = null;
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
        runningScripts = running;
      }
    } catch (_err) {}

    return { allScripts, runningScripts, tab };
  });
};
