/** Shared assertion — throws with message if condition is false. */
export function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(msg)
}

/** Assert a value is non-nullish, returning it with narrowed type. */
export function assertDefined<T>(value: T | null | undefined, msg: string): T {
  if (value == null) throw new Error(msg)
  return value
}
