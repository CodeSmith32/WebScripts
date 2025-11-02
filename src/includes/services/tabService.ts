import { Chrome } from "../utils";

/** Type for a browser tab. */
export type Tab = browser.tabs.Tab | chrome.tabs.Tab;

export class TabService {
  /** Get the currently active browser tab. */
  async active(): Promise<Tab | null> {
    const active = await Chrome.tabs?.query({
      active: true,
      currentWindow: true,
    });
    return active?.[0] ?? null;
  }
}

export const tabService = new TabService();
