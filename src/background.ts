import { Chrome } from "./includes/utils";
import { userScriptService } from "./includes/services/userScriptService";
import { storageService } from "./includes/services/storageService";
import { messageService } from "./includes/services/messageService";
import { patternService } from "./includes/services/patternService";
import type { StoredScript } from "./includes/types";

let scripts: StoredScript[] = [];

// reload scripts
const reloadScripts = async () => {
  scripts = await storageService.loadScripts();
};
reloadScripts();

// listen for script updates and reload when changes occur
messageService.listen("updateBackgroundScripts", () => reloadScripts());

// on install, resynchronize userScripts with stored scripts
Chrome.runtime?.onInstalled.addListener(async () => {
  await userScriptService.resynchronizeUserScripts();
});

// test if url matches against any script patterns
const shouldDisableCSP = (url: string) => {
  for (const { csp, patterns } of scripts) {
    if (csp !== "disable") continue;

    if (patternService.match(url, patterns)) return true;
  }
  return false;
};

// Remove CSP headers on Chrome
Chrome.webNavigation?.onBeforeNavigate.addListener((evt) => {
  if (!shouldDisableCSP(evt.url)) return;

  Chrome.declarativeNetRequest?.updateSessionRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "content-security-policy", operation: "remove" },
            { header: "x-content-security-policy", operation: "remove" },
          ],
        },
        condition: {
          resourceTypes: ["main_frame"],
          tabIds: [evt.tabId],
        },
      },
    ],
  });
});
