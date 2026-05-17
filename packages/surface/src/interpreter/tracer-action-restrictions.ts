import type { ActionRestriction } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

export function traceActionRestriction(
  r: ActionRestriction,
  targetId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (r.kind) {
    case "none":
      return;
    case "exclude": {
      const rid = ids("rst");
      nodes.push({
        id: rid,
        category: "effect",
        atomKind: "restrict_action_set",
        label: `restrict_action_set\nexclude: ${r.actions.join(", ")}`,
      });
      edges.push({ from: rid, to: targetId, relation: "modifies" });
      return;
    }
    default: {
      const _exhaustive: never = r;
      throw new Error(`unhandled action restriction: ${String(_exhaustive)}`);
    }
  }
}
