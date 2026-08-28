import type { BattleActiveEffect } from "./active-effect/types.ts";
import type {
  BattleEffectExecutionRef,
  CombatantId,
} from "./identity.ts";
import {
  battleEffectExecutionRef,
  battleEffectExecutionOrdinal,
} from "./identity.ts";
import type {
  BattleCreatureState,
  BattleState,
} from "./battle-state-execution.ts";

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
): BattleEffectExecutionRef {
  return effect.effectRef;
}

export function spellActiveEffectForExecutionRef(
  effects: readonly BattleActiveEffect[],
  effectRef: BattleEffectExecutionRef,
): ReplayAddressableSpellActiveEffect | undefined {
  return effects.find(
    (effect): effect is ReplayAddressableSpellActiveEffect =>
      "effectRef" in effect && effect.effectRef === effectRef,
  );
}

export function allocateBattleEffectExecutionRef(input: {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
}):
  | {
      readonly tag: "allocated";
      readonly state: BattleState;
      readonly owner: BattleCreatureState;
      readonly effectRef: BattleEffectExecutionRef;
    }
  | { readonly tag: "ownerNotFound"; readonly ownerId: CombatantId } {
  const owner = input.state.combatants.get(input.ownerId);
  if (owner === undefined) {
    return { tag: "ownerNotFound", ownerId: input.ownerId };
  }
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner,
  });
  const combatants = new Map(input.state.combatants).set(
    input.ownerId,
    allocation.owner,
  );
  return {
    tag: "allocated",
    state: { ...input.state, combatants },
    owner: allocation.owner,
    effectRef: allocation.effectRef,
  };
}

export function allocateBattleEffectExecutionRefForCreature(input: {
  readonly owner: BattleCreatureState;
}): {
  readonly owner: BattleCreatureState;
  readonly effectRef: BattleEffectExecutionRef;
} {
  const ordinal = Number(input.owner.nextEffectOrdinal);
  return {
    owner: {
      ...input.owner,
      nextEffectOrdinal: battleEffectExecutionOrdinal(ordinal + 1),
    },
    effectRef: battleEffectExecutionRef(
      JSON.stringify({
        kind: "effectOccurrence",
        ownerScopeRef: input.owner.origin.execution.scopeRef,
        ordinal,
      }),
    ),
  };
}
