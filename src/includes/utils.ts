/** The extension environment (whether for Chrome or Firefox). */
export const Chrome =
  typeof browser !== "undefined"
    ? (browser as Partial<typeof browser>)
    : (chrome as Partial<typeof chrome>);

/** The browser being used, for switching on browser-specific logic ("chrome" or "firefox"). */
export const browserName =
  typeof browser !== "undefined" ? "firefox" : "chrome";

/** Get browser version. */
export const chromiumVersion = Number(
  navigator.userAgent.match(/Chrom(?:e|ium)\/(\d+)/)?.[1] ?? NaN
);

/** Get the hostname from a url, i.e., the domain name without the port. */
export const hostnameFromURL = (url: string) => {
  const host = url.match(/^https?:\/\/([^:\\\/]*)/);
  return host?.[1] ?? null;
};

/** Test if the given url is a file url. */
export const isFileURL = (url: string) => {
  return /^file:\/\/\//i.test(url);
};

export type URLType = "notab" | "normal" | "file" | "internal" | "unscriptable";

/** Get the type of url passed. */
export const getUrlType = (url: string | null | undefined): URLType => {
  if (!url) return "notab";
  if (isFileURL(url)) return "file";
  if (hostnameFromURL(url)) return "normal";
  return "internal";
};

/** Return a promise that resolves after the given number of milliseconds. */
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Return -1, 1, or 0 based on the lexicographical ordering of the two arguments. */
export const lexSort = <T extends string | number>(a: T, b: T) =>
  a < b ? -1 : a > b ? 1 : 0;

/** Generate a factory that creates strings made of random characters from the given
 * alphabet. */
export const randStrFactory = (alphabet: string) => {
  const alphaLen = alphabet.length;

  return (length: number) => {
    let out = "";
    for (let i = 0; i < length; i++)
      out += alphabet[(Math.random() * alphaLen) | 0];
    return out;
  };
};

/** Generate a random string made of lowercase letters and numbers. */
export const randAlphaNum = randStrFactory(
  "abcdefghijklmnopqrstuvwxyz0123456789"
);
