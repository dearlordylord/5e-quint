import { Option } from "effect";

import type {
  Ability,
  ActionRestriction,
  DamageTypeRef,
  ThresholdTiers,
} from "@dnd/prototype-content-surface/surface/types";

import type {
  Combatant,
  BattleUnitAccessId,
  BattleUnitResourceState,
} from "#/battle-types.ts";
import type { RuntimeUnitAccess, SurfaceUnit } from "#/types.ts";

export type SurfaceUnitInterpretation =
  | {
      readonly tag: "singleTargetHeal";
      readonly targeting: {
        readonly tag: "touchCreature";
      };
    }
  | {
      readonly tag: "areaSaveDamage";
      readonly targeting: {
        readonly tag: "pointWithinRangeSphere";
        readonly rangeFeet: number;
        readonly radiusFeet: number;
      };
      readonly saveAbility: Ability;
      readonly damageType: DamageTypeRef;
    }
  | {
      readonly tag: "grantExtraAction";
      readonly restriction: ActionRestriction;
      readonly useCountCap: ThresholdTiers<number>;
      readonly usageLimit: "once_per_turn";
    };

function resolveUseCountCap(
  cap: ThresholdTiers<number>,
  currentLevel: number,
): number {
  return [...cap.tiers]
    .sort((left, right) => right.atLevel - left.atLevel)
    .find((tier) => tier.atLevel <= currentLevel)?.value ?? cap.base;
}

function interpretSpell(unit: Extract<SurfaceUnit, { readonly kind: "spell" }>) {
  if (
    unit.mechanics.family !== "activation" ||
    unit.mechanics.castingTime.kind !== "action"
  ) {
    return Option.none<SurfaceUnitInterpretation>();
  }

  const [phase] = unit.mechanics.phases;
  if (unit.mechanics.phases.length !== 1 || phase === undefined) {
    return Option.none<SurfaceUnitInterpretation>();
  }

  if (
    phase.kind === "direct" &&
    phase.attachment.kind === "target" &&
    phase.attachment.selection.mode === "one"
  ) {
    const [effect] = phase.effects ?? [];
    if (
      (phase.effects?.length ?? 0) === 1 &&
      effect?.kind === "heal_hp" &&
      effect.target === "target_creature" &&
      unit.mechanics.range.kind === "touch"
    ) {
      return Option.some(
        {
          tag: "singleTargetHeal",
          targeting: {
            tag: "touchCreature",
          },
        } satisfies SurfaceUnitInterpretation,
      );
    }
  }

  if (
    phase.kind === "save_gate" &&
    phase.attachment.kind === "area" &&
    phase.attachment.origin.kind === "point_within_range" &&
    phase.attachment.shape.kind === "sphere" &&
    phase.onFail.kind === "damage" &&
    phase.onSuccess.kind === "half_damage" &&
    unit.mechanics.range.kind === "point"
  ) {
    return Option.some(
      {
        tag: "areaSaveDamage",
        targeting: {
          tag: "pointWithinRangeSphere",
          rangeFeet: unit.mechanics.range.feet,
          radiusFeet: phase.attachment.shape.radiusFeet,
        },
        saveAbility: phase.ability,
        damageType: phase.onFail.damageType,
      } satisfies SurfaceUnitInterpretation,
    );
  }

  return Option.none<SurfaceUnitInterpretation>();
}

function interpretClassFeature(
  unit: Extract<SurfaceUnit, { readonly kind: "class_feature" }>,
) {
  if (
    unit.mechanics.family !== "activation" ||
    unit.mechanics.activationCost.kind !== "free" ||
    unit.mechanics.usageLimit?.kind !== "once_per_turn" ||
    unit.mechanics.resource?.kind !== "use_count" ||
    unit.mechanics.resource.cap.kind !== "threshold_tiers"
  ) {
    return Option.none<SurfaceUnitInterpretation>();
  }

  const [phase] = unit.mechanics.phases;
  if (
    unit.mechanics.phases.length !== 1 ||
    phase === undefined ||
    phase.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    (phase.effects?.length ?? 0) !== 1
  ) {
    return Option.none<SurfaceUnitInterpretation>();
  }
  const effect = phase.effects?.[0];
  if (effect?.kind !== "grant_extra_action") {
    return Option.none<SurfaceUnitInterpretation>();
  }

  return Option.some(
    {
      tag: "grantExtraAction",
      restriction: effect.restriction,
      useCountCap: unit.mechanics.resource.cap,
      usageLimit: "once_per_turn",
    } satisfies SurfaceUnitInterpretation,
  );
}

export function interpretSurfaceUnit(
  unit: SurfaceUnit,
): Option.Option<SurfaceUnitInterpretation> {
  if (unit.kind === "spell") {
    return interpretSpell(unit);
  }

  if (unit.kind === "class_feature") {
    return interpretClassFeature(unit);
  }

  return Option.none<SurfaceUnitInterpretation>();
}

export function interpretRuntimeUnit(
  unit: RuntimeUnitAccess,
): Option.Option<SurfaceUnitInterpretation> {
  return interpretSurfaceUnit(unit.unit);
}

export function resourceStateForUnit(
  combatant: Combatant,
  unitAccessId: BattleUnitAccessId,
): BattleUnitResourceState | null {
  return (
    combatant.unitResourceStates.find(
      (resourceState) => resourceState.unitAccessId === unitAccessId,
    ) ??
    null
  );
}

export function maxUsesForCombatant(
  combatant: Combatant,
  interpretation: Extract<
    SurfaceUnitInterpretation,
    { readonly tag: "grantExtraAction" }
  >,
) {
  return resolveUseCountCap(interpretation.useCountCap, combatant.level);
}
