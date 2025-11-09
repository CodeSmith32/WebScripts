import { createContext, type ComponentChildren } from "preact";
import { useContext } from "preact/hooks";
import { Popup } from "./ClassPopup";

export type RefresherType = () => void;

export class PopupManager {
  activePopups: Popup<unknown>[] = [];
  private renderRefreshers = new Set<RefresherType>();

  #refresh() {
    for (const refresh of this.renderRefreshers) {
      refresh();
    }
  }

  open<T = void>(jsx: ComponentChildren): Popup<T> {
    const popup = new Popup<T>(this, jsx);
    this.activePopups.push(popup as Popup<unknown>);
    this.#refresh();
    return popup;
  }
  close(popup: Popup<unknown>) {
    const i = this.activePopups.indexOf(popup);
    if (i > -1) {
      this.activePopups.splice(i, 1);
      this.#refresh();
    }
  }
  closeAll() {
    this.activePopups.length = 0;
    this.#refresh();
  }

  addRenderRefresh(refresh: RefresherType) {
    this.renderRefreshers.add(refresh);
  }
  removeRenderRefresh(refresh: RefresherType) {
    this.renderRefreshers.delete(refresh);
  }
}

export const PopupManagerContext = createContext<PopupManager | null>(null);

export const usePopupManager = (): PopupManager => {
  const manager = useContext(PopupManagerContext);
  if (!manager) {
    throw new Error("usePopupManager called outside <PopupManagerProvider>.");
  }
  return manager;
};
