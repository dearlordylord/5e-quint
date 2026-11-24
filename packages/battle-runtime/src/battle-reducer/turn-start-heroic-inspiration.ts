// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.COMBAT_TURN_START_HEROIC_INSPIRATION
import { HEROIC_INSPIRATION_AVAILABLE } from "@dnd/shared/game-facts";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";

import type {
  BattleCreatureState,
  BattleStartTurnOccurrenceSequenceCheckpoint,
  BattleState,
  BattleTurnStartHeroicInspirationChoice,
  BattleTurnStartHeroicInspirationChoiceHole,
} from "../battle-state-execution.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";

// SRD 5.2.1 classes.md, Champion, Level 10: Heroic Warrior: "During combat, you
// can give yourself Heroic Inspiration whenever you start your turn without it."
// A battle is combat, so the offer needs only the feature and a turn that starts
// without Heroic Inspiration. "Can" makes it the creature's choice.

/**
 * The feature procedure that offers the starting creature Heroic Inspiration,
 * when the creature has that feature and starts its turn without Heroic
 * Inspiration; otherwise `undefined`.
 */
export function turnStartHeroicInspirationOfferSource(
  actor: BattleCreatureState | undefined,
): BattleProcedureExecutionRef | undefined {
  if (
    actor?.origin.kind !== "character" ||
    actor.origin.heroicInspiration.tag === "available"
  ) {
    return undefined;
  }
  return characterUnitProcedureBindings(actor.origin.execution).find(
    ({ procedure }) =>
      procedure.kind === "unitSupportProfile" &&
      procedure.execution === "combatTurnStartHeroicInspiration",
  )?.procedureRef;
}

/** The starting creature's choice whether to give itself Heroic Inspiration. */
export function turnStartHeroicInspirationChoiceHole(input: {
  readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
  readonly occurrenceId: BattleTurnStartHeroicInspirationChoiceHole["occurrenceId"];
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
}): BattleTurnStartHeroicInspirationChoiceHole {
  const key = `battle:turn-start-heroic-inspiration-choice:${input.sourceTurn.actorId}:${Number(input.sourceTurn.round)}:${input.occurrenceId}`;
  return {
    kind: "turnStartHeroicInspirationChoice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Choose whether to give yourself Heroic Inspiration",
    sourceProcedureRef: input.sourceProcedureRef,
    sourceTurn: input.sourceTurn,
    occurrenceId: input.occurrenceId,
  };
}

/**
 * The battle after the starting creature's choice: giving itself Heroic
 * Inspiration sets it on the creature, which settlement writes back to the
 * character; declining leaves the battle as it was.
 */
export function battleStateAfterTurnStartHeroicInspirationChoice(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly choice: BattleTurnStartHeroicInspirationChoice;
}): BattleState {
  return Match.value(input.choice).pipe(
    Match.when("giveHeroicInspiration", () => {
      const actor = input.state.combatants.get(input.actorId);
      /* v8 ignore next -- @preserve -- The choice is offered only to a character in the battle. */
      if (actor?.origin.kind !== "character") return input.state;
      return {
        ...input.state,
        combatants: new Map(input.state.combatants).set(input.actorId, {
          ...actor,
          origin: {
            ...actor.origin,
            heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
          },
        }),
      };
    }),
    Match.when("decline", () => input.state),
    Match.exhaustive,
  );
}
