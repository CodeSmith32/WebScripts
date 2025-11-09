import { useEffect } from "preact/hooks";
import { useFutureCallback } from "../../../hooks/core/useFutureCallback";
import { useRefresh } from "../../../hooks/core/useRefresh";
import { usePopupManager } from "./ClassPopupManager";
import { PopupContext } from "./ClassPopup";

export const PopupRenderer = () => {
  const refresh = useRefresh();
  const constRefresh = useFutureCallback(refresh);
  const popups = usePopupManager();

  useEffect(() => {
    popups.addRenderRefresh(constRefresh);

    return () => {
      popups.removeRenderRefresh(constRefresh);
    };
  }, []);

  return (
    <div>
      {popups.activePopups.map((popup) => (
        <PopupContext.Provider key={popup.key} value={popup}>
          {popup.jsx}
        </PopupContext.Provider>
      ))}
    </div>
  );
};
