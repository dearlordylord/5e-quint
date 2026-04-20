import { Effect, Either, Option, pipe } from "effect";

import { effectFromEither, optionToEither } from "#/effect-helpers.ts";
import {
  InvalidToyChoiceError,
  MissingCombatantError,
  MissingOwnedUnitError,
  MissingRuntimeUnitError,
} from "#/errors.ts";
import { ToyRuntimeUnitLibrary } from "#/services.ts";
import type {
  ToyBattleChoice,
  ToyBattleCombatant,
  ToyBattleState,
  ToyCreatureId,
  ToyCreatureRosterEntry,
  ToyCreatureRosterState,
  ToyRuntimeUnit,
} from "#/types.ts";

function actionSurgeUsesForLevel(
  unit: Extract<ToyRuntimeUnit, { readonly unitId: "fighter_action_surge_l2" }>,
  level: number,
): number {
  return unit.executable.usesByLevel.reduce(
    (current, tier) => (level >= tier.atLevel ? tier.value : current),
    0,
  );
}

function combatantUnits(
  creature: ToyCreatureRosterEntry,
  runtimeLibrary: ReadonlyMap<
    ToyCreatureRosterEntry["authoredUnitIds"][number],
    ToyRuntimeUnit
  >,
): Either.Either<ReadonlyArray<ToyRuntimeUnit>, MissingRuntimeUnitError> {
  const resolved = creature.authoredUnitIds.map((unitId) =>
      pipe(
        runtimeLibrary.get(unitId),
        Option.fromNullable,
        (option) =>
          optionToEither(option, () => new MissingRuntimeUnitError({ unitId })),
      ),
    );
  return Either.all(resolved) as Either.Either<
    ReadonlyArray<ToyRuntimeUnit>,
    MissingRuntimeUnitError
  >;
}

export function projectToyRosterToBattle(
  state: ToyCreatureRosterState,
){
  return Effect.gen(function*() {
    const runtimeLibrary = yield* ToyRuntimeUnitLibrary;
    const combatants = yield* Effect.forEach(state.creatures, (creature) =>
      effectFromEither(
        pipe(
          combatantUnits(creature, runtimeLibrary),
          Either.map((units) => {
            const actionSurgeUnit = units.find(
              (
                unit,
              ): unit is Extract<
                ToyRuntimeUnit,
                { readonly unitId: "fighter_action_surge_l2" }
              > => unit.unitId === "fighter_action_surge_l2",
            );
            return {
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
              actionsRemaining: 1,
              bonusActionAvailable: true,
              actionSurgeUsesRemaining:
                actionSurgeUnit == null
                  ? 0
                  : actionSurgeUsesForLevel(actionSurgeUnit, creature.level),
              actionSurgeUsedThisTurn: false,
              extraActionForbiddenKinds: [],
            } satisfies ToyBattleCombatant;
          }),
        ),
      ),
    );
    return { combatants };
  });
}

function replaceCombatant(
  combatants: ReadonlyArray<ToyBattleCombatant>,
  combatantId: ToyCreatureId,
  updater: (combatant: ToyBattleCombatant) => ToyBattleCombatant,
): ReadonlyArray<ToyBattleCombatant> {
  return combatants.map((combatant) =>
    combatant.id === combatantId ? updater(combatant) : combatant,
  );
}

function getCombatant(
  combatants: ReadonlyArray<ToyBattleCombatant>,
  combatantId: ToyCreatureId,
): Either.Either<ToyBattleCombatant, MissingCombatantError> {
  return pipe(
    combatants.find((entry) => entry.id === combatantId),
    Option.fromNullable,
    (option) =>
      optionToEither(option, () => new MissingCombatantError({ combatantId })),
  );
}

function getOwnedUnit<TUnit extends ToyRuntimeUnit["unitId"]>(
  combatant: ToyBattleCombatant,
  unitId: TUnit,
): Either.Either<
  Extract<ToyRuntimeUnit, { readonly unitId: TUnit }>,
  MissingOwnedUnitError
> {
  return pipe(
    combatant.units.find(
      (
        candidate,
      ): candidate is Extract<ToyRuntimeUnit, { readonly unitId: TUnit }> =>
        candidate.unitId === unitId,
    ),
    Option.fromNullable,
    (option) =>
      optionToEither(
        option,
        () =>
        new MissingOwnedUnitError({
          combatantId: combatant.id,
          unitId,
        }),
      ),
  );
}

