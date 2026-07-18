import type { BattleActiveEffect } from "./types.ts";
import type {
  BattleActiveEffectExecutionRef,
  BattleId,
  CombatantId,
} from "../identity.ts";
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
      | "heldLight"
      | "jumpMovementReplacement"
      | "spellObjectContactDamage"
      | "spellMarkedDamageRider"
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
      "sourceProcedureRef" in effect &&
      spellActiveEffectExecutionRef(
        effect as ReplayAddressableSpellActiveEffect,
      ) === effectRef,
  );
}

export function allocateBattleActiveEffectRef(input: {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
}): {
  readonly state: BattleState;
  readonly effectRef: BattleActiveEffectExecutionRef;
} {
  const owner = input.state.combatants.get(input.ownerId);
  if (owner === undefined) {
    throw new Error(
      `BattleState invariant violated: missing active-effect owner ${input.ownerId}.`,
    );
  }
  const allocation = allocateBattleActiveEffectRefForCreature({
    battleId: input.state.battleId,
    owner,
  });
  const combatants = new Map(input.state.combatants).set(
    input.ownerId,
    allocation.owner,
  );
  return {
    state: { ...input.state, combatants },
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
