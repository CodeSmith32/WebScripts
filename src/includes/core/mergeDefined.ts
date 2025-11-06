import type { UnoptionalizeVoids } from "./types/utility";

/** A nullishable object. */
export type MaybeObject = object | null | undefined;

/** A list of nullishable objects. */
export type ObjectList = [MaybeObject, ...MaybeObject[]] | MaybeObject[];

/** Returns type U after filling in properties from T where U is undefined. */
export type MergeDefined<T extends object, U extends object> = {
  [K in keyof U]: undefined extends U[K]
    ? K extends keyof T
      ? NonNullable<U[K]> | T[K]
      : U[K]
    : U[K];
} & {
  [K in keyof T as K extends keyof U ? never : K]: T[K];
};

/** Reduce the tuple type of objects to a single object that contains all non-undefined,
 * non-optional properties from the objects in the list. */
export type MergeDefinedArray<T extends ObjectList> = T extends [
  infer Next extends MaybeObject,
  ...infer Rest extends ObjectList,
]
  ? Next extends object
    ? MergeDefined<UnoptionalizeVoids<Next>, MergeDefinedArray<Rest>>
    : MergeDefinedArray<Rest>
  : T extends [infer Next extends object]
    ? UnoptionalizeVoids<Next>
    : object;

/** Create a new object that inherits all non-undefined properties from the given list of
 * objects. The last object's property values take precedence.
 *
 * This is similar to object splatting (`{...a, ...b}`) except that undefined values in a splat
 * override non-undefined values, whereas `extendNonNull` takes the last non-undefined value for
 * each key in the set of objects. */
export const mergeDefined = <T extends ObjectList>(
  ...args: T
): MergeDefinedArray<T> => {
  const target = {};

  for (const object of args) {
    if (!object) continue;

    for (const key of Object.keys(object) as never[]) {
      if (object[key] !== undefined) target[key] = object[key];
    }
  }

  return target as MergeDefinedArray<T>;
};
