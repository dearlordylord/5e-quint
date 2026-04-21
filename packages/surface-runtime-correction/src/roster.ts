import { Either, Option, pipe } from "effect";

import { optionToEither } from "#/effect-helpers.ts";
import { InvalidRosterActionError, MissingCombatantError } from "#/errors.ts";
import type {
  CreatureId,
  CreatureRosterEntry,
  CreatureRosterState,
  RosterAction,
} from "#/types.ts";

function replaceRosterEntry(
  creatures: ReadonlyArray<CreatureRosterEntry>,
  creatureId: CreatureId,
  updater: (creature: CreatureRosterEntry) => CreatureRosterEntry,
): ReadonlyArray<CreatureRosterEntry> {
  return creatures.map((creature) =>
    creature.id === creatureId ? updater(creature) : creature,
  );
}

function appendUnitIfMissing<T>(
  unitIds: ReadonlyArray<T>,
  unitId: T,
): ReadonlyArray<T> {
  return unitIds.includes(unitId) ? unitIds : [...unitIds, unitId];
}

export function reduceRosterState(
  state: CreatureRosterState,
  action: RosterAction,
): Either.Either<
  CreatureRosterState,
  MissingCombatantError | InvalidRosterActionError
> {
  const target = pipe(
    state.creatures.find((creature) => creature.id === action.creatureId),
    Option.fromNullable,
    (option) =>
      optionToEither(
        option,
        () =>
          new MissingCombatantError({
            combatantId: action.creatureId,
          }),
      ),
  );
  if (Either.isLeft(target)) {
    return Either.left(target.left);
  }
  if (target.right.sourceKind !== "characterSheet") {
    return Either.left(
      new InvalidRosterActionError({
        message: `${action.creatureId} is not a character-sheet creature`,
      }),
    );
  }

  switch (action.tag) {
    case "levelUpCharacter":
      if (action.newLevel < target.right.level) {
        return Either.left(
          new InvalidRosterActionError({
            message: `level up cannot reduce level from ${target.right.level} to ${action.newLevel}`,
          }),
        );
      }
      return Either.right({
        creatures: replaceRosterEntry(state.creatures, action.creatureId, (creature) => ({
          ...creature,
          level: action.newLevel,
        })),
      });
    case "grantUnitToCharacter":
      return Either.right({
        creatures: replaceRosterEntry(state.creatures, action.creatureId, (creature) => ({
          ...creature,
          authoredUnitIds: appendUnitIfMissing(
            creature.authoredUnitIds,
            action.unitId,
          ),
        })),
      });
  }
}
