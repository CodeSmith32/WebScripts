import { Chrome } from "./includes/utils";
import {
  type MessageTypes,
  webScripts,
} from "./includes/services/webScriptService";

// list of running scripts
const running: string[] = [];

/** Listen for messages asking for what scripts are currently running. */
Chrome.runtime?.onMessage.addListener(
  (data: MessageTypes | null | undefined, _sender, reply) => {
    switch (data?.cmd) {
      case "listRunning":
        reply(running);
        break;
    }
  }
);

/** Find scripts that match the current page url and mark as running. */
const detectMatching = async () => {
  const scripts = await webScripts.loadScripts();
  const url = location.href;

  for (const { id, patterns } of scripts) {
    if (webScripts.match(url, patterns)) {
      running.push(id);
    }
  }

  try {
    await webScripts.sendMessage({ cmd: "reloaded" } satisfies MessageTypes);
  } catch (_err) {}
};

detectMatching().catch((err) => {
  // inject error as an html comment
  document.appendChild(document.createComment(err.message));
});
