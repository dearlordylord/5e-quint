import {
  applyCondition,
  type ConditionState,
} from "@dnd/shared-algebras/conditions-algebra";
import { Hp } from "@dnd/shared/types";
import type {
  BattleCreatureKnockOutLifecycle,
  BattleCreatureState,
} from "../battle-state-execution.ts";
import type { HpDamageProjection } from "./battle-runtime-protocol.ts";
import {
  KnockedOutConditionState,
  KnockedOutOneHp,
  type KnockedOutConditionState as KnockedOutConditionStateT,
  type KnockedOutOneHp as KnockedOutOneHpT,
} from "./knocked-out-state.ts";

export function knockedOutOneHp(): KnockedOutOneHpT {
  return KnockedOutOneHp(Hp(1));
}

export function knockedOutConditionState(
  conditions: ConditionState,
): KnockedOutConditionStateT {
  return KnockedOutConditionState(applyCondition(conditions, "unconscious"));
}

export function battleCreatureStateWithKnockOutPreservedConditions(
  combatant: BattleCreatureState,
  conditions: ConditionState,
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? { ...combatant, conditions }
    : { ...combatant, conditions: knockedOutConditionState(conditions) };
}

export function nonKnockOutLifecycleFields(
  hp: Hp,
  conditions: ConditionState,
): BattleCreatureKnockOutLifecycle {
  return { hp, conditions, positiveHpUnconscious: null };
}

export function battleCreatureStateWithoutKnockOut(
  combatant: BattleCreatureState,
  hp: Hp,
  conditions: ConditionState,
): BattleCreatureState {
  return { ...combatant, ...nonKnockOutLifecycleFields(hp, conditions) };
}

export function battleCreatureStateWithDamageProjection(
  combatant: BattleCreatureState,
  projection: HpDamageProjection,
): BattleCreatureState {
  const tempHp = Hp(projection.currentTempHp - projection.tempHpAbsorbed);
  if (
    combatant.positiveHpUnconscious !== null &&
    Number(projection.nextHp) === 1
  ) {
    return { ...combatant, hp: knockedOutOneHp(), tempHp };
  }
  return {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      projection.nextHp,
      combatant.conditions,
    ),
    tempHp,
  };
}
