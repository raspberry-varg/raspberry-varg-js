/**
 * Data that can be serialized to JSON (or already the target serialized value).
 */
export type SerializableOr<T> = { toJSON: () => T } | T;

export type ResolvedSerializableOr<T extends SerializableOr<any>> =
  T extends SerializableOr<infer U> ? U : never;

/**
 * Resolves a serializable to its target value, returning itself if already resolved.
 */
export function resolveSerializableOr<T extends object>(serializableOr: SerializableOr<T>): T {
  return 'toJSON' in serializableOr ? serializableOr.toJSON() : serializableOr;
}
