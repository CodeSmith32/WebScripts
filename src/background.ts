import { Chrome } from "./includes/utils";
import { userScriptService } from "./includes/services/userScriptService";
import { storageService } from "./includes/services/storageService";
import { messageService } from "./includes/services/messageService";
import { patternService } from "./includes/services/patternService";
import type { StoredScript } from "./includes/types";
import { CodePack } from "./includes/core/codepack";
import { webScripts } from "./includes/services/webScriptService";
import { cspService } from "./includes/services/cspService";

// Background script handles CSP-disabling, re-compiles / re-syncs scripts after applying domain
// toggle requests from the popup, and other misc background tasks.

// keep track of most recent scripts
let localScripts: StoredScript[] = [];
const reloadScripts = async () => {
  localScripts = await storageService.loadScripts();
};
reloadScripts();

// listen for a switch toggle from the popup
messageService.listen("toggleDomain", async (message) => {
  // load most recent scripts
  await reloadScripts();

  // find script by id
  const ind = localScripts.findIndex((script) => message.id === script.id);
  let script = localScripts[ind];
  if (!script) return;

  // update script header / re-normalize script
  const code = CodePack.unpack(script.code);
  const header = webScripts.parseHeader(code);
  script.match = patternService.setDomainForPatterns(
    header.match ?? [],
    message.domain,
    message.enabled
  );
  const updatedCode = webScripts.updateHeaderInCode(code, script);
  script.code = CodePack.pack(updatedCode);
  script = webScripts.normalizeScript(script);

  // update script in background / userScripts / options page
  localScripts[ind] = script;

  await storageService.saveScripts(localScripts);
  await messageService.send("scriptsUpdated", { ids: [script.id] });
  await userScriptService.resynchronizeUserScript(script);
});

// listen for a scriptable tab test request
messageService.listen("testScriptable", async (message) => {
  return await userScriptService.testScriptableTab(message.tabId);
});

// listen for a request to resync all userscripts
messageService.listen("resyncAll", async () => {
  await userScriptService.resynchronizeUserScripts();

  // resynchronizeUserScripts reloads scripts; copy updated list:
  localScripts = storageService.latestScripts;
});

// on install, re-normalize script, and resynchronize userScripts with stored scripts
Chrome.runtime?.onInstalled.addListener(async () => {
  // re-normalize scripts, in case an update requires adjustments
  const scripts = await storageService.loadScripts();
  const normalized = scripts.map((script) =>
    webScripts.normalizeScript(script, true)
  );
  await storageService.saveScripts(normalized);

  // try notifying options page
  await messageService.send("scriptsUpdated", {
    ids: normalized.map(({ id }) => id),
  });

  // resynchronize all scripts
  await userScriptService.resynchronizeUserScripts();

  localScripts = storageService.latestScripts;
});

// test if url matches against any script patterns
const shouldDisableCSP = (url: string) => {
  for (const script of localScripts) {
    if (script.csp !== "disable") continue;

    if (patternService.match(url, script.match)) return true;
  }
  return false;
};

// remove CSP headers
Chrome.webNavigation?.onBeforeNavigate.addListener((evt) => {
  if (shouldDisableCSP(evt.url)) {
    // csp is disabled: add 'remove csp' rule
    cspService.disableCSPHeaders(evt.tabId);
  } else {
    // csp is not disabled: delete the 'remove csp' rule
    cspService.enableCSPHeaders();
  }
});
