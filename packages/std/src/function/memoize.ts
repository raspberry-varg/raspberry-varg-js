/**
 * Memoize a result from a potentially expensive function.
 */
export function memoize<T>(factory: () => T): () => T {
  let f: typeof factory | null = factory;
  let cached: T | undefined;

  return () => {
    if (f !== null) {
      cached = f();
      f = null;
    }
    return cached!;
  };
}
