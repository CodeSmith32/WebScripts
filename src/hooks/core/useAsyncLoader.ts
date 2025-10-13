import { useEffect, useState } from "preact/hooks";

export type RawAsyncLoaderState = {
  /** If the data is being reloaded. Always true, even if data is available, and just being re-loaded. */
  loading: boolean;
  /** A callback to trigger a reload of the data. */
  refresh: () => void;
};

export type AsyncLoaderState<T> =
  | ({
      /** The current loaded state. */
      data: T;
      /** If the data has loaded and is currently ready to be used. Useful if the loader ever returns `undefined` which would make the value of `data` ambiguous. */
      available: true;
    } & RawAsyncLoaderState)
  | ({
      /** The current loaded state. */
      data: undefined;
      /** If the data has loaded and is currently ready to be used. Useful if the loader ever returns `undefined` which would make the value of `data` ambiguous. */
      available: false;
    } & RawAsyncLoaderState);

export const useAsyncLoader = <T>(
  callback: (status: { cancelled: boolean }) => Promise<T>
): AsyncLoaderState<T> => {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [key, rawRefresh] = useState({});

  // refresh state
  const refresh = () => {
    setLoading(true);
    rawRefresh({});
  };

  useEffect(() => {
    const status = { cancelled: false };

    // run callback and set data on response
    callback(status).then((data) => {
      if (status.cancelled) return;
      setLoading(false);
      setAvailable(true);
      setData(data);
    });

    // cancel callback
    return () => {
      status.cancelled = true;
    };
  }, [key]);

  return { data, loading, available, refresh } as AsyncLoaderState<T>;
};
