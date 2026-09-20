import { Result } from "effect";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

export type AtomCategory =
  | "source"
  | "procedure"
  | "window"
  | "hole"
  | "attachment"
  | "resolution"
  | "lifecycle"
  | "resource"
  | "scaling"
  | "effect"
  | "statBlock";

declare const traceNodeIdBrand: unique symbol;

export type TraceNodeId = string & {
  readonly [traceNodeIdBrand]: "TraceNodeId";
};

export function traceNodeId(value: string): TraceNodeId {
  // Branding identifies the trace-ID role only; it does not prove graph membership or uniqueness.
  return value as TraceNodeId;
}

export type TraceNode = {
  readonly id: TraceNodeId;
  readonly category: AtomCategory;
  readonly atomKind: string;
  readonly label: string;
};

export type TraceEdge = {
  readonly from: TraceNodeId;
  readonly to: TraceNodeId;
  readonly relation: string;
};

/**
 * The graph shape produced while a tracer is still constructing its nodes and
 * edges.  This remains package-internal; renderers must consume `Trace`.
 */
export type TraceDraft = {
  readonly unitId: string;
  readonly unitName: string;
  readonly nodes: ReadonlyArray<TraceNode>;
  readonly edges: ReadonlyArray<TraceEdge>;
};

const traceBrand = Symbol("Trace");

/**
 * A graph whose node IDs are unique and whose edge endpoints are present in
 * the graph.  The symbol is intentionally private so callers cannot create a
 * renderer-ready trace from an unvalidated object.
 */
export type Trace = TraceDraft & {
  readonly [traceBrand]: true;
};

export type TraceFinalizationIssue =
  | {
      readonly code: "duplicate_node_id";
      readonly id: TraceNodeId;
      readonly nodeIndex: number;
    }
  | {
      readonly code: "missing_edge_endpoint";
      readonly endpoint: "from" | "to";
      readonly edgeIndex: number;
      readonly id: TraceNodeId;
    };

export type TraceFinalizationIssues =
  ReadonlyNonEmptyArray<TraceFinalizationIssue>;

export type TraceFinalizationResult = Result.Result<
  Trace,
  TraceFinalizationIssues
>;

export function finalizeTrace(draft: TraceDraft): TraceFinalizationResult {
  const issues: TraceFinalizationIssue[] = [];
  const nodeIndexes = new Map<TraceNodeId, number>();

  draft.nodes.forEach((node, nodeIndex) => {
    if (nodeIndexes.has(node.id)) {
      issues.push({
        code: "duplicate_node_id",
        id: node.id,
        nodeIndex,
      });
      return;
    }
    nodeIndexes.set(node.id, nodeIndex);
  });

  draft.edges.forEach((edge, edgeIndex) => {
    if (!nodeIndexes.has(edge.from)) {
      issues.push({
        code: "missing_edge_endpoint",
        endpoint: "from",
        edgeIndex,
        id: edge.from,
      });
    }
    if (!nodeIndexes.has(edge.to)) {
      issues.push({
        code: "missing_edge_endpoint",
        endpoint: "to",
        edgeIndex,
        id: edge.to,
      });
    }
  });

  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue === undefined) {
    return Result.succeed({ ...draft, [traceBrand]: true });
  }
  return Result.fail([firstIssue, ...remainingIssues]);
}

export function traceAtomKinds(trace: Trace): ReadonlyArray<string> {
  return [...new Set(trace.nodes.map((node) => node.atomKind))].sort();
}
