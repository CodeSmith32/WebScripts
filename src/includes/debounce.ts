type Timer = ReturnType<typeof setTimeout>;

/** Wrap a function with a binder that calls it after a given delay with the passed arguments and 'this' binding. If called again, the timer is reset and it waits the delay again.
 * Use debounce.after(...) to call the function after the delay regardless. That is, calls made after the first call but during the wait have no effect. */
const makeDebounce = (after: boolean) =>
  function debounce<Args extends unknown[], Ret>(
    fn: (...args: Args) => Ret,
    delay: number
  ) {
    let timer: Timer | null = null;

    if (delay === undefined) {
      console.warn("debounce: Not specifying 'delay' is deprecated");
    }
    delay ??= 100;

    function bound(this: unknown, ...args: Args) {
      if (timer !== null) {
        if (after) return; // 'after' mode: don't restart
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        timer = null;
        fn.apply(this, args);
      }, delay);
    }
    /** Cancel the currently active timeout prepared to trigger the debounced function, and do not run the function.
     * Has no effect if the timeout is inactive. */
    bound.cancel = function () {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    /** Immediately and synchronously invoke the function, canceling the timeout. Return the value returned by the function. */
    bound.immediate = function (this: unknown, ...args: Args): Ret {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      return fn.apply(this, args);
    };
    return bound;
  };

export const debounce = Object.assign(makeDebounce(false), {
  after: makeDebounce(true),
});
