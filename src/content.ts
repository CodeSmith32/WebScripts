import { Chrome, injectScript, sendMessage } from "./js/utils";
import { MessageTypes, webScripts } from "./js/webscripts";

// list of running scripts
const running: string[] = [];

/** Listen for messages asking for what scripts are currently running. */
Chrome?.runtime.onMessage.addListener(
  (data: MessageTypes | null | undefined, _sender, reply) => {
    switch (data?.cmd) {
      case "listRunning":
        reply(running);
        break;
    }
  }
);

/** Inject all scripts that match the current page url. */
const injectMatching = async () => {
  const scripts = await webScripts.loadScripts();
  const url = location.href;

  for (const { id, patterns, code } of scripts) {
    if (webScripts.match(url, patterns)) {
      running.push(id);
      injectScript(code);
    }
  }

  try {
    await sendMessage({ cmd: "reloaded" });
  } catch (_err) {}
};

injectMatching().catch((err) => {
  // inject error as an html comment
  document.appendChild(document.createComment(err.message));
});
