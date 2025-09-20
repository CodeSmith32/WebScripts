import { useRef } from "react";

interface FutureCallbackState<Args extends unknown[], Ret> {
  callback: (...args: Args) => Ret;
  stableCallback: (...args: Args) => Ret;
}

/** Returns the callback wrapped with another that remains the same. Calling the returned callback will always call the future-most version of the callback passed. */
export function useFutureCallback<Args extends unknown[], Ret>(
  callback: (...args: Args) => Ret
): (...args: Args) => Ret {
  const callbackRef: React.MutableRefObject<FutureCallbackState<Args, Ret>> =
    useRef({
      callback,
      stableCallback(this: unknown, ...args: Args): Ret {
        return callbackRef.current.callback.apply(this, args);
      },
    });
  callbackRef.current.callback = callback;

  return callbackRef.current.stableCallback;
}
