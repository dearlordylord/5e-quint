import { compareCodePoints } from "@dnd/shared/structural-value";

export {
  canonicalStructuralKey,
  compareCodePoints,
  hasDuplicateStructuralValues,
} from "@dnd/shared/structural-value";

export function canonicalizeStringSet<T extends string>(
  values: readonly T[],
): readonly T[] {
  return [...values].sort(compareCodePoints);
}
