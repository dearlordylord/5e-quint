export type MechanicalPrimitive = string | number | boolean;

export function samePrimitiveMultiset<Value extends MechanicalPrimitive>(
  left: readonly Value[],
  right: readonly Value[],
): boolean {
  if (left.length !== right.length) return false;
  const unmatched = [...right];
  return left.every((value) => {
    const index = unmatched.findIndex((candidate) => candidate === value);
    if (index < 0) return false;
    unmatched.splice(index, 1);
    return true;
  });
}

export function sameMultisetBy<Value>(
  left: readonly Value[],
  right: readonly Value[],
  equals: (left: Value, right: Value) => boolean,
): boolean {
  if (left.length !== right.length) return false;
  const unmatched = [...right];
  return left.every((value) => {
    const index = unmatched.findIndex((candidate) => equals(value, candidate));
    if (index < 0) return false;
    unmatched.splice(index, 1);
    return true;
  });
}

export function sameSetByKey<
  Value,
  Key extends MechanicalPrimitive,
>(
  left: readonly Value[],
  right: readonly Value[],
  key: (value: Value) => Key,
  equals: (left: Value, right: Value) => boolean,
): boolean {
  const leftKeys = left.map(key);
  const rightKeys = right.map(key);
  return (
    new Set(leftKeys).size === left.length &&
    new Set(rightKeys).size === right.length &&
    left.length === right.length &&
    left.every((value) => {
      const candidate = right.find((other) => key(other) === key(value));
      return candidate !== undefined && equals(value, candidate);
    })
  );
}

export function samePrimitiveSet<Value extends MechanicalPrimitive>(
  left: readonly Value[],
  right: readonly Value[],
): boolean {
  return sameSetByKey(left, right, (value) => value, (a, b) => a === b);
}
