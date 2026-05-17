import type { Range } from "../surface/types.ts";

// ============================================================
// Spell tracer
// ============================================================

export type SpellCtx = {
  readonly procId: string;
  readonly slotId: string | null;
  readonly range: Range;
};

export type OngoingTriggerCtx = {
  readonly hostId: string;
  readonly hostRelation: "grants" | "opens_window";
};
