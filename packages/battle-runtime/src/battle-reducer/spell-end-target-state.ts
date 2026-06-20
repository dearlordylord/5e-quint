// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE

import { type Round as RoundType } from "@dnd/shared/types";

import { battleCreatureWithSpellActiveEffects } from "../active-effect/lifecycle.ts";
import type {
  BattleActiveEffect,
  BattleActiveEffectExpiration,
} from "../active-effect/types.ts";
import type { BattleCreatureState, BattleState } from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { conditionHadNonSpellSourceBeforeSpellEffect } from "./spell-condition-effects-helpers.ts";

type SpellEndTargetStateActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellEndTargetState" }
>;

export type EndOfNextTurnExpirationTiming =
  | { readonly kind: "duringTurn" }
  | { readonly kind: "newRoundDurationTick" };

export const END_OF_NEXT_TURN_DURING_TURN = {
  kind: "duringTurn",
} as const satisfies EndOfNextTurnExpirationTiming;

export const END_OF_NEXT_TURN_NEW_ROUND_DURATION_TICK = {
  kind: "newRoundDurationTick",
} as const satisfies EndOfNextTurnExpirationTiming;

export function endOfNextTurnExpiration(
  state: BattleState,
  combatantId: CombatantId,
  timing: EndOfNextTurnExpirationTiming,
): Extract<BattleActiveEffectExpiration, { readonly kind: "endOfTurn" }> {
  const stillToAct = state.initiative.stillToAct.some(
    (entry) => entry.creature === combatantId,
  );
  const isCurrentActor = currentActorId(state) === combatantId;
  const expiresThisRound =
    stillToAct && (!isCurrentActor || timing.kind === "newRoundDurationTick");
  const round = expiresThisRound
    ? state.initiative.round
    : ((state.initiative.round + 1) as RoundType);
  return {
    kind: "endOfTurn",
    combatantId,
    round,
  };
}

export function battleCreatureWithSpellEndTargetStatePromotions(input: {
  readonly state: BattleState;
  readonly combatant: BattleCreatureState;
  readonly expiringEffects: readonly BattleActiveEffect[];
  readonly timing: EndOfNextTurnExpirationTiming;
}): BattleCreatureState {
  const endStates = input.expiringEffects.filter(isSpellEndTargetState);
  if (endStates.length === 0) {
    return input.combatant;
  }

  const promotedEffects = endStates.flatMap((effect) =>
    spellEndTargetStatePromotedEffects(
      input.state,
      input.combatant,
      effect,
      input.timing,
    ),
  );
  return battleCreatureWithSpellActiveEffects(input.combatant, [
    ...input.combatant.activeEffects,
    ...promotedEffects,
  ]);
}

function isSpellEndTargetState(
  effect: BattleActiveEffect,
): effect is SpellEndTargetStateActiveEffect {
  return effect.kind === "spellEndTargetState";
}

export function spellEndTargetStatePromotesIncapacitated(
  effect: BattleActiveEffect,
): effect is SpellEndTargetStateActiveEffect & {
  readonly condition: "incapacitated";
} {
  return isSpellEndTargetState(effect) && effect.condition === "incapacitated";
}

function spellEndTargetStatePromotedEffects(
  state: BattleState,
  combatant: BattleCreatureState,
  effect: SpellEndTargetStateActiveEffect,
  timing: EndOfNextTurnExpirationTiming,
): readonly BattleActiveEffect[] {
  const expiresAt = endOfNextTurnExpiration(
    state,
    combatant.combatantId,
    timing,
  );
  return [
    {
      kind: "spellCondition" as const,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      condition: effect.condition,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        combatant,
        effect.condition,
      ),
      escape: null,
      turnStartDamage: null,
      expiresAt,
    },
    {
      kind: "spellSpeedZero" as const,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      expiresAt,
    },
  ];
}
