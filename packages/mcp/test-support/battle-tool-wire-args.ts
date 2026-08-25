type JsonRecord = Readonly<Record<string, unknown>>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function battleToolWireArgs(name: string, args: JsonRecord): JsonRecord;
export function battleToolWireArgs(name: string, args: unknown): unknown;
export function battleToolWireArgs(name: string, args: unknown): unknown {
  if (!isJsonRecord(args)) return args;
  if (name === "fill_battle_hole" && "subject" in args && "fill" in args) {
    return {
      ...(args.playSessionId === undefined
        ? {}
        : { playSessionId: args.playSessionId }),
      ...(args.guestAccessGrant === undefined
        ? {}
        : { guestAccessGrant: args.guestAccessGrant }),
      subject: args.subject,
      fill: args.fill,
    };
  }
  if (name === "resolve_battle_act" && "subject" in args) {
    return {
      ...(args.playSessionId === undefined
        ? {}
        : { playSessionId: args.playSessionId }),
      ...(args.guestAccessGrant === undefined
        ? {}
        : { guestAccessGrant: args.guestAccessGrant }),
      subject: args.subject,
      ...(args.reactionSpellTargetFacts === undefined
        ? {}
        : { reactionSpellTargetFacts: args.reactionSpellTargetFacts }),
    };
  }
  return args;
}
