type Resolve<T> = (data: T) => void;

type Reject = (reason?: unknown) => void;

export type PromiseGuts<T> = {
  resolve: Resolve<T>;
  reject: Reject;
  promise: Promise<T>;
};

/** Generate and return a promise's resolve and reject functions, as well as the promise itself. */
export function promiseGuts<T = unknown>(): PromiseGuts<T> {
  let resolve: Resolve<T> | undefined = undefined;
  let reject: Reject | undefined = undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { resolve: resolve!, reject: reject!, promise };
}
