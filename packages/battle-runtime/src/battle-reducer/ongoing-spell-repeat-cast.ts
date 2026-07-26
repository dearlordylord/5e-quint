import type { BattleState } from "../battle-state-execution.ts";
import {
  antimagicFieldOngoingSpellEffectRefForActiveEffect,
  ongoingSpellEffectSuppressedByAntimagicField,
} from "./antimagic-field-suppression.ts";
import { currentActorId } from "./creature-state-leaves.ts";

type RepeatableOngoingSpellEffect = Parameters<
  typeof antimagicFieldOngoingSpellEffectRefForActiveEffect
>[0] & {
  readonly startedOn: {
    readonly actorId: ReturnType<typeof currentActorId>;
    readonly round: BattleState["initiative"]["round"];
  };
};

type BattleTurnIdentity = {
  readonly currentActorId: ReturnType<typeof currentActorId>;
  readonly round: BattleState["initiative"]["round"];
};

export function ongoingSpellRepeatIsOnLaterTurn(
  turn: BattleTurnIdentity,
  effect: RepeatableOngoingSpellEffect,
): boolean {
  return (
    turn.currentActorId !== effect.startedOn.actorId ||
    turn.round !== effect.startedOn.round
  );
}

export function ongoingSpellRepeatCastIsAvailable(
  state: BattleState,
  effect: RepeatableOngoingSpellEffect,
): boolean {
  return (
    ongoingSpellRepeatIsOnLaterTurn(
      {
        currentActorId: currentActorId(state),
        round: state.initiative.round,
      },
      effect,
    ) &&
    !ongoingSpellEffectSuppressedByAntimagicField(
      state,
      antimagicFieldOngoingSpellEffectRefForActiveEffect(effect),
    )
  );
}
