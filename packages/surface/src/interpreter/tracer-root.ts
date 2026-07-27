import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import { idGen, type IdGen } from "./tracer-rule-labels.ts";

export function traceRoot(
  atomKind: string,
  label: string,
): {
  readonly rootId: string;
  readonly nodes: TraceNode[];
  readonly edges: TraceEdge[];
  readonly ids: IdGen;
} {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();
  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind,
    label,
  });
  return { rootId, nodes, edges, ids };
}
