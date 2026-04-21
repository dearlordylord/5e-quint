import { Effect, Either, Option, pipe } from "effect";

import type { BattleCombatant } from "#/battle-types.ts";
import { effectFromEither, optionToEither } from "#/effect-helpers.ts";
import { MissingRuntimeUnitError } from "#/errors.ts";
import { RuntimeUnitLibrary } from "#/services.ts";
import type {
  CreatureRosterEntry,
  CreatureRosterState,
  RuntimeUnit,
  RuntimeUnitAccess,
} from "#/types.ts";

function attachOwnership(
  creature: CreatureRosterEntry,
  units: ReadonlyArray<RuntimeUnit>,
): ReadonlyArray<RuntimeUnitAccess> {
  return units.map((runtimeUnit) => ({
    ownerId: creature.id,
    sourceKind: creature.sourceKind,
    unit: runtimeUnit.unit,
  }));
}

function combatantUnits(
  creature: CreatureRosterEntry,
  runtimeLibrary: ReadonlyMap<
    CreatureRosterEntry["authoredUnitIds"][number],
    RuntimeUnit
  >,
): Either.Either<ReadonlyArray<RuntimeUnitAccess>, MissingRuntimeUnitError> {
  const resolved = creature.authoredUnitIds.map((unitId) =>
    pipe(
      runtimeLibrary.get(unitId),
      Option.fromNullable,
      (option) =>
        optionToEither(option, () => new MissingRuntimeUnitError({ unitId })),
    ),
  );
  return pipe(Either.all(resolved), Either.map((units) => attachOwnership(creature, units)));
}

export function projectRosterToBattle(
  state: CreatureRosterState,
) {
  return Effect.gen(function*() {
    const runtimeLibrary = yield* RuntimeUnitLibrary;
    const combatants = yield* Effect.forEach(state.creatures, (creature) =>
      effectFromEither(
        pipe(
          combatantUnits(creature, runtimeLibrary),
          Either.map(
            (units) =>
              ({
                id: creature.id,
                name: creature.name,
                sourceKind: creature.sourceKind,
                level: creature.level,
                currentHp: creature.currentHp,
                maxHp: creature.maxHp,
                armorClass: creature.armorClass,
                spellSaveDc: creature.spellSaveDc,
                spellcastingModifier: creature.spellcastingModifier,
                units,
              }) satisfies BattleCombatant,
          ),
        ),
      ),
    );

    return { combatants };
  });
}
