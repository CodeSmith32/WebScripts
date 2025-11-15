/** Checks the input string and returns true if it is a valid url. Otherwise returns false. */
export const isValidURL = (maybeUrl?: string): boolean => {
  if (!maybeUrl) return false;

  let parsedUrl;
  try {
    parsedUrl = new URL(maybeUrl);
  } catch (_err) {
    return false;
  }
  if (parsedUrl.href === maybeUrl) return true;
  if (parsedUrl.href.replace(/\/$/, "") === maybeUrl) return true;
  return false;
};
