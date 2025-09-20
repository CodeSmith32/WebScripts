import { getActiveTab, tabSendMessage } from "../includes/utils";
import { webScripts } from "../includes/webscripts";
import { useAsyncLoader } from "./useAsyncLoader";

export const usePopupData = () => {
  return useAsyncLoader(async () => {
    const tab = await getActiveTab();

    const allScripts = await webScripts.loadScripts();
    const runningScripts = await tabSendMessage<string[]>(tab, {
      cmd: "listRunning",
    });

    return { allScripts, runningScripts };
  });
};
