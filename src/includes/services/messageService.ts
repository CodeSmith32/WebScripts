import type { EmptyObject } from "../core/types/basic";
import { wrapAsyncMerge } from "../core/wrapAsync";
import { Chrome } from "../utils";
import type { Tab } from "./tabService";

/** Type for a message sent via the runtime extension library. */
export type SendMessageOptions = browser.runtime._SendMessageOptions &
  chrome.runtime.MessageOptions;

/** Type for a message sent to a specific tab. */
export type SendTabMessageOptions = browser.tabs._SendMessageOptions &
  chrome.tabs.MessageSendOptions;

/** Type for a sender */
export type MessageSender =
  | browser.runtime.MessageSender
  | chrome.runtime.MessageSender;

/** Message table entry for coherence. */
export type MessageTableEntry<Send extends object, Reply> = {
  send: Send;
  reply: Reply;
};

/****************************************************** */
/** Messages that can be sent, the sent and reply data. */
export interface MessageTable {
  /** List all scripts running on a tab. */
  listRunning: MessageTableEntry<EmptyObject, string[]>;
  updateBackgroundScripts: MessageTableEntry<EmptyObject, void>;
  reloaded: MessageTableEntry<EmptyObject, void>;
  toggleDomain: MessageTableEntry<
    { id: string; domain: string; enabled: boolean },
    void
  >;
  scriptsUpdated: MessageTableEntry<{ ids: string[] }, void>;
  testScriptable: MessageTableEntry<{ tabId?: number | null }, boolean>;
  resyncAll: MessageTableEntry<EmptyObject, void>;
}
/****************************************************** */

export type MessageCmd = keyof MessageTable;
export type MessageSend<T extends MessageCmd> = MessageTable[T]["send"];
export type MessageReceive<T extends MessageCmd> = MessageTable[T]["send"] & {
  cmd: T;
};
export type MessageReply<T extends MessageCmd> = MessageTable[T]["reply"];

export class MessageService {
  /** Send a message to the extension runtime. */
  async send<T extends MessageCmd>(
    cmd: T,
    message: MessageSend<T>,
    options: SendMessageOptions = {}
  ): Promise<MessageReply<T> | undefined> {
    return await (
      Chrome.runtime?.sendMessage as
        | ((
            message: unknown,
            options?: SendMessageOptions
          ) => Promise<MessageReply<T>>)
        | undefined
    )?.({ ...message, cmd }, options);
  }

  /** Send a message to the content script registered in the given tab. */
  async sendToTab<T extends MessageCmd>(
    tab: Tab | null | undefined,
    cmd: T,
    message: MessageSend<T>,
    options: SendTabMessageOptions = {}
  ): Promise<MessageReply<T> | undefined> {
    if (!tab?.id) return undefined;

    return await (
      Chrome.tabs?.sendMessage as (
        tabId: number,
        message: unknown,
        options: SendTabMessageOptions
      ) => Promise<MessageReply<T>>
    )(tab.id, { ...message, cmd }, options);
  }

  /** Register a listener for a given event. */
  listen<T extends MessageCmd>(
    cmd: T,
    callback: (
      message: MessageReceive<T>,
      sender: MessageSender
    ) => MessageReply<T> | Promise<MessageReply<T>>
  ) {
    const handler = (
      message: MessageReceive<T>,
      sender: MessageSender,
      reply: (message?: MessageReply<T>) => void
    ) => {
      if (message.cmd === cmd) {
        Promise.resolve(callback(message, sender)).then((response) => {
          reply(response);
        });
        return true;
      }
      return false;
    };

    Chrome.runtime?.onMessage.addListener(handler);

    return () => {
      Chrome.runtime?.onMessage.removeListener(handler);
    };
  }

  /** Open scripts management page. Async-wrapped to prevent simultaneous calls. */
  openEditor = wrapAsyncMerge(async (refer: string) => {
    await Chrome.storage?.local.set({ refer });
    await Chrome.runtime?.openOptionsPage();
  });
}

export const messageService = new MessageService();
