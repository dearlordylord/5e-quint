function sameMap(
  left: ReadonlyMap<unknown, unknown>,
  right: ReadonlyMap<unknown, unknown>,
): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    if (!right.has(key) || !sameDomainValue(value, right.get(key))) {
      return false;
    }
  }
  return true;
}

function sameSet(
  left: ReadonlySet<unknown>,
  right: ReadonlySet<unknown>,
): boolean {
  return (
    left.size === right.size && [...left].every((value) => right.has(value))
  );
}

function sameRecord(left: object, right: object): boolean {
  const leftRecord = left as Readonly<Record<string, unknown>>;
  const rightRecord = right as Readonly<Record<string, unknown>>;
  const keys = new Set([
    ...Object.keys(leftRecord),
    ...Object.keys(rightRecord),
  ]);
  return [...keys].every((key) =>
    sameDomainValue(leftRecord[key], rightRecord[key]),
  );
}

/**
 * Structural equality for parsed runtime-domain values.
 *
 * Execution facts are immutable records composed of branded primitives,
 * arrays, maps, and sets. Keeping their equality algorithm here prevents each
 * procedure variant from carrying a parallel field-by-field implementation.
 * Missing optional properties and explicit `undefined` remain equivalent,
 * matching the former projection-specific comparisons.
 */
export function sameDomainValue<T>(left: T, right: T): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null) return false;
  if (typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameDomainValue(value, right[index]))
    );
  }
  if (left instanceof Map || right instanceof Map) {
    return left instanceof Map && right instanceof Map && sameMap(left, right);
  }
  if (left instanceof Set || right instanceof Set) {
    return left instanceof Set && right instanceof Set && sameSet(left, right);
  }
  return sameRecord(left, right);
}
