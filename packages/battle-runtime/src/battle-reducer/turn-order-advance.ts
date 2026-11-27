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
 * Where End Turn moves the Initiative order. A dead creature takes no turn
 * (ASSUMPTIONS.md A71): End Turn passes over each dead participant, in order,
 * to the next one still alive, and the dead keep their places. When no
 * participant is alive, the order doesn't move and the battle waits for the
 * table.
 */
export type NextLivingTurn =
  | {
      readonly tag: "living";
      readonly initiative: BattleState["initiative"];
      /** The dead participants' turns passed on the way, in Initiative order. */
      readonly passedTurns: readonly ParticipantTurn[];
    }
  | { readonly tag: "noLivingParticipant" };

function participantIsDead(
  state: BattleState,
  actorId: ParticipantTurn["actorId"],
): boolean {
  const combatant = state.combatants.get(actorId);
  return combatant !== undefined && zeroHpLifecycleIsTerminal(combatant);
}

/** The next turn End Turn starts, passing over dead participants. */
export function nextLivingTurn(state: BattleState): NextLivingTurn {
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
