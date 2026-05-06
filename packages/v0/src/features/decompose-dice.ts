/**
 * Partition `total` into `count` integers each in [1, dieSize] summing to `total`.
 * Returns null if impossible. Distributes values evenly for natural-looking results.
 */
export function decomposeDice(
  total: number,
  count: number,
  dieSize: number,
): ReadonlyArray<number> | null {
  if (count === 0) return total === 0 ? [] : null;
  if (total < count || total > count * dieSize) return null;

  const base = Math.floor(total / count);
  const remainder = total - base * count;
  const results: Array<number> = [];
  for (let i = 0; i < count; i++) {
    results.push(i < remainder ? base + 1 : base);
  }
  return results;
}
