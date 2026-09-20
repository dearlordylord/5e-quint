import type { Range } from "../surface/types.ts";
import type { TraceNodeId } from "./tracer-model.ts";

// ============================================================
// Spell tracer
// ============================================================

export type SpellCtx = {
  readonly procId: TraceNodeId;
  readonly slotId: TraceNodeId | null;
  readonly range: Range;
};

export type OngoingTriggerCtx = {
  readonly hostId: TraceNodeId;
  readonly hostRelation: "grants" | "opens_window";
};
