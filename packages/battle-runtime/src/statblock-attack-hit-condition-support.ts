// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
import { SIZES } from "@dnd/shared/types";
import type {
  CreatureNamedAttackRoll,
  Size,
} from "@dnd/surface/surface/types";
import type { SupportedCreatureNamedAttackRoll } from "./battle-action-options.ts";

export type StatBlockAttackHitTargetSizeConditionRiderEffect = Extract<
  CreatureNamedAttackRoll["onHit"][number],
  { readonly kind: "apply_condition_if_target_size_at_most" }
> & {
  readonly condition: "prone";
};

export type StatBlockAttackHitTargetSizePredicate = {
  readonly kind: "targetCreatureSizeAtMost";
  readonly maxCreatureSize: Size;
};

export type StatBlockAttackHitTargetSizeConditionRider = {
  readonly condition: "prone";
  readonly targetSizePredicate: StatBlockAttackHitTargetSizePredicate;
};

export function supportedStatBlockAttackHitConditionRiderEffect(
  effect: CreatureNamedAttackRoll["onHit"][number],
): StatBlockAttackHitTargetSizeConditionRiderEffect | null {
  if (
    effect.kind !== "apply_condition_if_target_size_at_most" ||
    effect.condition !== "prone"
  ) {
    return null;
  }
  return {
    kind: effect.kind,
    condition: effect.condition,
    maxCreatureSize: effect.maxCreatureSize,
  };
}

export function supportedStatBlockAttackHitConditionRiders(
  attack: SupportedCreatureNamedAttackRoll,
): readonly StatBlockAttackHitTargetSizeConditionRider[];
export function supportedStatBlockAttackHitConditionRiders(
  attack: CreatureNamedAttackRoll,
): readonly StatBlockAttackHitTargetSizeConditionRider[] | null;
export function supportedStatBlockAttackHitConditionRiders(
  attack: CreatureNamedAttackRoll,
): readonly StatBlockAttackHitTargetSizeConditionRider[] | null {
  const riders: StatBlockAttackHitTargetSizeConditionRider[] = [];
  let conditionRiderSeen = false;
  for (const effect of attack.onHit) {
    const rider = supportedStatBlockAttackHitConditionRiderEffect(effect);
    if (rider === null) {
      if (statBlockAttackHitEffectIsConditionRider(effect)) return null;
      if (conditionRiderSeen) return null;
      continue;
    }
    if (riders.length > 0) {
      return null;
    }
    conditionRiderSeen = true;
    riders.push({
      condition: rider.condition,
      targetSizePredicate: {
        kind: "targetCreatureSizeAtMost",
        maxCreatureSize: rider.maxCreatureSize,
      },
    });
  }
  return riders;
}

export function creatureSizeIsAtMost(
  creatureSize: Size,
  maxCreatureSize: Size,
): boolean {
  return SIZES.indexOf(creatureSize) <= SIZES.indexOf(maxCreatureSize);
}

function statBlockAttackHitEffectIsConditionRider(
  effect: CreatureNamedAttackRoll["onHit"][number],
): boolean {
  return (
    effect.kind === "apply_condition_if_target_size_at_most" ||
    effect.kind === "apply_condition" ||
    effect.kind === "apply_condition_while_in_area_or_until_escape" ||
    effect.kind === "suppress_condition_self_end"
  );
}
