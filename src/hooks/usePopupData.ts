import { getActiveTab, tabSendMessage } from "../includes/utils";
import { webScripts } from "../includes/services/webScriptService";
import { useAsyncLoader } from "./core/useAsyncLoader";

export const usePopupData = () => {
  return useAsyncLoader(async () => {
    const tab = await getActiveTab();
    const allScripts = await webScripts.loadScripts();

    let runningScripts: string[] | null = null;
    try {
      const running = await tabSendMessage<string[]>(
        tab,
        { cmd: "listRunning" },
        { frameId: 0 }
      );
      if (!running) throw new Error("Failed to retrieve running scripts.");
      runningScripts = running;
    } catch (_err) {}

    return { allScripts, runningScripts };
  });
};
