import type { BattleActiveEffect } from "./types.ts";
import type { BattleActiveEffectExecutionRef, BattleId } from "../identity.ts";
import {
  battleActiveEffectExecutionRef,
  battleActiveEffectExecutionOrdinal,
} from "../identity.ts";
import type { BattleCreatureState, BattleState } from "../battle-reducer.ts";

export type ReplayAddressableSpellActiveEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind:
      | "commandPending"
      | "dragonsBreath"
      | "dancingLights"
      | "heldLight"
      | "jumpMovementReplacement"
      | "spellObjectContactDamage"
      | "spellMarkedDamageRider"
      | "spellDashBonusAction"
      | "spiritualWeapon"
      | "possession"
      | "selfTransformation"
      | "spellCondition"
      | "spellConditionRepeatSave"
      | "spellCreatedHeldObject"
      | "spellGrantedActionResource"
      | "spellLevitatedCreature"
      | "wardingBond";
  }
>;
export type SpellActiveEffect = ReplayAddressableSpellActiveEffect;
export function spellActiveEffectExecutionRef(
  effect: ReplayAddressableSpellActiveEffect,
): BattleActiveEffectExecutionRef {
  return effect.effectRef;
}

export function spellActiveEffectForExecutionRef(
  effects: readonly BattleActiveEffect[],
  effectRef: BattleActiveEffectExecutionRef,
): ReplayAddressableSpellActiveEffect | undefined {
  return effects.find(
    (effect): effect is ReplayAddressableSpellActiveEffect =>
      "effectRef" in effect && effect.effectRef === effectRef,
  );
}

export function allocateBattleActiveEffectRef(input: {
  readonly state: BattleState;
  readonly owner: BattleCreatureState;
}): {
  readonly state: BattleState;
  readonly owner: BattleCreatureState;
  readonly effectRef: BattleActiveEffectExecutionRef;
} {
  const allocation = allocateBattleActiveEffectRefForCreature({
    battleId: input.state.battleId,
    owner: input.owner,
  });
  const combatants = new Map(input.state.combatants).set(
    input.owner.combatantId,
    allocation.owner,
  );
  return {
    state: { ...input.state, combatants },
    owner: allocation.owner,
    effectRef: allocation.effectRef,
  };
}

export function allocateBattleActiveEffectRefForCreature(input: {
  readonly battleId: BattleId;
  readonly owner: BattleCreatureState;
}): {
  readonly owner: BattleCreatureState;
  readonly effectRef: BattleActiveEffectExecutionRef;
} {
  const ordinal = Number(input.owner.nextActiveEffectOrdinal);
  return {
    owner: {
      ...input.owner,
      nextActiveEffectOrdinal: battleActiveEffectExecutionOrdinal(ordinal + 1),
    },
    effectRef: battleActiveEffectExecutionRef(
      JSON.stringify({
        battleId: input.battleId,
        kind: "activeEffectOccurrence",
        ownerId: input.owner.combatantId,
        ordinal,
      }),
    ),
  };
}
