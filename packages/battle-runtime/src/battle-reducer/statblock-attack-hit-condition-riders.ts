// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";

import type {
  BattleCreatureState,
  BattleState,
} from "../battle-reducer.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type { CombatantId } from "../identity.ts";
import {
  creatureSizeIsAtMost,
  supportedStatBlockAttackHitConditionRiders,
} from "../statblock-attack-hit-condition-support.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import { conditionApplicationPreventedByConditionImmunity } from "./spell-condition-effects-helpers.ts";

export function applyStatBlockAttackHitConditionRiders(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
}): BattleState {
  if (input.attack.kind !== "statBlockAttack") {
    return input.state;
  }
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return input.state;
  }
  const riders = supportedStatBlockAttackHitConditionRiders(
    input.attack.attack,
  );
  if (riders.length === 0) {
    return input.state;
  }
  const nextTarget = riders.reduce(
    applyStatBlockAttackHitConditionRider,
    target,
  );
  return nextTarget === target
    ? input.state
    : {
        ...input.state,
        combatants: new Map(input.state.combatants).set(
          input.targetId,
          nextTarget,
        ),
      };
}

function applyStatBlockAttackHitConditionRider(
  target: BattleCreatureState,
  rider: NonNullable<
    ReturnType<typeof supportedStatBlockAttackHitConditionRiders>
  >[number],
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
      target.origin.statBlock.statBlock.immunities?.conditions?.includes(
        condition,
      ) === true)
  );
}
