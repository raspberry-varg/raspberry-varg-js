/**
 * Data that can be serialized to JSON (or already the target serialized value).
 */
export type SerializableOr<T extends NonNullable<unknown>> = { toJSON: () => T } | T;

/**
 * Resolves a serializable to its target value, returning itself if already resolved.
 */
export function resolveSerializableOr<T extends NonNullable<unknown>>(
  serializableOr: SerializableOr<T>,
): T {
  return 'toJSON' in serializableOr ? serializableOr.toJSON() : serializableOr;
}
