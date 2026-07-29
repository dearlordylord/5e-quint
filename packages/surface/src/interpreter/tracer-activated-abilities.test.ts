import { describe, expect, test } from "vitest";

import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeUseCountCap,
  traceActivationCost,
  traceActivationResource,
  traceResetCadence,
} from "./tracer-activated-abilities.ts";
import { idGen } from "./tracer-rule-labels.ts";

function traceState(): {
  readonly nodes: TraceNode[];
  readonly edges: TraceEdge[];
} {
  return { nodes: [], edges: [] };
}

describe("Surface activated-ability tracing", () => {
  test("traces a sequenced Action plus Bonus Action activation", () => {
    const { nodes, edges } = traceState();

    traceActivationCost(
      { kind: "action_plus_bonus_action" },
      "procedure",
      nodes,
      edges,
      idGen(),
    );

    expect(nodes.map((node) => node.atomKind)).toEqual([
      "action_quota",
      "bonus_action_quota",
    ]);
    expect(edges).toHaveLength(2);
  });

  test("describes singular study windows and uncapped ability modifiers", () => {
    const { nodes, edges } = traceState();

    traceActivationCost(
      { kind: "study", hours: 1, withinDays: 1 },
      "procedure",
      nodes,
      edges,
      idGen(),
    );

    expect(nodes[0]?.label).toContain("within 1 day");
    expect(
      describeUseCountCap({
        kind: "ability_modifier",
        ability: "wis",
      }),
    ).toBe("max = WIS modifier");
  });

  test("traces optional charge-pool initialization and lifetime limits", () => {
    const { nodes, edges } = traceState();

    const resourceId = traceActivationResource(
      {
        kind: "charge_pool",
        cap: { kind: "fixed", uses: 5 },
        initialCount: {
          kind: "fixed",
          expr: { dice: 1, dieSize: 4, flat: 1 },
        },
        lifetimeAbsorptionCap: 20,
      },
      nodes,
      edges,
      idGen(),
    );

    expect(resourceId).toBe("pool1");
    expect(nodes[0]?.label).toContain("initial 1d4+1");
    expect(nodes[0]?.label).toContain("lifetime absorb <= 20");
  });

  test("traces every time and combined-rest reset cadence", () => {
    const { nodes, edges } = traceState();
    const ids = idGen();

    traceResetCadence(
      { kind: "short_or_long_rest" },
      "resource",
      nodes,
      edges,
      ids,
    );
    traceResetCadence({ kind: "century" }, "resource", nodes, edges, ids);
    traceResetCadence(
      {
        kind: "elapsed_days",
        days: 3,
        regain: {
          kind: "fixed",
          expr: { dice: 1, dieSize: 4 },
        },
        startsWhen: "resource_empty",
      },
      "resource",
      nodes,
      edges,
      ids,
    );
    traceResetCadence(
      {
        kind: "elapsed_hours",
        hours: 1,
      },
      "resource",
      nodes,
      edges,
      ids,
    );
    traceResetCadence(
      {
        kind: "elapsed_hours",
        hours: 8,
        regain: {
          kind: "fixed",
          expr: { dice: 1, dieSize: 6 },
        },
      },
      "resource",
      nodes,
      edges,
      ids,
    );

    expect(nodes.map((node) => node.atomKind)).toEqual([
      "rest_window",
      "rest_window",
      "duration_window",
      "duration_window",
      "duration_window",
      "duration_window",
    ]);
    expect(nodes.some((node) => node.label.includes("after pool empty"))).toBe(
      true,
    );
    expect(edges).toHaveLength(6);
  });
});
