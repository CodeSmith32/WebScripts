import { browserName, Chrome, type HttpHeader } from "./includes/utils";
import {
  webScripts,
  type MessageTypes,
  type StoredScript,
} from "./includes/webscripts";

let scripts: StoredScript[] = [];

// reload scripts
const reloadScripts = async () => {
  scripts = await webScripts.loadScripts();
};
reloadScripts();

// listen for script updates and reload when changes occur
Chrome.runtime.onMessage.addListener((message: MessageTypes) => {
  switch (message.cmd) {
    case "updateBackgroundScripts":
      reloadScripts();
      break;
  }
});

// test if url matches against any script patterns
const match = (url: string) => {
  for (const { patterns } of scripts) {
    if (webScripts.match(url, patterns)) return true;
  }
  return false;
};

if (browserName === "firefox") {
  // safely tweak CSP on Firefox
  Chrome.webRequest.onHeadersReceived.addListener(
    (evt) => {
      if (!match(evt.url)) return {};

      // process response headers
      const headers: HttpHeader[] = evt.responseHeaders ?? [];
      const newHeaders: HttpHeader[] = [];

      for (const header of headers) {
        // tweak csp headers to allow for user scripts
        if (
          /^(x-)?content-security-policy$/i.test(header.name) &&
          header.value != null
        ) {
          const newValue = webScripts.processCSPHeader(header.value);
          if (!newValue) continue;

          header.value = newValue;
          newHeaders.push(header);
          continue;
        }

        newHeaders.push(header);
      }

      return { responseHeaders: newHeaders };
    },
    {
      urls: ["*://*/*", "file:///*"],
      types: ["main_frame", "xmlhttprequest"], // xmlhttprequest applies to serviceworkers
    },
    ["responseHeaders", "blocking"]
  );
} else if (browserName === "chrome") {
  // Remove CSP headers on Chrome
  Chrome.webNavigation.onBeforeNavigate.addListener((evt) => {
    if (!match(evt.url)) return;

    Chrome.declarativeNetRequest.updateSessionRules({
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
}
