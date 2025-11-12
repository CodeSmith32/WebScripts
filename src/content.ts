import { messageService } from "./includes/services/messageService";
import { storageService } from "./includes/services/storageService";
import { patternService } from "./includes/services/patternService";

// content script live-tests which scripts match the current page and also catches page reloads.

// list of running scripts
const running: string[] = [];

/** Listen for messages asking for what scripts are currently running. */
messageService.listen("listRunning", () => running);

/** Find scripts that match the current page url and mark as running. */
const detectMatching = async () => {
  const scripts = await storageService.loadScripts();
  const url = location.href;

  for (const { id, match } of scripts) {
    if (patternService.match(url, match)) {
      running.push(id);
    }
  }

  await messageService.send("reloaded", {});
};

detectMatching().catch((err) => {
  // inject error as an html comment
  document.appendChild(document.createComment(err.message));
});
