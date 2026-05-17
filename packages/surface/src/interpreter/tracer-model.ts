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

export type TraceNode = {
  readonly id: string;
  readonly category: AtomCategory;
  readonly atomKind: string;
  readonly label: string;
};

export type TraceEdge = {
  readonly from: string;
  readonly to: string;
  readonly relation: string;
};

export type Trace = {
  readonly unitId: string;
  readonly unitName: string;
  readonly nodes: ReadonlyArray<TraceNode>;
  readonly edges: ReadonlyArray<TraceEdge>;
  readonly atomKinds: ReadonlyArray<string>;
};
