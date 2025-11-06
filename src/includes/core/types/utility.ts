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
 * ```ts
 * { x: number, y: number | undefined }
 * ```
 * But, wrapped with `OptionalizeVoids`,
 * ```ts
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

// helper for UnoptionalizeVoids
type AddUndefinedFrom<T extends object, U extends Partial<T>> = {
  [K in keyof T]: undefined extends U[K] ? T[K] | undefined : T[K];
};

/** Iterate properties of an object and mark any optional properties as non-optional unions with
 * undefined.
 *
 * e.g., The following type does not require `y` to be set:
 * ```ts
 * { x: number, y?: number }
 * ```
 * But, wrapped with `UnoptionalizeVoids`,
 * ```ts
 * UnoptionalizeVoids<{ x: number, y?: number }> == { x: number, y: number | undefined }
 * ```
 * `y` is now required, though `undefined` may be passed.
 * */
export type UnoptionalizeVoids<T extends object> = AddUndefinedFrom<
  { [K in keyof T]-?: T[K] },
  T
>;

/** Determine if, within a given object type, the given key is an optional property.
 *
 * Works exactly. For instance,
 * ```ts
 * IsOptional<{ y?: number }, "y"> == true
 * ```
 * But
 * ```ts
 * IsOptional<{ y: number | undefined }, "y"> == false
 * ```
 * Because `y` does not include the `?`.
 */
export type IsOptional<T, K extends keyof T> = undefined extends T[K]
  ? object extends Pick<T, K>
    ? true
    : false
  : false;

/** Make all properties of an object writable. Inverse of `ReadOnly<T>` */
export type Writable<T extends object> = {
  -readonly [K in keyof T]: T[K];
};

/** Filter out values extending T from the Tuple type.
 *
 * Removes T from unions, and completely removes indices that only consist of T.
 *
 * ```ts
 * type Filtered = FilterTuple<number, [string | number, number | null, number, string]>;
 * // yields
 * type Filtered = [string, null, string]
 * ```
 * */
export type FilterTuple<T, Tuple extends unknown[]> = Tuple extends [
  infer Head,
  ...infer Tail,
]
  ? [Exclude<Head, T>] extends [never]
    ? FilterTuple<T, Tail>
    : [Exclude<Head, T>, ...FilterTuple<T, Tail>]
  : [];
