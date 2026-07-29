import { describe, expect, test } from "vitest";

import { srdUnitCollection } from "../surface/unit-catalog.ts";
import type {
  ClassFeatureMechanics,
  MagicItemMechanics,
} from "../surface/types.ts";
import {
  describeCommandCost,
  describeCommandRange,
  maTag,
} from "./tracer-creature-actions.ts";
import { formatPrimaryAbilityExpression } from "./tracer-character-sources.ts";
import { traceActionRestriction } from "./tracer-action-restrictions.ts";
import { traceEffectModeChoice } from "./tracer-activation.ts";
import { traceDuration } from "./tracer-duration.ts";
import {
  describeFeatureChoiceChange,
  describePassiveOperationWindow,
  traceClassFeatureMechanics,
} from "./tracer-feature-mechanics.ts";
import { traceMagicItemMechanics } from "./tracer-feature-sources.ts";
import { traceRiderExpiry } from "./tracer-mastery.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import { idGen } from "./tracer-rule-labels.ts";

describe("Surface trace helper branches", () => {
  test("describes optional creature-control facts", () => {
    const actionControl = {
      initiative: "own_roll",
      commandCost: { kind: "action" },
    } as const;

    expect(maTag(undefined)).toBe("");
    expect(maTag({ kind: "literal", value: 2 })).toBe("\nmultiattack ×2");
    expect(describeCommandCost(actionControl)).toBe("action");
    expect(describeCommandRange(actionControl)).toBe("range unspecified");
  });

  test("describes both primary-ability expression kinds", () => {
    expect(
      formatPrimaryAbilityExpression({
        kind: "all_of",
        abilities: ["str", "dex"],
      }),
    ).toBe("str and dex");
    expect(
      formatPrimaryAbilityExpression({
        kind: "any_of",
        abilities: ["int", "wis"],
      }),
    ).toBe("int or wis");
  });

  test("keeps unrestricted actions and permanent duration terse", () => {
    const nodes: TraceNode[] = [];
    const edges: TraceEdge[] = [];
    const ids = idGen();

    traceActionRestriction({ kind: "none" }, "target", nodes, edges, ids);
    traceDuration({ kind: "permanent" }, "procedure", nodes, edges, ids);

    expect(nodes.map((node) => node.label)).toEqual(["persist\npermanent"]);
    expect(edges).toEqual([
      expect.objectContaining({ from: "procedure", relation: "grants" }),
    ]);
  });

  test("omits null outcomes from activation effect modes", () => {
    const nodes: TraceNode[] = [];
    const edges: TraceEdge[] = [];

    traceEffectModeChoice(
      {
        label: "Synthetic mode",
        options: [
          {
            id: "synthetic_none",
            displayName: "No Effect",
            effects: [{ kind: "none" }],
          },
        ],
      },
      "procedure",
      "attachment",
      null,
      nodes,
      edges,
      idGen(),
    );

    expect(nodes.some((node) => node.atomKind === "none")).toBe(false);
  });

  test("describes both feature-choice replacement cadences", () => {
    expect(describeFeatureChoiceChange({ kind: "never" })).toBe(
      "no replacement",
    );
    expect(describeFeatureChoiceChange({ kind: "class_level", count: 1 })).toBe(
      "change 1 on class_level",
    );
  });

  test("describes singular and conditional passive windows", () => {
    expect(
      describePassiveOperationWindow({
        trigger: { kind: "elapsed_time", amount: 1, unit: "hour" },
        effect: { kind: "none" },
      }),
    ).toBe("duration_window\nevery 1 hour");
    expect(
      describePassiveOperationWindow({
        trigger: { kind: "elapsed_time", amount: 2, unit: "day" },
        predicate: {
          kind: "at_hp_threshold",
          comparison: "lte",
          threshold: 1,
        },
        effect: { kind: "none" },
      }),
    ).toBe("duration_window\nevery 2 days\nif HP <= 1");
  });

  test("traces every admitted composite class-feature family", () => {
    const mechanicsFor = <Family extends ClassFeatureMechanics["family"]>(
      family: Family,
    ): Extract<ClassFeatureMechanics, { readonly family: Family }> => {
      const unit = srdUnitCollection.units.find(
        (candidate) =>
          candidate.kind === "class_feature" &&
          candidate.mechanics.family === family,
      );
      if (
        unit === undefined ||
        unit.kind !== "class_feature" ||
        unit.mechanics.family !== family
      ) {
        throw new Error(`Missing canonical ${family} mechanics fixture`);
      }
      // The decoded Unit and immediately preceding family guard establish the
      // generic Extract branch; TypeScript does not preserve that correlation.
      return unit.mechanics as Extract<
        ClassFeatureMechanics,
        { readonly family: Family }
      >;
    };
    const parts = [
      mechanicsFor("passive"),
      mechanicsFor("activation"),
      mechanicsFor("alternate_action_cost"),
      mechanicsFor("on_hit_trigger"),
      mechanicsFor("save_damage_replacement"),
      mechanicsFor("reaction_roll_or_damage_reduction"),
    ] as const;
    const nodes: TraceNode[] = [];
    const edges: TraceEdge[] = [];

    traceClassFeatureMechanics(
      { family: "composite", parts },
      nodes,
      edges,
      idGen(),
    );

    expect(nodes.length).toBeGreaterThan(parts.length);
  });

  test("traces every admitted composite magic-item family", () => {
    const mechanicsFor = <Family extends MagicItemMechanics["family"]>(
      family: Family,
    ): Extract<MagicItemMechanics, { readonly family: Family }> => {
      for (const unit of srdUnitCollection.units) {
        if (
          unit.kind === "magic_item" &&
          !("variants" in unit) &&
          unit.mechanics.family === family
        ) {
          // The decoded Unit and local family guard establish the requested
          // generic Extract branch; TypeScript does not preserve the correlation.
          return unit.mechanics as Extract<
            MagicItemMechanics,
            { readonly family: Family }
          >;
        }
        if (unit.kind === "class_feature" && unit.mechanics.family === family) {
          // Magic-item composite components reuse this decoded mechanics shape;
          // the local family guard establishes the requested Extract branch.
          return unit.mechanics as Extract<
            MagicItemMechanics,
            { readonly family: Family }
          >;
        }
      }
      throw new Error(`Missing canonical ${family} mechanics fixture`);
    };
    const onHitUnit = srdUnitCollection.units.find(
      (unit) =>
        unit.kind === "mastery" && unit.mechanics.family === "on_hit_trigger",
    );
    if (
      onHitUnit === undefined ||
      onHitUnit.kind !== "mastery" ||
      onHitUnit.mechanics.family !== "on_hit_trigger"
    ) {
      throw new Error("Missing canonical on-hit mechanics fixture");
    }
    // The schema deliberately shares mastery on-hit mechanics with magic-item
    // composite parts; the decoded kind/family guard proves this branch.
    const onHit = onHitUnit.mechanics as Extract<
      MagicItemMechanics,
      { readonly family: "on_hit_trigger" }
    >;
    const activation = mechanicsFor("activation");
    if (activation.resource === undefined || activation.phases === undefined) {
      throw new Error(
        "Canonical magic-item activation fixture lacks reaction prelude facts",
      );
    }
    const triggeredReaction = {
      ...activation,
      family: "triggered_reaction",
      activationCost: { kind: "reaction" },
      resource: activation.resource,
      phases: activation.phases,
      range: { kind: "self" },
      interruptsTrigger: true,
    } as const satisfies Extract<
      MagicItemMechanics,
      { readonly family: "triggered_reaction" }
    >;
    const parts = [
      mechanicsFor("passive"),
      activation,
      triggeredReaction,
      onHit,
    ] as const;
    const nodes: TraceNode[] = [];
    const edges: TraceEdge[] = [];
    const ids = idGen();

    traceMagicItemMechanics(onHit, nodes, edges, ids);
    traceMagicItemMechanics({ family: "composite", parts }, nodes, edges, ids);

    expect(nodes.length).toBeGreaterThan(parts.length);
  });

  test("traces remaining rider expiries and optional feat labels", () => {
    const nodes: TraceNode[] = [];
    const edges: TraceEdge[] = [];
    const ids = idGen();

    traceRiderExpiry({ kind: "end_of_next_turn" }, "effect", nodes, edges, ids);
    traceRiderExpiry(
      { kind: "caster_turn_start" },
      "effect",
      nodes,
      edges,
      ids,
    );

    expect(nodes).toHaveLength(2);
  });
});
