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
