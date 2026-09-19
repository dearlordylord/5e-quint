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

export type Trace = {
  readonly unitId: string;
  readonly unitName: string;
  readonly nodes: ReadonlyArray<TraceNode>;
  readonly edges: ReadonlyArray<TraceEdge>;
};

export function traceAtomKinds(trace: Trace): ReadonlyArray<string> {
  return [...new Set(trace.nodes.map((node) => node.atomKind))].sort();
}
