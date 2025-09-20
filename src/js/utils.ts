export type HttpHeader =
  | browser.webRequest._HttpHeaders
  | chrome.webRequest.HttpHeader;

export type SendMessageOptions =
  | browser.runtime._SendMessageOptions
  | chrome.runtime.MessageOptions;

/** The extension environment (whether for Chrome or Firefox). */
export const Chrome =
  typeof chrome !== "undefined"
    ? chrome
    : typeof browser !== "undefined"
    ? browser
    : null;

/** Inject code into the current webpage. */
export const injectScript = (code: string) => {
  const script = document.createElement("script");
  const el = document.head || document.documentElement;

  script.textContent = code;

  el.appendChild(script);
  el.removeChild(script);
};

/** Send a message to the extension runtime. */
export const sendMessage = async (
  message: unknown,
  options: SendMessageOptions = {}
) => {
  const method = Chrome?.runtime.sendMessage as (
    message: unknown,
    options?: SendMessageOptions
  ) => Promise<void>;

  return await method(message, options);
};

/** Get the domain:port part from a url. */
export const hostFromURL = (url: string) => {
  const host = url.match(/^https?:\/\/([^:\\\/]*)/);
  return host?.[1] ?? null;
};

export const rgxHeader = /^\s*(\/\/\/[^\r\n]*(?:\r?\n\/\/\/[^\r\n]*)+)/;
export const rgxParam = /^\/+([\w\s]+):\s*(.*)$/;
