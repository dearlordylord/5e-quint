import { describe, expect, test } from "vitest";

import type { TraceNode } from "./tracer-model.ts";
import { traceAttachment } from "./tracer-attachments.ts";
import { traceEquipmentPredicate } from "./tracer-equipment-predicates.ts";
import { idGen } from "./tracer-rule-labels.ts";

describe("Surface attachment tracing", () => {
  test("traces mark, object, and spatial-manifestation attachments", () => {
    const nodes: TraceNode[] = [];
    const ids = idGen();
    const range = { kind: "point", feet: 60 } as const;

    traceAttachment(
      {
        kind: "mark",
        selection: { mode: "one" },
        transfer: {
          onEvent: { kind: "target_drops_to_0_hp" },
          availability: { kind: "after_trigger" },
          cost: { kind: "bonus_action" },
        },
      },
      range,
      nodes,
      ids,
    );
    traceAttachment(
      {
        kind: "mark",
        selection: { mode: "one" },
      },
      range,
      nodes,
      ids,
    );
    traceAttachment(
      {
        kind: "object",
        count: 2,
        filter: {
          objectKind: "weapon",
          magicality: "nonmagical",
        },
      },
      range,
      nodes,
      ids,
    );
    traceAttachment(
      {
        kind: "object",
        count: 1,
        filter: {},
      },
      range,
      nodes,
      ids,
    );
    traceAttachment(
      {
        kind: "spell_spatial_manifestation",
        manifestation: {
          creatureSize: "medium",
          appearance: "spectral_animals_pack",
          tangibility: "intangible",
          formChoice: {
            chooser: "caster",
            domain: "animal_form",
          },
        },
        placement: {
          kind: "visible_unoccupied_space_within_range",
          chooser: "caster",
        },
      },
      range,
      nodes,
      ids,
    );

    expect(nodes.map((node) => node.atomKind)).toEqual([
      "mark",
      "mark",
      "object",
      "object",
      "spell_spatial_manifestation",
    ]);
    expect(nodes[0]?.label).toContain("transfer on target drops to 0 HP");
    expect(nodes[2]?.label).toContain("2 objects");
    expect(nodes[3]?.label).toContain("object\n");
  });

  test("traces peering and weapon-wielding predicates", () => {
    const nodes: TraceNode[] = [];
    const ids = idGen();

    const predicateIds = [
      ...traceEquipmentPredicate({ kind: "peering_through_item" }, nodes, ids),
      ...traceEquipmentPredicate(
        { kind: "wielding_weapon", weaponKind: "melee_one_handed" },
        nodes,
        ids,
      ),
    ];

    expect(predicateIds).toHaveLength(2);
    expect(nodes.map((node) => node.atomKind)).toEqual([
      "peering_through_item",
      "wielding_weapon",
    ]);
  });
});
