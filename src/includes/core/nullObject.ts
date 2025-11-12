/** Set an object's prototype to null, or return a new object with a null prototype. */
export const nullObject = <T extends object = object>(object?: T): T => {
  return object ? Object.setPrototypeOf(object, null) : Object.create(null);
};
