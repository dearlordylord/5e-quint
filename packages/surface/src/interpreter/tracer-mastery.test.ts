import { describe, expect, test } from "vitest";

import grazeInput from "../../content/mastery_graze.json";
import nickInput from "../../content/mastery_nick.json";
import vexInput from "../../content/mastery_vex.json";
import { decodeUnitRecordSync } from "../surface/schema.ts";
import { traceUnit } from "./tracer-public.ts";

type TraceProjection = {
  readonly unitId: string;
  readonly atomKinds: ReadonlyArray<string>;
  readonly nodes: ReadonlyArray<{
    readonly category: string;
    readonly atomKind: string;
    readonly label: string;
  }>;
  readonly edges: ReadonlyArray<{
    readonly from: number;
    readonly to: number;
    readonly relation: string;
  }>;
};

function traceProjection(input: unknown): TraceProjection {
  const trace = traceUnit(decodeUnitRecordSync(input));
  const nodeIndexById = new Map(
    trace.nodes.map((node, index) => [node.id, index] as const),
  );
  const nodeIndex = (id: string): number => {
    const index = nodeIndexById.get(id);
    if (index === undefined) {
      throw new Error(`Trace edge points at missing node ${id}`);
    }
    return index;
  };

  return {
    unitId: trace.unitId,
    atomKinds: trace.atomKinds,
    nodes: trace.nodes.map(({ category, atomKind, label }) => ({
      category,
      atomKind,
      label,
    })),
    edges: trace.edges.map(({ from, to, relation }) => ({
      from: nodeIndex(from),
      to: nodeIndex(to),
      relation,
    })),
  };
}

describe("Surface Weapon Mastery trace projections", () => {
  test("projects Graze's miss damage rule exactly", () => {
    expect(traceProjection(grazeInput)).toEqual({
      unitId: "mastery_graze",
      atomKinds: [
        "attack_roll",
        "damage",
        "mastery_root",
        "on_miss_window",
        "target",
      ],
      nodes: [
        {
          category: "source",
          atomKind: "mastery_root",
          label: "mastery_root\nGraze",
        },
        {
          category: "resolution",
          atomKind: "attack_roll",
          label: "attack_roll\nweapon attack miss",
        },
        {
          category: "window",
          atomKind: "on_miss_window",
          label: "on_miss_window\n(wielder choice)",
        },
        {
          category: "attachment",
          atomKind: "target",
          label: "target\n(primary)",
        },
        {
          category: "effect",
          atomKind: "damage",
          label:
            "damage\nattack_ability_modifier\nweapon_damage_type\nattack_ability_modifier_only",
        },
      ],
      edges: [
        { from: 1, to: 2, relation: "opens_window" },
        { from: 1, to: 3, relation: "attaches_to" },
        { from: 2, to: 4, relation: "grants" },
        { from: 4, to: 3, relation: "attaches_to" },
        { from: 0, to: 1, relation: "roots" },
      ],
    });
  });

  test("projects Nick's Light extra-attack timing rule exactly", () => {
    expect(traceProjection(nickInput)).toEqual({
      unitId: "mastery_nick",
      atomKinds: [
        "action_timing_replacement",
        "light_property_extra_attack",
        "mastery_root",
        "use_count",
      ],
      nodes: [
        {
          category: "source",
          atomKind: "mastery_root",
          label: "mastery_root\nNick",
        },
        {
          category: "window",
          atomKind: "light_property_extra_attack",
          label: "light_property_extra_attack\noptional true",
        },
        {
          category: "effect",
          atomKind: "action_timing_replacement",
          label: "action_timing_replacement\nbonus_action -> attack_action",
        },
        {
          category: "resource",
          atomKind: "use_count",
          label: "use_count\nonce per turn",
        },
      ],
      edges: [
        { from: 1, to: 2, relation: "replaces_with" },
        { from: 2, to: 3, relation: "consumes" },
        { from: 0, to: 1, relation: "roots" },
      ],
    });
  });

  test("projects Vex's hit advantage window exactly", () => {
    expect(traceProjection(vexInput)).toEqual({
      unitId: "mastery_vex",
      atomKinds: [
        "attack_roll",
        "mastery_root",
        "modify_roll_advantage",
        "on_hit_window",
        "target",
        "turn_end_window",
      ],
      nodes: [
        {
          category: "source",
          atomKind: "mastery_root",
          label: "mastery_root\nVex",
        },
        {
          category: "resolution",
          atomKind: "attack_roll",
          label: "attack_roll\n(weapon hit with damage)",
        },
        {
          category: "window",
          atomKind: "on_hit_window",
          label: "on_hit_window",
        },
        {
          category: "attachment",
          atomKind: "target",
          label: "target\n(primary)",
        },
        {
          category: "effect",
          atomKind: "modify_roll_advantage",
          label: "modify_roll_advantage\nadvantage on attack_roll ×1",
        },
        {
          category: "window",
          atomKind: "turn_end_window",
          label: "turn_end_window\n(attacker's next turn)",
        },
      ],
      edges: [
        { from: 1, to: 2, relation: "opens_window" },
        { from: 1, to: 3, relation: "attaches_to" },
        { from: 2, to: 4, relation: "grants" },
        { from: 4, to: 3, relation: "attaches_to" },
        { from: 4, to: 5, relation: "persists_until" },
        { from: 0, to: 1, relation: "roots" },
      ],
    });
  });
});
