/** Require certain properties of an interface. */
export type PickRequired<T, U extends keyof T> = Omit<T, U> &
  Required<Pick<T, U>>;

/** Require certain properties of an interface, and mark everything else as optional. */
export type OnlyRequire<T, U extends keyof T> = Partial<Omit<T, U>> &
  Required<Pick<T, U>>;

/** Make certain properties of an interface optional. */
export type PickPartial<T, U extends keyof T> = Omit<T, U> &
  Partial<Pick<T, U>>;

/** Make certain properties of an interface optional, and require everything else. */
export type OnlyPartial<T, U extends keyof T> = Required<Omit<T, U>> &
  Partial<Pick<T, U>>;

/** Unwrap array type */
export type Unarray<T extends unknown[]> = T extends (infer U)[] ? U : never;

/** Iterate properties of an object and mark any that could be void or undefined as optional.
 *
 * e.g., The following type requires that `y` exist in the object, even if it's just set to `undefined`:
 * ```
 * { x: number, y: number | undefined }
 * ```
 * But, wrapped with `OptionalizeVoids`,
 * ```
 * OptionalizeVoids<{ x: number, y: number | undefined }> == { x: number, y?: number | undefined }
 * ```
 * `y` becomes optional.
 */
export type OptionalizeVoids<T extends object> = {
  // first make all properties optional...
  [K in keyof T]?: T[K];
} & {
  // ...then require any that don't extend `void | undefined`
  [K in keyof T as T[K] extends void | undefined ? never : K]-?: T[K];
};

/** Make all properties of an object writable. Inverse of `ReadOnly<T>` */
export type Writable<T extends object> = {
  -readonly [K in keyof T]: T[K];
};
