import { Effect, Either, Option, pipe } from "effect";

import { battleSourceRefForCreature } from "#/battle-source-ref.ts";
import { initializeBattleState } from "#/battle-init.ts";
import type { Combatant, BattleInit } from "#/battle-types.ts";
import { effectFromEither, optionToEither } from "#/effect-helpers.ts";
import { MissingRuntimeUnitError } from "#/errors.ts";
import { SurfaceUnitLibrary } from "#/services.ts";
import type {
  CreatureRosterEntry,
  CreatureRosterState,
  RuntimeUnitAccess,
  SurfaceUnit,
} from "#/types.ts";
import { runtimeUnitAccessId } from "#/types.ts";

function attachOwnership(
  creature: CreatureRosterEntry,
  units: ReadonlyArray<SurfaceUnit>,
): ReadonlyArray<RuntimeUnitAccess> {
  const battleSourceRef = battleSourceRefForCreature(creature);
  return units.map((unit) => ({
    accessId: runtimeUnitAccessId(`${battleSourceRef}:${unit.id}`),
    battleSourceRef,
    unit,
  }));
}

function combatantUnits(
  creature: CreatureRosterEntry,
  surfaceLibrary: ReadonlyMap<
    CreatureRosterEntry["authoredUnitIds"][number],
    SurfaceUnit
  >,
): Either.Either<ReadonlyArray<RuntimeUnitAccess>, MissingRuntimeUnitError> {
  const resolved = creature.authoredUnitIds.map((unitId) =>
    pipe(
      surfaceLibrary.get(unitId),
      Option.fromNullable,
      (option) =>
        optionToEither(option, () => new MissingRuntimeUnitError({ unitId })),
    ),
  );
  return pipe(Either.all(resolved), Either.map((units) => attachOwnership(creature, units)));
}

export function projectRosterToBattle(
  state: CreatureRosterState,
  init: BattleInit,
) {
  return Effect.gen(function* () {
    const surfaceLibrary = yield* SurfaceUnitLibrary;
    const combatants = yield* Effect.forEach(state.creatures, (creature) =>
      effectFromEither(
        pipe(
          combatantUnits(creature, surfaceLibrary),
          Either.map(
            (units) =>
              ({
                id: creature.id,
                name: creature.name,
                battleSourceRef: battleSourceRefForCreature(creature),
                level: creature.level,
                currentHp: creature.currentHp,
                maxHp: creature.maxHp,
                armorClass: creature.armorClass,
                spellSaveDc: creature.spellSaveDc,
                spellcastingModifier: creature.spellcastingModifier,
                units,
                unitResourceStates: units.map((unit) => ({
                  unitAccessId: unit.accessId,
                  expendedUses: 0,
                  usedThisTurn: false,
                })),
              }) satisfies Combatant,
          ),
        ),
      ),
    );

    return yield* effectFromEither(initializeBattleState(combatants, init));
  });
}
