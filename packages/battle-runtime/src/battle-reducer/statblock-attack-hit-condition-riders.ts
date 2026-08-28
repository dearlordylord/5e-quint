// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-ATTACK-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.attack-procedure
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_PROCEDURE
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";

import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import type { StatBlockAttackActionOption } from "../battle-action-options.ts";
import { creatureSizeIsAtMost } from "../statblock-attack-hit-condition-support.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state-execution.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import { conditionApplicationPreventedByConditionImmunity } from "./spell-condition-effects-helpers.ts";

export function applyStatBlockAttackHitConditionRiders(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly attack: StatBlockAttackActionOption;
}): BattleState {
  const rider = input.attack.attack.onHit.conditionRider;
  if (rider === undefined) {
    return input.state;
  }
  const nextTarget = applyStatBlockAttackHitConditionRider(input.target, rider);
  return nextTarget === input.target
    ? input.state
    : {
        ...input.state,
        combatants: new Map(input.state.combatants).set(
          input.target.combatantId,
          nextTarget,
        ),
      };
}

function applyStatBlockAttackHitConditionRider(
  target: BattleCreatureState,
  rider: NonNullable<
    StatBlockAttackActionOption["attack"]["onHit"]["conditionRider"]
  >,
): BattleCreatureState {
  if (
    !creatureSizeIsAtMost(
      combatantEffectiveSize(target),
      rider.targetSizePredicate.maxCreatureSize,
    ) ||
    statBlockAttackHitConditionPrevented(target, rider.condition)
  ) {
    return target;
  }
  return battleCreatureStateWithKnockOutPreservedConditions(
    target,
    applyCondition(target.conditions, rider.condition),
  );
}

function statBlockAttackHitConditionPrevented(
  target: BattleCreatureState,
  condition: "prone",
): boolean {
  return (
    conditionApplicationPreventedByConditionImmunity(target, condition) ||
    (target.origin.kind === "statBlock" &&
      target.origin.mechanics.immunities.conditions.includes(condition) ===
        true)
  );
}
