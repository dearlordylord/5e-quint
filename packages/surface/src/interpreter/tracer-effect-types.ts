import type { AreaDirectEffectAtom } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

export type TraceEffectAtomFn = (
  e: AreaDirectEffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  edges?: TraceEdge[],
) => string | null;
