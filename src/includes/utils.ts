export type HttpHeader =
  | browser.webRequest._HttpHeaders
  | chrome.webRequest.HttpHeader;

export type SendMessageOptions =
  | browser.runtime._SendMessageOptions
  | chrome.runtime.MessageOptions;

export type Tab = browser.tabs.Tab | chrome.tabs.Tab;

/** The extension environment (whether for Chrome or Firefox). */
export const Chrome =
  typeof chrome !== "undefined" && chrome.tabs
    ? chrome
    : typeof browser !== "undefined" && browser.tabs
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
export const sendMessage = async <T>(
  message: unknown,
  options: SendMessageOptions = {}
): Promise<T | undefined> => {
  const method = Chrome?.runtime.sendMessage as
    | ((message: unknown, options?: SendMessageOptions) => Promise<T>)
    | undefined;

  return await method?.(message, options);
};

/** Get the domain:port part from a url. */
export const hostFromURL = (url: string) => {
  const host = url.match(/^https?:\/\/([^:\\\/]*)/);
  return host?.[1] ?? null;
};

/** Get the currently active browser tab. */
export const getActiveTab = async (): Promise<Tab | null> => {
  const active = await Chrome?.tabs?.query({
    active: true,
    currentWindow: true,
  });
  return active?.[0] ?? null;
};

/** Send a message to the content script registered in the given tab. */
export const tabSendMessage = async <T>(
  tab: Tab | null | undefined,
  message: unknown,
  options: SendMessageOptions = {}
): Promise<T | undefined> => {
  if (!tab?.id) return undefined;
  const method = Chrome?.tabs.sendMessage as
    | ((
        tabId: number,
        message: unknown,
        options: SendMessageOptions
      ) => Promise<T>)
    | undefined;

  return await method?.(tab.id, message, options);
};

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
