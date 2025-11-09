import { useEffect } from "preact/hooks";
import { useFutureCallback } from "./useFutureCallback";

export const useWindowFocus = (handler?: (evt: FocusEvent) => void) => {
  const stableHandler = useFutureCallback(handler ?? (() => {}));

  useEffect(() => {
    window.addEventListener("focus", stableHandler);

    return () => {
      window.removeEventListener("focus", stableHandler);
    };
  }, []);
};
