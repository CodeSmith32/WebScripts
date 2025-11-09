import { createContext, type ComponentChildren } from "preact";
import type { PopupManager } from "./ClassPopupManager";
import { useContext } from "preact/hooks";
import { promiseGuts } from "../../../includes/core/promiseGuts";

export class Popup<T = void> {
  manager: PopupManager;
  jsx: ComponentChildren;
  key: string;

  #closePromise = promiseGuts<T>();
  waitClose = this.#closePromise.promise;

  static keyIndex: number = 0;

  constructor(manager: PopupManager, jsx: ComponentChildren) {
    this.manager = manager;
    this.jsx = jsx;
    this.key = `popup-${Popup.keyIndex++}`;
  }

  close(data: T) {
    this.manager.close(this as Popup<unknown>);
    this.#closePromise.resolve(data);
  }
}

export const PopupContext = createContext<Popup<unknown> | null>(null);

export const usePopup = <T,>(): Popup<T> => {
  const popup = useContext(PopupContext);
  if (!popup) {
    throw new Error("usePopup called outside <PopupProvider>.");
  }
  return popup as Popup<T>;
};