function validatedRolledAmount(
  baseLevel: number,
  slotLevel: number,
  rolledAmount: number,
): Either.Either<number, InvalidToyChoiceError> {
  return slotLevel < baseLevel
    ? Either.left(
        new InvalidToyChoiceError({
          message: `slot level ${slotLevel} cannot be below base level ${baseLevel}`,
        }),
      )
    : Either.right(rolledAmount);
}

export function reduceToyBattleState(
  state: ToyBattleState,
  choice: ToyBattleChoice,
): Either.Either<
  ToyBattleState,
  MissingCombatantError | MissingOwnedUnitError | InvalidToyChoiceError
> {
  switch (choice.tag) {
    case "activateGrantExtraAction": {
      const actor = getCombatant(state.combatants, choice.actorId);
      if (Either.isLeft(actor)) return Either.left(actor.left);
      const unit = getOwnedUnit(actor.right, choice.unitId);
      if (Either.isLeft(unit)) return Either.left(unit.left);
      if (unit.right.executable.tag !== "grantExtraAction") {
        return Either.left(
          new InvalidToyChoiceError({
            message: `${choice.unitId} is not a grant-extra-action unit`,
          }),
        );
      }
      if (
        actor.right.actionSurgeUsesRemaining <= 0 ||
        actor.right.actionSurgeUsedThisTurn
      ) {
        return Either.left(
          new InvalidToyChoiceError({
            message: `${choice.actorId} cannot use ${choice.unitId} right now`,
          }),
        );
      }
      return Either.right({
        combatants: replaceCombatant(state.combatants, choice.actorId, (current) => ({
          ...current,
          actionsRemaining: current.actionsRemaining + 1,
          actionSurgeUsesRemaining: current.actionSurgeUsesRemaining - 1,
          actionSurgeUsedThisTurn: true,
          extraActionForbiddenKinds: unit.right.executable.restrictedActions,
        })),
      });
    }
    case "activateSingleTargetHeal": {
      const actor = getCombatant(state.combatants, choice.actorId);
      if (Either.isLeft(actor)) return Either.left(actor.left);
      const target = getCombatant(state.combatants, choice.targetId);
      if (Either.isLeft(target)) return Either.left(target.left);
      const unit = getOwnedUnit(actor.right, choice.unitId);
      if (Either.isLeft(unit)) return Either.left(unit.left);
      if (unit.right.executable.tag !== "singleTargetHeal") {
        return Either.left(
          new InvalidToyChoiceError({
            message: `${choice.unitId} is not a single-target heal unit`,
          }),
        );
      }
      const rolledAmount = validatedRolledAmount(
        unit.right.executable.baseLevel,
        choice.slotLevel,
        choice.rolledHealing,
      );
      if (Either.isLeft(rolledAmount)) return Either.left(rolledAmount.left);
      const modifier = actor.right.spellcastingModifier ?? 0;
      const totalHealing =
        rolledAmount.right +
        (unit.right.executable.addsSpellcastingModifier ? modifier : 0);
      return Either.right({
        combatants: replaceCombatant(state.combatants, target.right.id, (current) => ({
          ...current,
          currentHp: Math.min(current.maxHp, current.currentHp + totalHealing),
        })),
      });
    }
    case "activateAreaSaveDamage": {
      const actor = getCombatant(state.combatants, choice.actorId);
      if (Either.isLeft(actor)) return Either.left(actor.left);
      const unit = getOwnedUnit(actor.right, choice.unitId);
      if (Either.isLeft(unit)) return Either.left(unit.left);
      if (unit.right.executable.tag !== "areaSaveDamage") {
        return Either.left(
          new InvalidToyChoiceError({
            message: `${choice.unitId} is not an area save damage unit`,
          }),
        );
      }
      if (actor.right.spellSaveDc == null) {
        return Either.left(
          new InvalidToyChoiceError({
            message: `${choice.actorId} has no spell save DC for ${choice.unitId}`,
          }),
        );
      }
      const rolledAmount = validatedRolledAmount(
        unit.right.executable.baseLevel,
        choice.slotLevel,
        choice.rolledDamage,
      );
      if (Either.isLeft(rolledAmount)) return Either.left(rolledAmount.left);
      const failedSet = new Set(choice.failedTargetIds);
      return Either.right({
        combatants: state.combatants.map((combatant) => {
          if (!choice.targetIds.includes(combatant.id)) return combatant;
          const damage = failedSet.has(combatant.id)
            ? rolledAmount.right
            : Math.floor(rolledAmount.right / 2);
          return {
            ...combatant,
            currentHp: Math.max(0, combatant.currentHp - damage),
          };
        }),
      });
    }
  }
}
