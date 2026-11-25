// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.COMBAT_TURN_START_HEROIC_INSPIRATION
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.combat-turn-start-heroic-inspiration
import { HEROIC_INSPIRATION_AVAILABLE } from "@dnd/shared/game-facts";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";

import type {
  BattleCreatureState,
  BattleStartTurnOccurrenceSequenceCheckpoint,
  CharacterBattleCreatureState,
  BattleState,
  BattleTurnStartHeroicInspirationChoice,
  BattleTurnStartHeroicInspirationChoiceHole,
} from "../battle-state-execution.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";
import type { BattleProcedureExecutionRef } from "../identity.ts";

// SRD 5.2.1 classes.md, Champion, Level 10: Heroic Warrior: "During combat, you
// can give yourself Heroic Inspiration whenever you start your turn without it."
// A battle is combat, so the offer needs only the feature and a turn that starts
// without Heroic Inspiration. "Can" makes it the creature's choice.

/**
 * The starting creature's Heroic Inspiration offer: the creature, narrowed to
 * a character, and the feature procedure that makes the offer.
 */
export type TurnStartHeroicInspirationOffer = {
  readonly actor: CharacterBattleCreatureState;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};

/**
 * The offer of Heroic Inspiration to the starting creature, when the creature
 * has that feature and starts its turn without Heroic Inspiration; otherwise
 * `undefined`.
 */
export function turnStartHeroicInspirationOffer(
  actor: BattleCreatureState | undefined,
): TurnStartHeroicInspirationOffer | undefined {
  if (!isCharacterWithoutHeroicInspiration(actor)) return undefined;
  const sourceProcedureRef = characterUnitProcedureBindings(
    actor.origin.execution,
  ).find(
    ({ procedure }) =>
      procedure.kind === "unitSupportProfile" &&
      procedure.execution === "combatTurnStartHeroicInspiration",
  )?.procedureRef;
  return sourceProcedureRef === undefined
    ? undefined
    : { actor, sourceProcedureRef };
}

function isCharacterWithoutHeroicInspiration(
  actor: BattleCreatureState | undefined,
): actor is CharacterBattleCreatureState {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.heroicInspiration.tag !== "available"
  );
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
 * Inspiration sets it on the offered creature, which settlement writes back to
 * the character; declining leaves the battle as it was.
 */
export function battleStateAfterTurnStartHeroicInspirationChoice(input: {
  readonly state: BattleState;
  readonly offer: TurnStartHeroicInspirationOffer;
  readonly choice: BattleTurnStartHeroicInspirationChoice;
}): BattleState {
  return Match.value(input.choice).pipe(
    Match.when("giveHeroicInspiration", () => ({
      ...input.state,
      combatants: new Map(input.state.combatants).set(
        input.offer.actor.combatantId,
        {
          ...input.offer.actor,
          origin: {
            ...input.offer.actor.origin,
            heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
          },
        },
      ),
    })),
    Match.when("decline", () => input.state),
    Match.exhaustive,
  );
}
