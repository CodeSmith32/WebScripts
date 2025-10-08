export type HttpHeader = Omit<
  browser.webRequest._HttpHeaders & chrome.webRequest.HttpHeader,
  "binaryValue"
>;

export type SendMessageOptions = browser.runtime._SendMessageOptions &
  chrome.runtime.MessageOptions;

export type SendTabMessageOptions = browser.tabs._SendMessageOptions &
  chrome.tabs.MessageSendOptions;

export type Tab = browser.tabs.Tab | chrome.tabs.Tab;

/** The extension environment (whether for Chrome or Firefox). */
export const Chrome = typeof browser !== "undefined" ? browser : chrome;

/** The browser being used, for switching on browser-specific logic ("chrome" or "firefox"). */
export const browserName =
  typeof browser !== "undefined" ? "firefox" : "chrome";

/** Inject code into the current webpage. */
export const injectScript = (code: string) => {
  const script = document.createElement("script");
  const el = document.head || document.documentElement;

  script.textContent = code;

  el.appendChild(script);
  el.removeChild(script);
};

/** Get the domain:port part from a url. */
export const hostFromURL = (url: string) => {
  const host = url.match(/^https?:\/\/([^:\\\/]*)/);
  return host?.[1] ?? null;
};

/** Get the currently active browser tab. */
export const getActiveTab = async (): Promise<Tab | null> => {
  const active = await Chrome.tabs?.query({
    active: true,
    currentWindow: true,
  });
  return active?.[0] ?? null;
};

/** Send a message to the content script registered in the given tab. */
export const tabSendMessage = async <T>(
  tab: Tab | null | undefined,
  message: unknown,
  options: SendTabMessageOptions = {}
): Promise<T | undefined> => {
  if (!tab?.id) return undefined;

  return await (
    Chrome.tabs.sendMessage as (
      tabId: number,
      message: unknown,
      options: SendTabMessageOptions
    ) => Promise<T>
  )(tab.id, message, options);
};

/** Return a promise that resolves after the given number of milliseconds. */
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Return -1, 1, or 0 based on the lexicographical ordering of the two arguments. */
export const lexSort = <T extends string | number>(a: T, b: T) =>
  a < b ? -1 : a > b ? 1 : 0;

export const randStrFactory = (alphabet: string) => {
  const alphaLen = alphabet.length;

  return (length: number) => {
    let out = "";
    for (let i = 0; i < length; i++)
      out += alphabet[(Math.random() * alphaLen) | 0];
    return out;
  };
};

export const randAlphaNum = randStrFactory(
  "abcdefghijklmnopqrstuvwxyz0123456789"
);
