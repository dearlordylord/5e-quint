type JsonRecord = Readonly<Record<string, unknown>>;

export function battleToolWireArgs(name: string, args: JsonRecord): JsonRecord;
export function battleToolWireArgs(name: string, args: unknown): unknown;
export function battleToolWireArgs(name: string, args: unknown): unknown {
  // Battle subjects and fills are already structured values at the MCP
  // boundary. Keep this helper as a pass-through for ordinary typed callers;
  // it exists only so acceptance scenarios can share call plumbing.
  void name;
  return args;
}
