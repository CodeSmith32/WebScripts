import { messageService } from "./includes/services/messageService";
import { storageService } from "./includes/services/storageService";
import { patternService } from "./includes/services/patternService";

// list of running scripts
const running: string[] = [];

/** Listen for messages asking for what scripts are currently running. */
messageService.listen("listRunning", () => running);

/** Find scripts that match the current page url and mark as running. */
const detectMatching = async () => {
  const scripts = await storageService.loadScripts();
  const url = location.href;

  for (const { id, patterns } of scripts) {
    if (patternService.match(url, patterns)) {
      running.push(id);
    }
  }

  try {
    await messageService.send("reloaded", {});
  } catch (_err) {}
};

detectMatching().catch((err) => {
  // inject error as an html comment
  document.appendChild(document.createComment(err.message));
});
