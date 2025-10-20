/** Returns true if two arrays contain identical elements in identical positions. */
export const arraysEqual = <T>(a: Readonly<T[]>, b: Readonly<T[]>): boolean => {
  // if we're not given arrays, always fail
  if (!Array.isArray(a) || !Array.isArray(b)) return false;

  // quick check: if this is the same array, it definitely matches
  if (a === b) return true;

  // if length differs, fail
  if (a.length !== b.length) return false;

  // compare elements
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};
