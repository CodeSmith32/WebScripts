import type { MutableRefObject } from "preact/compat";
import { useRef } from "preact/hooks";

interface FutureCallbackState<Args extends unknown[], Ret> {
  callback: (...args: Args) => Ret;
  stableCallback: (...args: Args) => Ret;
}

/** Returns the callback wrapped with another that remains the same. Calling the returned callback will always call the future-most version of the callback passed. */
export function useFutureCallback<Args extends unknown[], Ret>(
  callback: (...args: Args) => Ret
): (...args: Args) => Ret {
  const callbackRef: MutableRefObject<FutureCallbackState<Args, Ret>> = useRef({
    callback,
    stableCallback(this: unknown, ...args: Args): Ret {
      return callbackRef.current.callback.apply(this, args);
    },
  });
  callbackRef.current.callback = callback;

  return callbackRef.current.stableCallback;
}
