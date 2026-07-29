import { describe, expect, test } from "vitest";

import earthquakeInput from "../../content/earthquake.json";
import powerWordKillInput from "../../content/power_word_kill.json";
import prismaticWallInput from "../../content/prismatic_wall.json";
import resistanceInput from "../../content/resistance.json";
import shillelaghInput from "../../content/shillelagh.json";
import tsunamiInput from "../../content/tsunami.json";
import wardingBondInput from "../../content/warding_bond.json";
import webInput from "../../content/web.json";
import { decodeUnitRecordSync } from "../surface/schema.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  traceEffectAtomScaling,
  traceUsageLimit,
} from "./tracer-effect-scaling.ts";
import { idGen } from "./tracer-rule-labels.ts";
import {
  describeTierOverride,
  scalingAtomFor,
  traceDiceAmountScaling,
  traceTargetCountScaling,
} from "./tracer-scaling.ts";

function scalingTraceState(): {
  readonly nodes: TraceNode[];
  readonly edges: TraceEdge[];
} {
  return { nodes: [], edges: [] };
}

describe("Surface trace effect scaling", () => {
  test("classifies every dice-scaling dimension", () => {
    expect(
      scalingAtomFor({ kind: "fixed", expr: { dice: 1, dieSize: 6 } }),
    ).toBe("scale_numeric_bonus");
    expect(
      scalingAtomFor({
        kind: "threshold_tiers",
        axis: "character",
        base: { dice: 1, dieSize: 6 },
        tiers: [{ atLevel: 5, override: { dieSize: 8 } }],
      }),
    ).toBe("scale_die_size");
    expect(
      scalingAtomFor({
        kind: "threshold_tiers",
        axis: "character",
        base: { dice: 1, dieSize: 6 },
        tiers: [{ atLevel: 5, override: { dice: 2 } }],
      }),
    ).toBe("scale_die_count");
    expect(
      scalingAtomFor({
        kind: "threshold_tiers",
        axis: "character",
        base: { dice: 1, dieSize: 6 },
        tiers: [{ atLevel: 5, override: { flat: 1 } }],
      }),
    ).toBe("scale_numeric_bonus");
    expect(scalingAtomFor({ kind: "proficiency_bonus" })).toBe(
      "scale_numeric_bonus",
    );
    expect(
      scalingAtomFor({
        kind: "linear_per_level",
        axis: "slot",
        base: { dice: 1, dieSize: 6 },
        perLevel: { dieSize: 2 },
        startingAtLevel: 2,
      }),
    ).toBe("scale_die_size");
    expect(
      scalingAtomFor({
        kind: "linear_per_level",
        axis: "slot",
        base: { dice: 1, dieSize: 6 },
        perLevel: { dice: 1 },
        startingAtLevel: 2,
      }),
    ).toBe("scale_die_count");
    expect(
      scalingAtomFor({
        kind: "resource_spent_linear",
        base: { dice: 1, dieSize: 6 },
        perResource: { dieSize: 2 },
      }),
    ).toBe("scale_die_size");
    expect(
      scalingAtomFor({
        kind: "resource_spent_linear",
        base: { dice: 1, dieSize: 6 },
        perResource: { dice: 1 },
      }),
    ).toBe("scale_die_count");
    expect(
      scalingAtomFor({
        kind: "resource_spent_linear",
        base: { dice: 1, dieSize: 6 },
        perResource: { flat: 1 },
      }),
    ).toBe("scale_numeric_bonus");
    expect(
      describeTierOverride(
        { dice: 2, dieSize: 8, flat: 0 },
        { dice: 1, dieSize: 6, flat: 3 },
      ),
    ).toBe("2d8");
    expect(describeTierOverride({}, { dice: 1, dieSize: 6, flat: 2 })).toBe(
      "1d6+2",
    );
  });

  test("threads slot scaling only when a slot node exists", () => {
    const { nodes, edges } = scalingTraceState();
    const ids = idGen();

    traceDiceAmountScaling(
      {
        kind: "threshold_tiers",
        axis: "character",
        base: { dice: 1, dieSize: 6 },
        tiers: [{ atLevel: 5, override: { dice: 2 } }],
      },
      "character-effect",
      "slot",
      nodes,
      edges,
      ids,
    );
    traceDiceAmountScaling(
      {
        kind: "threshold_tiers",
        axis: "slot",
        base: { dice: 1, dieSize: 6 },
        tiers: [{ atLevel: 5, override: { dice: 2 } }],
      },
      "slot-tier-without-slot",
      null,
      nodes,
      edges,
      ids,
    );
    traceDiceAmountScaling(
      {
        kind: "threshold_tiers",
        axis: "slot",
        base: { dice: 1, dieSize: 6 },
        tiers: [{ atLevel: 5, override: { dice: 2 } }],
      },
      "slot-tier-with-slot",
      "slot",
      nodes,
      edges,
      ids,
    );
    traceDiceAmountScaling(
      {
        kind: "linear_per_level",
        axis: "slot",
        base: { dice: 1, dieSize: 6 },
        perLevel: { dice: 1 },
        startingAtLevel: 2,
      },
      "slot-effect",
      null,
      nodes,
      edges,
      ids,
    );
    traceDiceAmountScaling(
      {
        kind: "threshold_tiers_exploding_max_die",
        axis: "slot",
        baseDice: 1,
        dieSize: 6,
        tiers: [{ atLevel: 5, dice: 2 }],
        maxAdditionalDice: "spellcasting_ability_modifier",
      },
      "exploding-effect",
      "slot",
      nodes,
      edges,
      ids,
    );
    traceDiceAmountScaling(
      {
        kind: "resource_spent_linear",
        base: { dice: 1, dieSize: 6 },
        perResource: { flat: 1 },
      },
      "resource-effect",
      null,
      nodes,
      edges,
      ids,
    );

    expect(nodes).toHaveLength(6);
    expect(
      edges.filter(
        (edge) => edge.from === "slot" && edge.relation === "modifies",
      ),
    ).toHaveLength(2);
  });

  test("omits target-count scaling for attachments without target selection", () => {
    const { nodes, edges } = scalingTraceState();

    traceTargetCountScaling(
      { kind: "self" },
      "attachment",
      null,
      nodes,
      edges,
      idGen(),
    );

    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  test("walks nested activation effect scaling", () => {
    const unit = decodeUnitRecordSync(powerWordKillInput);
    if (
      unit.kind !== "spell" ||
      unit.mechanics.family !== "activation" ||
      unit.mechanics.phases[0].kind !== "direct"
    ) {
      throw new Error("decoded Power Word Kill activation changed shape");
    }
    const effect = unit.mechanics.phases[0].effects?.[0];
    if (effect?.kind !== "conditional_by_current_hp") {
      throw new Error("decoded Power Word Kill threshold effect changed shape");
    }
    const { nodes, edges } = scalingTraceState();

    traceEffectAtomScaling(effect, "effect", null, nodes, edges, idGen());

    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  test("walks ordered barrier layers and their nested saves", () => {
    const unit = decodeUnitRecordSync(prismaticWallInput);
    if (unit.kind !== "spell" || unit.mechanics.family !== "ongoing_effect") {
      throw new Error("decoded Prismatic Wall mechanics changed shape");
    }
    const effect = unit.mechanics.operations[4]?.effect;
    if (effect?.kind !== "ordered_barrier_layers") {
      throw new Error("decoded Prismatic Wall barrier effect changed shape");
    }
    const { nodes, edges } = scalingTraceState();

    traceEffectAtomScaling(effect, "effect", null, nodes, edges, idGen());

    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  test("walks area-height and structure-damage scaling", () => {
    const tsunami = decodeUnitRecordSync(tsunamiInput);
    const earthquake = decodeUnitRecordSync(earthquakeInput);
    if (
      tsunami.kind !== "spell" ||
      tsunami.mechanics.family !== "ongoing_effect" ||
      earthquake.kind !== "spell" ||
      earthquake.mechanics.family !== "ongoing_effect"
    ) {
      throw new Error("decoded area spell mechanics changed shape");
    }
    const reduceHeight = tsunami.mechanics.operations[3]?.effect;
    const structureDamage = earthquake.mechanics.operations[3]?.effect;
    if (
      reduceHeight?.kind !== "reduce_area_height" ||
      structureDamage?.kind !== "composite"
    ) {
      throw new Error("decoded area scaling effects changed shape");
    }
    const { nodes, edges } = scalingTraceState();

    traceEffectAtomScaling(
      reduceHeight,
      "tsunami",
      null,
      nodes,
      edges,
      idGen(),
    );
    traceEffectAtomScaling(
      structureDamage,
      "earthquake",
      null,
      nodes,
      edges,
      idGen(),
    );

    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  test("walks scaling for fire-damaged area sections", () => {
    const unit = decodeUnitRecordSync(webInput);
    if (unit.kind !== "spell" || unit.mechanics.family !== "ongoing_effect") {
      throw new Error("decoded Web mechanics changed shape");
    }
    const effect = unit.mechanics.operations[3]?.effect;
    if (effect?.kind !== "area_section_burns_away") {
      throw new Error("decoded Web fire exposure effect changed shape");
    }
    const { nodes, edges } = scalingTraceState();

    traceEffectAtomScaling(effect, "effect", null, nodes, edges, idGen());

    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  test("walks damage reduction, weapon override, and shared damage", () => {
    const resistance = decodeUnitRecordSync(resistanceInput);
    const shillelagh = decodeUnitRecordSync(shillelaghInput);
    const wardingBond = decodeUnitRecordSync(wardingBondInput);
    if (
      resistance.kind !== "spell" ||
      resistance.mechanics.family !== "ongoing_effect" ||
      shillelagh.kind !== "spell" ||
      shillelagh.mechanics.family !== "ongoing_effect" ||
      wardingBond.kind !== "spell" ||
      wardingBond.mechanics.family !== "ongoing_effect"
    ) {
      throw new Error("decoded scaling spell mechanics changed shape");
    }
    const damageReduction = resistance.mechanics.operations[0]?.effect;
    const weaponOverride = shillelagh.mechanics.operations[0]?.effect;
    const sharedDamage = wardingBond.mechanics.operations[3]?.effect;
    if (
      damageReduction?.kind !== "reduce_damage_taken" ||
      weaponOverride?.kind !== "override_attached_weapon_attack" ||
      sharedDamage?.kind !== "share_damage_to_caster"
    ) {
      throw new Error("decoded scaling effects changed shape");
    }
    const { nodes, edges } = scalingTraceState();
    const ids = idGen();

    traceEffectAtomScaling(
      damageReduction,
      "resistance",
      null,
      nodes,
      edges,
      ids,
    );
    traceEffectAtomScaling(
      weaponOverride,
      "shillelagh",
      null,
      nodes,
      edges,
      ids,
    );
    traceEffectAtomScaling(
      sharedDamage,
      "warding_bond",
      null,
      nodes,
      edges,
      ids,
    );

    expect(nodes).toEqual([
      expect.objectContaining({ atomKind: "scale_die_size" }),
    ]);
    expect(edges).toEqual([
      expect.objectContaining({
        relation: "modifies",
        to: "shillelagh",
      }),
    ]);
  });

  test("reuses a consistent usage-limit group", () => {
    const { nodes, edges } = scalingTraceState();
    const ids = idGen();
    const limit = {
      kind: "once_per_turn",
      limitGroup: "synthetic_shared_limit",
    } as const;

    expect(
      traceUsageLimit(limit, "first", "limited_by", nodes, edges, ids),
    ).toBe("synthetic_shared_limit");
    expect(
      traceUsageLimit(limit, "second", "limited_by", nodes, edges, ids),
    ).toBe("synthetic_shared_limit");
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(2);
  });
});
