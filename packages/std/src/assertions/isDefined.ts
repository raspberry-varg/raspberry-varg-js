export function isDefined<T>(value: T | null | undefined): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value must be defined',
): asserts value is NonNullable<T> {
  if (!isDefined(value)) {
    throw new TypeError(message);
  }
}
