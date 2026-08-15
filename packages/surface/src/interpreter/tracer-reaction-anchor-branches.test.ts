import { expect, test } from "vitest";

import type { TraceNode } from "./tracer-model.ts";
import { idGen } from "./tracer-rule-labels.ts";
import {
  describeAnchoredSignal,
  traceAnchorTarget,
} from "./tracer-spell-reactions-anchors.ts";

test("traces location anchors and non-waking mental signals", () => {
  const nodes: TraceNode[] = [];

  const anchorId = traceAnchorTarget(
    {
      kind: "location",
      description: "door_or_window",
    },
    { kind: "point", feet: 30 },
    nodes,
    idGen(),
  );

  expect(anchorId).toBe("anc1");
  expect(nodes).toEqual([
    {
      id: "anc1",
      category: "attachment",
      atomKind: "location",
      label: "location\ndoor_or_window\nrange 30 ft",
    },
  ]);
  expect(
    describeAnchoredSignal({
      kind: "mental",
      rangeFeet: 30,
      awakensIfAsleep: false,
    }),
  ).toBe("mental signal\nrange 30 ft");
});
