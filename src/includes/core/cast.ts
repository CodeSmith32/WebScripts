/** Wrap a value in an array if it isn't an array already */
export function arrayify<T>(value: T | T[]): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}
/** Convert any value to a number. Coerces NaN values to 0. */
export function numerify(value: unknown): number {
  const n = typeof value === "symbol" ? 0 : Number(value);
  return isNaN(n) ? 0 : n;
}
/** Convert any value to a string. Nil values become '' instead of 'null' or 'undefined'. */
export function stringify(value: unknown): string {
  return value == null ? "" : String(value);
}
