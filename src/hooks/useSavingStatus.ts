import { useRef, useState } from "preact/hooks";
import { useFutureCallback } from "./core/useFutureCallback";
import type { SavingStatus } from "../components/SavingIndicator";
import { useRefresh } from "./core/useRefresh";

export type SaveHandler = () => void | Promise<void>;
export type MarkUnsavedHandler = () => void;

/** Receives an async save function, and returns a SavingStatus and a wrapped save function.
 *
 * The save status will be "saved" until the wrapped save function is called, which will trigger
 * the save method and make the status "saving". The status will not return to "saved" until the
 * last save call resolves. */
export const useSavingStatus = (
  save?: SaveHandler
): [SavingStatus, SaveHandler, MarkUnsavedHandler] => {
  const latestKey = useRef<object>({});
  const [status, setStatus] = useState<SavingStatus>("saved");
  const refresh = useRefresh();

  save = useFutureCallback(save ?? (() => {}));

  const wrappedSave = useFutureCallback(async () => {
    const key = {};
    latestKey.current = key;

    setStatus("saving");
    refresh();

    await save();

    if (latestKey.current === key) {
      setStatus("saved");
      refresh();
    }
  });

  const markUnsaved = useFutureCallback(() => {
    setStatus("unsaved");
  });

  return [status, wrappedSave, markUnsaved];
};
