/** Type for any. **Use only when absolutely necessary.** */
export type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Type for representing any function. */
export type AnyFunction = (...args: Any[]) => Any;

/** A type for representing any class. */
export type Class = { new (...args: Any[]): Any };

/** A type for representing an object with no properties. */
export type EmptyObject = { [key: symbol]: void };
