import { useMemo } from "preact/hooks";
import { PopupManagerContext, PopupManager } from "./ClassPopupManager";
import type { ComponentChildren } from "preact";

export interface PopupManagerProviderProps {
  children: ComponentChildren;
}

export const PopupManagerProvider = ({
  children,
}: PopupManagerProviderProps) => {
  const popupManager = useMemo(() => new PopupManager(), []);

  return (
    <PopupManagerContext.Provider value={popupManager}>
      {children}
    </PopupManagerContext.Provider>
  );
};
