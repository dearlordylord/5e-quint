import { describe, expect, test } from "vitest";

import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import { idGen } from "./tracer-rule-labels.ts";
import {
  traceMarkAttachmentEffects,
  traceOngoingOpEffect,
  traceOngoingSpecialFunction,
  traceOngoingTrigger,
} from "./tracer-spell-ongoing.ts";

function traceState(): {
  readonly nodes: TraceNode[];
  readonly edges: TraceEdge[];
} {
  return { nodes: [], edges: [] };
}

describe("Surface ongoing trace branches", () => {
  test("preserves special-function nesting and authored order", () => {
    const { nodes, edges } = traceState();
    const ids = idGen();
    const functions = [
      {
        kind: "end_source_scoped_relevant_effects",
        action: "magic",
        target: { kind: "touched_creature" },
        conditions: ["charmed"],
        possession: "included",
      },
      {
        kind: "dismiss_creature_to_home_plane",
        action: "magic",
        target: { kind: "visible_creature_within_feet", feet: 5 },
        save: {
          ability: "cha",
          dc: { kind: "caster_spell_save_dc" },
          onFailure: {
            kind: "send_to_home_plane_if_not_already_there",
            creatureTypeDestinationOverrides: [
              { creatureType: "undead", destination: "shadowfell" },
              { creatureType: "fey", destination: "feywild" },
            ],
          },
        },
      },
    ] as const;

    for (const specialFunction of functions) {
      traceOngoingSpecialFunction(
        specialFunction,
        "creature-type-ward",
        nodes,
        edges,
        ids,
      );
    }

    const procedureNodes = nodes.filter(
      (node) => node.category === "procedure",
    );
    expect(procedureNodes.map((node) => node.atomKind)).toEqual(
      functions.map(({ kind }) => kind),
    );
    expect(
      procedureNodes.every((procedure) =>
        edges.some(
          (edge) =>
            edge.from === "creature-type-ward" &&
            edge.to === procedure.id &&
            edge.relation === "offers",
        ),
      ),
    ).toBe(true);
    expect(
      nodes.filter((node) => node.atomKind === "end_current_spell"),
    ).toHaveLength(2);
    expect(
      procedureNodes.every(
        (procedure) =>
          edges.filter(
            (edge) => edge.from === procedure.id && edge.relation === "ends",
          ).length === 1,
      ),
    ).toBe(true);
    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relation: "resolves_via" }),
        expect.objectContaining({ relation: "on_failure" }),
      ]),
    );
  });

  test("recognizes a direct mark attachment", () => {
    const { nodes, edges } = traceState();

    traceMarkAttachmentEffects(
      { kind: "mark", selection: { mode: "one" } },
      "procedure",
      "attachment",
      nodes,
      edges,
      idGen(),
    );

    expect(nodes.map((node) => node.atomKind)).toEqual(["mark_target"]);
  });

  test("traces optional trigger-label facts when omitted", () => {
    const { nodes, edges } = traceState();
    const ids = idGen();
    const triggers = [
      {
        kind: "on_caster_deals_damage_to_attachment",
        damageSource: ["spell"],
      },
      { kind: "on_attached_hit_by_attack_roll" },
      { kind: "on_creature_moves" },
      {
        kind: "on_spatial_manifestation_moves_within_distance_of_creature",
        distanceFeet: 10,
      },
      {
        kind: "on_creature_enters_distance_of_spatial_manifestation",
        distanceFeet: 10,
      },
      {
        kind: "on_creature_ends_turn_within_distance_of_spatial_manifestation",
        distanceFeet: 10,
      },
    ] as const;

    for (const trigger of triggers) {
      traceOngoingTrigger(trigger, "procedure", nodes, edges, ids);
    }

    expect(nodes).toHaveLength(triggers.length);
    expect(nodes.every((node) => !node.label.includes("visible"))).toBe(true);
  });

  test("keeps null outcome branches out of the ongoing graph", () => {
    const { nodes, edges } = traceState();
    const ids = idGen();
    const range = { kind: "self" } as const;

    traceOngoingOpEffect(
      {
        kind: "attack_roll",
        attackKind: "melee_spell_attack",
        onHit: [{ kind: "none" }],
        onMiss: [
          { kind: "none" },
          { kind: "apply_condition", condition: "prone" },
        ],
      },
      "host",
      "grants",
      "attachment",
      null,
      range,
      nodes,
      edges,
      ids,
    );
    traceOngoingOpEffect(
      {
        kind: "ability_check_gate",
        ability: "caster_spellcasting_ability",
        dc: { kind: "innate_dc", base: 8, ability: "wis" },
        onPass: { kind: "none" },
        onFail: { kind: "apply_condition", condition: "prone" },
      },
      "host",
      "grants",
      "attachment",
      null,
      range,
      nodes,
      edges,
      ids,
    );
    traceOngoingOpEffect(
      {
        kind: "ability_check_gate",
        ability: "caster_spellcasting_ability",
        dc: { kind: "innate_dc", base: 8, ability: "wis" },
        onPass: { kind: "none" },
        onFail: { kind: "none" },
      },
      "host",
      "grants",
      "attachment",
      null,
      range,
      nodes,
      edges,
      ids,
    );
    traceOngoingOpEffect(
      { kind: "none" },
      "host",
      "grants",
      "attachment",
      null,
      range,
      nodes,
      edges,
      ids,
    );
    traceOngoingOpEffect(
      {
        kind: "modify_max_hp",
        direction: "increase",
        delta: {
          kind: "fixed",
          expr: { dice: 0, dieSize: 1, flat: 1 },
        },
      },
      "host",
      "grants",
      "attachment",
      null,
      range,
      nodes,
      edges,
      ids,
    );

    expect(nodes.some((node) => node.atomKind === "modify_max_hp")).toBe(true);
  });
});
