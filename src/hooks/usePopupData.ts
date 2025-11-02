import { useAsyncLoader } from "./core/useAsyncLoader";
import { messageService } from "../includes/services/messageService";
import { storageService } from "../includes/services/storageService";
import { tabService } from "../includes/services/tabService";

export const usePopupData = () => {
  return useAsyncLoader(async () => {
    const tab = await tabService.active();
    const allScripts = await storageService.loadScripts();

    let runningScripts: string[] | null = null;
    try {
      const running = await messageService.sendToTab(
        tab,
        "listRunning",
        {},
        { frameId: 0 }
      );
      if (!running) throw new Error("Failed to retrieve running scripts.");
      runningScripts = running;
    } catch (_err) {}

    return { allScripts, runningScripts };
  });
};
