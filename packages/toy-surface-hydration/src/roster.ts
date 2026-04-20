import { Either, Option, pipe } from "effect";

import { optionToEither } from "#/effect-helpers.ts";
import { InvalidToyChoiceError, MissingCombatantError } from "#/errors.ts";
import type {
  ToyCreatureId,
  ToyCreatureRosterEntry,
  ToyCreatureRosterState,
  ToyRosterChoice,
} from "#/types.ts";

function replaceRosterEntry(
  creatures: ReadonlyArray<ToyCreatureRosterEntry>,
  creatureId: ToyCreatureId,
  updater: (creature: ToyCreatureRosterEntry) => ToyCreatureRosterEntry,
): ReadonlyArray<ToyCreatureRosterEntry> {
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

export function reduceToyRosterState(
  state: ToyCreatureRosterState,
  choice: ToyRosterChoice,
): Either.Either<
  ToyCreatureRosterState,
  MissingCombatantError | InvalidToyChoiceError
> {
  const target = pipe(
    state.creatures.find((creature) => creature.id === choice.creatureId),
    Option.fromNullable,
    (option) =>
      optionToEither(
        option,
        () =>
        new MissingCombatantError({
          combatantId: choice.creatureId,
        }),
      ),
  );
  if (Either.isLeft(target)) {
    return Either.left(target.left);
  }
  if (target.right.sourceKind !== "characterSheet") {
    return Either.left(
      new InvalidToyChoiceError({
        message: `${choice.creatureId} is not a character-sheet creature`,
      }),
    );
  }
  switch (choice.tag) {
    case "levelUpCharacter":
      if (choice.newLevel < target.right.level) {
        return Either.left(
          new InvalidToyChoiceError({
            message: `level up cannot reduce level from ${target.right.level} to ${choice.newLevel}`,
          }),
        );
      }
      return Either.right({
        creatures: replaceRosterEntry(state.creatures, choice.creatureId, (creature) => ({
          ...creature,
          level: choice.newLevel,
        })),
      });
    case "grantUnitToCharacter":
      return Either.right({
        creatures: replaceRosterEntry(state.creatures, choice.creatureId, (creature) => ({
          ...creature,
          authoredUnitIds: appendUnitIfMissing(
            creature.authoredUnitIds,
            choice.unitId,
          ),
        })),
      });
  }
}
