export function sameStringSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value) => expected.includes(value)) &&
    expected.every((value) => actual.includes(value))
  );
}
