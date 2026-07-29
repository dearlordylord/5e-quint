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

function scalingTraceState(): {
  readonly nodes: TraceNode[];
  readonly edges: TraceEdge[];
} {
  return { nodes: [], edges: [] };
}

describe("Surface trace effect scaling", () => {
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
