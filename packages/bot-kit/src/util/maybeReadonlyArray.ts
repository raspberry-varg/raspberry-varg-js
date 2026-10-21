export type MaybeReadonlyArray<T> = T | readonly T[];

export function resolveMaybeReadonlyArray<T>(array: MaybeReadonlyArray<T>): readonly T[] {
  if (Array.isArray(array)) {
    return array;
  } else {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return [array as T];
  }
}
