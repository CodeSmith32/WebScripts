/** Copy a subset of properties from an object to a new object */
export const pick = <T extends object, U extends keyof T>(
  object: T,
  fields: U[]
): Pick<T, U> => {
  const output = {} as Pick<T, U>;
  for (const prop of fields) {
    if (prop in object) {
      output[prop] = object[prop];
    }
  }
  return output;
};

/** Copy properties from an object to a new object, excluding a select subset */
export const omit = <T extends object, U extends keyof T>(
  object: T,
  fields: U[]
): Omit<T, U> => {
  const output = { ...object } as Omit<T, U>;
  for (const prop of fields) {
    delete (output as T)[prop];
  }
  return output;
};
