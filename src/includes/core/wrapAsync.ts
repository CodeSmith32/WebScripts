import type { Any } from "./types/basic";
import { promiseGuts, type PromiseGuts } from "./promiseGuts";

export type AsyncHandler<Args extends Any[], Ret> = (
  ...args: Args
) => Promise<Ret>;

/** Wraps an async 'task' function and returns a new function that, when called, prevents the
 * inner function from ever running more than once simultaneously.
 *
 * For `wrapAsyncMerge`, calls made while the task is running will be merged with the current
 * task, and will resolve with the value of the current task. In this mode, the arguments passed
 * to calls made while the task is running are ignored. */
export const wrapAsyncMerge = <Args extends Any[], Ret>(
  task: AsyncHandler<Args, Ret>
): AsyncHandler<Args, Ret> => {
  let previous: PromiseGuts<Ret> | null = null;

  return async (...args) => {
    // if no task is running, run one
    if (!previous) {
      const current = (previous = promiseGuts());

      // trigger the task
      Promise.resolve(task(...args))
        .finally(() => {
          previous = null; // reset previous after run
        })
        .then(current.resolve, current.reject);
    }
    // in any case, return the promise for the currently running task
    return previous.promise;
  };
};

/** Wraps an async 'task' function and returns a new function that, when called, prevents the
 * inner function from ever running more than once simultaneously.
 *
 * For `wrapAsyncQueue`, calls made while the task is running will be queued, and each queued
 * call will run separately in the order they were made. In this mode, all calls are respected,
 * and no arguments are ever ignored. */
export const wrapAsyncQueue = <Args extends Any[], Ret>(
  task: AsyncHandler<Args, Ret>
): AsyncHandler<Args, Ret> => {
  let previous: PromiseGuts<Ret> | null = null;

  return async (...args) => {
    // get the promise for the last requested task, if any
    const current = previous?.promise;
    // swap the last request with a new promise for the next call
    const next = (previous = promiseGuts());

    // wait for the chain to reach this call, and then run
    await current?.catch(() => {}); // ignore rejects
    Promise.resolve(task(...args)).then(next.resolve, next.reject);

    return next.promise;
  };
};

/** Wraps an async 'task' function and returns a new function that, when called, prevents the
 * inner function from ever running more than once simultaneously.
 *
 * For `wrapAsyncFirst`, any calls made while the task is running will be stashed until the
 * running task finishes. Then, only the first invocation that had been made during that run
 * will be triggered, and all calls that had followed it will resolve with the response of that
 * first invocation. */
export const wrapAsyncFirst = <Args extends Any[], Ret>(
  task: AsyncHandler<Args, Ret>
): AsyncHandler<Args, Ret> => {
  let primary: PromiseGuts<Ret> | null = null;
  let stashed: PromiseGuts<Ret> | null = null;

  return async (...args) => {
    if (primary) {
      // there is a task running
      // if another task was stashed, respond with it
      if (stashed) return stashed.promise;

      // otherwise, stash a new task
      stashed = promiseGuts();
      await primary.promise.catch(() => {}); // wait for the primary task; ignore rejects

      // then switch out the primary with this stashed one
      primary = stashed;
      stashed = null;
      // then run it as primary ...
    }

    // if no task is running, run one as the primary call
    if (!primary) primary = promiseGuts();

    // store the current primary task
    const current = primary;

    Promise.resolve(task(...args))
      .finally(() => {
        // reset primary if it's still the current one (technically, it should always be)
        if (primary === current) primary = null;
      })
      .then(current.resolve, current.reject);

    return current.promise;
  };
};

/** Wraps an async 'task' function and returns a new function that, when called, prevents the
 * inner function from ever running more than once simultaneously.
 *
 * For `wrapAsyncLast`, any calls made while the task is running will be stashed until the
 * running task is finished. Then, only the last invocation that had been made during that run
 * will be triggered, and all previous calls that were made before it will resolve with the
 * response of that last invocation. */
export const wrapAsyncLast = <Args extends Any[], Ret>(
  task: AsyncHandler<Args, Ret>
): AsyncHandler<Args, Ret> => {
  let primary: PromiseGuts<Ret> | null = null;
  let stashed: PromiseGuts<Ret> | null = null;

  return async (...args) => {
    if (primary) {
      // there is a task running
      // if another task was started, replace it
      const current = (stashed = promiseGuts());
      await primary.promise.catch(() => {}); // wait for the primary task; ignore rejects

      // if the stashed promise changed, return the latest
      if (current !== stashed) return stashed.promise;

      // otherwise, switch out the primary with this stashed one
      primary = stashed;
      stashed = null;
    }

    // if no task is running, run one as the primary call
    if (!primary) primary = promiseGuts();

    // store the current primary task
    const current = primary;

    Promise.resolve(task(...args))
      .finally(() => {
        // reset primary if it's still the current one (technically, it should always be)
        if (primary === current) primary = null;
      })
      .then(current.resolve, current.reject);

    return current.promise;
  };
};

/** Wraps an async 'task' function and returns a new function that, when called, prevents the
 * inner function from ever running more than once simultaneously.
 *
 * For `wrapAsyncMergeEnd`, calls made while the task is running will be stashed, but the
 * running task will become marked as 'cancelled', and its response will be discarded. The task
 * will then be re-run, using the last call's arguments. No call will resolve until the final
 * call resolves without any other calls being made during its execution. This effectively
 * forces only the last call's value to resolve for all calls made before it. This is the
 * opposite of `wrapAsyncMerge`.
 *
 * Use this method carefully. If the function is invoked constantly, it may never let the last
 * call resolve, creating a memory leak of functions hooked to a promise that never resolves
 * (e.g. https://genius.com/20969482). */
export const wrapAsyncMergeEnd = <Args extends Any[], Ret>(
  task: AsyncHandler<Args, Ret>
): AsyncHandler<Args, Ret> => {
  let previous: PromiseGuts<void> | null = null;
  let latest: PromiseGuts<Ret> | null = null;
  let latestKey: object | null = null;

  return async (...args) => {
    // mark this call as the newest
    const key = (latestKey = {});

    // start up a new final promise, if none are set
    latest ??= promiseGuts();

    // if there is a task running, wait for it
    await previous?.promise;

    // if other calls were made during previous task execution, this one won't run
    if (key !== latestKey) return latest.promise;

    // otherwise, this is the next latest task: prepare and run
    previous = promiseGuts();

    Promise.resolve(task(...args))
      .finally(() => {
        // let the next latest task run, if any
        const current = previous;
        previous = null;
        current?.resolve();
      })
      .then(
        (value) => {
          if (key === latestKey) {
            // no calls were made since the start of this one! resolve!
            latestKey = null;
            latest?.resolve(value);
            latest = null;
          }
        },
        (reason) => {
          if (key === latestKey) {
            // no calls were made since the start of this one! resolve!
            latestKey = null;
            latest?.reject(reason);
            latest = null;
          }
        }
      );

    return latest.promise;
  };
};
