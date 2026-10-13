/**
 * Asserts that a control flow branch is unreachable (e.g. all switch cases are handled).
 */
export function assertExhaustive(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}
