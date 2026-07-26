import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

export function traceDecisionCommit(input: {
  readonly procedureId: string;
  readonly interruptsTrigger: boolean;
  readonly nodes: TraceNode[];
  readonly edges: TraceEdge[];
  readonly ids: IdGen;
}): string {
  const prepId = input.ids("prep");
  input.nodes.push({
    id: prepId,
    category: "procedure",
    atomKind: "prepare",
    label: "prepare",
  });
  input.edges.push({
    from: input.procedureId,
    to: prepId,
    relation: "prepares",
  });

  const promptId = input.ids("prompt");
  input.nodes.push({
    id: promptId,
    category: "procedure",
    atomKind: "prompt",
    label: "prompt",
  });
  input.edges.push({ from: prepId, to: promptId, relation: "prompts" });

  const commitId = input.ids("commit");
  input.nodes.push({
    id: commitId,
    category: "procedure",
    atomKind: "commit",
    label: "commit",
  });
  input.edges.push({ from: promptId, to: commitId, relation: "commits" });

  if (input.interruptsTrigger) {
    const interruptId = input.ids("int");
    input.nodes.push({
      id: interruptId,
      category: "resolution",
      atomKind: "interrupt_resolution",
      label: "interrupt_resolution",
    });
    input.edges.push({
      from: commitId,
      to: interruptId,
      relation: "grants",
    });
  }
  return commitId;
}
