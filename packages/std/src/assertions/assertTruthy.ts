export function assertTruthy(value: unknown, message = 'Expected truthy value'): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
