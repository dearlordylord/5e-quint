import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

/** Narrow a runtime collection to the protocol's nonempty-array shape. */
export function toReadonlyNonEmpty<A>(
  values: readonly A[],
): ReadonlyNonEmptyArray<A> | undefined;
export function toReadonlyNonEmpty<A>(
  values: readonly A[],
  fallback: () => A,
): ReadonlyNonEmptyArray<A>;
export function toReadonlyNonEmpty<A>(
  values: readonly A[],
  fallback?: () => A,
): ReadonlyNonEmptyArray<A> | undefined {
  const first = values[0];
  if (first !== undefined) return [first, ...values.slice(1)];
  return fallback === undefined ? undefined : [fallback()];
}
