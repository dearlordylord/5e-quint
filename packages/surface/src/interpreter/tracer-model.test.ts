import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { finalizeTrace, traceNodeId, type TraceDraft } from "./tracer-model.ts";
import type { Trace } from "./tracer.ts";

const compileTraceBoundary = (
  traceDraft: TraceDraft,
  consumeFinalizedTrace: (trace: Trace) => void,
): void => {
  // @ts-expect-error A draft cannot cross the renderer/finalized-trace boundary.
  consumeFinalizedTrace(traceDraft);
};
void compileTraceBoundary;

const node = (id: string) => ({
  id: traceNodeId(id),
  category: "source" as const,
  atomKind: "test_node",
  label: id,
});

describe("Surface trace finalization", () => {
  test("accumulates duplicate IDs and both missing edge endpoints", () => {
    const draft: TraceDraft = {
      unitId: "synthetic_trace",
      unitName: "Synthetic Trace",
      nodes: [node("root"), node("root")],
      edges: [
        {
          from: traceNodeId("missing_from"),
          to: traceNodeId("missing_to"),
          relation: "references",
        },
      ],
    };

    const result = finalizeTrace(draft);

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure).toEqual([
      { code: "duplicate_node_id", id: traceNodeId("root"), nodeIndex: 1 },
      {
        code: "missing_edge_endpoint",
        endpoint: "from",
        edgeIndex: 0,
        id: traceNodeId("missing_from"),
      },
      {
        code: "missing_edge_endpoint",
        endpoint: "to",
        edgeIndex: 0,
        id: traceNodeId("missing_to"),
      },
    ]);
  });

  test("finalizes a graph with unique, present endpoints", () => {
    const draft: TraceDraft = {
      unitId: "synthetic_trace",
      unitName: "Synthetic Trace",
      nodes: [node("root"), node("child")],
      edges: [
        {
          from: traceNodeId("root"),
          to: traceNodeId("child"),
          relation: "roots",
        },
      ],
    };

    const result = finalizeTrace(draft);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) return;
    expect(result.success).toMatchObject(draft);
  });
});
