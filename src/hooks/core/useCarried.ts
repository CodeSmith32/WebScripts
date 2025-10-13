import { useRef } from "preact/hooks";

/** Make an object that carries config and props across renders. Makes props assigned in future renders available to effects from the past (e.g. on mount). */
export function useCarried<T extends object>(config: T): Readonly<T> {
  const ref = useRef<T>({} as T);
  Object.assign(ref.current, config);
  return ref.current;
}
