// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING

import {
  currentActing,
  initiativeOrder,
  nextInitiative,
} from "@dnd/shared-algebras/initiative-algebra";
import type {
  BattleStartTurnOccurrenceSequenceCheckpoint,
  BattleState,
} from "../battle-state-execution.ts";
import { zeroHpLifecycleIsTerminal } from "./creature-state-leaves.ts";

/** A participant's turn in the Initiative order: who takes it, in which round. */
export type ParticipantTurn =
  BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];

/**
 * The next turn End Turn starts: the next participant alive, with the dead
 * participants' turns passed on the way, in Initiative order.
 */
export type LivingTurnAdvance = {
  readonly tag: "living";
  readonly initiative: BattleState["initiative"];
  readonly passedTurns: readonly ParticipantTurn[];
};

/**
 * Where End Turn moves the Initiative order. A dead creature takes no turn
 * (ASSUMPTIONS.md A71): End Turn passes over each dead participant, in order,
 * to the next one still alive, and the dead keep their places. When no
 * participant is alive, the order doesn't move and the battle waits for the
 * table.
 */
export type EndTurnAdvance =
  | LivingTurnAdvance
  | { readonly tag: "noLivingParticipant" };

/** Whether the participant is dead, so its turns pass without being taken. */
export function participantIsDead(
  state: BattleState,
  actorId: ParticipantTurn["actorId"],
): boolean {
  const combatant = state.combatants.get(actorId);
  return combatant !== undefined && zeroHpLifecycleIsTerminal(combatant);
}

/** Where End Turn moves the Initiative order, passing over the dead. */
export function endTurnAdvance(state: BattleState): EndTurnAdvance {
  const participantCount = initiativeOrder(state.initiative).length;
  const passedTurns: ParticipantTurn[] = [];
  let initiative = nextInitiative(state.initiative);
  for (let step = 0; step < participantCount; step += 1) {
    const actorId = currentActing(initiative);
    if (!participantIsDead(state, actorId)) {
      return { tag: "living", initiative, passedTurns };
    }
    passedTurns.push({ actorId, round: initiative.round });
    initiative = nextInitiative(initiative);
  }
  return { tag: "noLivingParticipant" };
}
