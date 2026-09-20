import type { AreaDirectEffectAtom } from "../surface/types.ts";
import type { TraceEdge, TraceNode, TraceNodeId } from "./tracer-model.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

export type TraceEffectAtomFn = (
  e: AreaDirectEffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  edges?: TraceEdge[],
) => TraceNodeId | null;
