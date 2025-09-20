import { Chrome, type HttpHeader } from "./includes/utils";
import { webScripts } from "./includes/webscripts";

const match = async (url: string) => {
  const scripts = await webScripts.loadScripts();

  for (const { patterns } of scripts) {
    if (webScripts.match(url, patterns)) return true;
  }
  return false;
};

Chrome?.webRequest.onHeadersReceived.addListener(
  async (evt) => {
    if (!(await match(evt.url))) return {};

    // process response headers
    const headers: HttpHeader[] = evt.responseHeaders ?? [];
    const newHeaders: HttpHeader[] = [];

    for (const header of headers) {
      // tweak csp headers to allow for user scripts
      if (header.name === "content-security-policy" && header.value != null) {
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
