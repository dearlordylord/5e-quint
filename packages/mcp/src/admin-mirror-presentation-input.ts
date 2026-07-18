export function targetIdFromFills(fills: readonly unknown[]): string | null {
  for (const fill of fills) {
    const record = recordOf(fill);
    if (record.kind === "targetChoice") return stringField(record, "value");
    if (record.kind === "spellTargetAllocation") {
      const value = recordOf(record.value);
      const allocations = Array.isArray(value.allocations)
        ? value.allocations
        : [];
      return stringField(recordOf(allocations[0]), "targetId");
    }
  }
  return null;
}

export function hasFillKind(fills: readonly unknown[], kind: string): boolean {
  return fills.some((fill) => recordOf(fill).kind === kind);
}

export function recordOf(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object"
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

export function stringField(
  value: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const field = value[key];
  return typeof field === "string" ? field : null;
}
