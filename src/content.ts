import { CodePack } from "./includes/core/codepack";
import { Chrome, injectScript } from "./includes/utils";
import { type MessageTypes, webScripts } from "./includes/webscripts";

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

/** Inject all scripts that match the current page url. */
const injectMatching = async () => {
  const scripts = await webScripts.loadScripts();
  const url = location.href;

  for (const { id, patterns, language, code, compiled } of scripts) {
    if (webScripts.match(url, patterns)) {
      running.push(id);

      const js = CodePack.unpack(
        language === "typescript" ? (compiled ?? "") : code
      );
      injectScript(js);
    }
  }

  try {
    await webScripts.sendMessage({ cmd: "reloaded" } satisfies MessageTypes);
  } catch (_err) {}
};

injectMatching().catch((err) => {
  // inject error as an html comment
  document.appendChild(document.createComment(err.message));
});
