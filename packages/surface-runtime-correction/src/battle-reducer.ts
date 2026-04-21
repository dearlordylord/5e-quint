import { Either } from "effect";

import { advanceBattleTurn } from "#/battle-init.ts";
import type {
  Combatant,
  BattleState,
  BattleUnitAccessId,
  ResolvedBattleAction,
} from "#/battle-types.ts";
import {
  InvalidBattleActionError,
  MissingCombatantError,
} from "#/errors.ts";
import {
  interpretRuntimeUnit,
  maxUsesForCombatant,
  resourceStateForUnit,
} from "#/surface-interpretation.ts";

function mapTurnOrder(
  state: BattleState,
  update: (participant: BattleState["turnOrder"][number]) => BattleState["turnOrder"][number],
): BattleState["turnOrder"] {
  return state.turnOrder.map(update) as unknown as BattleState["turnOrder"];
}

function missingCombatant(
  combatantId: string,
): Either.Either<never, MissingCombatantError> {
  return Either.left(new MissingCombatantError({ combatantId }));
}

function invalidBattleAction(
  message: string,
): Either.Either<never, InvalidBattleActionError> {
  return Either.left(new InvalidBattleActionError({ message }));
}

function unitForCombatant(
  combatant: Combatant,
  unitAccessId: BattleUnitAccessId,
) {
  return combatant.units.find((unit) => unit.accessId === unitAccessId) ?? null;
}

function updateCombatant(
  state: BattleState,
  combatantId: string,
  update: (combatant: Combatant) => Combatant,
) {
  const combatant = state.turnOrder
    .map((participant) => participant.combatant)
    .find((candidate) => candidate.id === combatantId);
  if (combatant === undefined) {
    return missingCombatant(combatantId);
  }

  return Either.right({
    ...state,
    turnOrder: mapTurnOrder(state, (participant) =>
      participant.combatant.id !== combatantId
        ? participant
        : {
            ...participant,
            combatant: update(participant.combatant),
          },
    ),
  } satisfies BattleState);
}

function clampHp(currentHp: number, maxHp: number) {
  return Math.max(0, Math.min(currentHp, maxHp));
}

function spendNonMagicAction(state: BattleState) {
  if (state.nonMagicActionsRemaining > 0) {
    return Either.right({
      ...state,
      nonMagicActionsRemaining: state.nonMagicActionsRemaining - 1,
    } satisfies BattleState);
  }

  if (state.standardActionsRemaining > 0) {
    return Either.right({
      ...state,
      standardActionsRemaining: state.standardActionsRemaining - 1,
    } satisfies BattleState);
  }

  return invalidBattleAction("no non-magic action is currently available");
}

function spendMagicAction(state: BattleState) {
  if (state.standardActionsRemaining <= 0) {
    return invalidBattleAction("no Magic action is currently available");
  }

  return Either.right({
    ...state,
    standardActionsRemaining: state.standardActionsRemaining - 1,
  } satisfies BattleState);
}

function reduceAttack(
  state: BattleState,
  action: Extract<ResolvedBattleAction, { readonly tag: "attack" }>,
) {
  const spent = spendNonMagicAction(state);
  if (Either.isLeft(spent)) {
    return spent;
  }

  return updateCombatant(spent.right, action.targetId, (combatant) => ({
    ...combatant,
    currentHp: clampHp(combatant.currentHp - action.damage, combatant.maxHp),
  }));
}

function reduceSingleTargetHeal(
  state: BattleState,
  action: Extract<ResolvedBattleAction, { readonly tag: "singleTargetHeal" }>,
) {
  const spent = spendMagicAction(state);
  if (Either.isLeft(spent)) {
    return spent;
  }

  return updateCombatant(spent.right, action.targetId, (combatant) => ({
    ...combatant,
    currentHp: clampHp(combatant.currentHp + action.healing, combatant.maxHp),
  }));
}

function reduceAreaSaveDamage(
  state: BattleState,
  action: Extract<ResolvedBattleAction, { readonly tag: "areaSaveDamage" }>,
) {
  const spent = spendMagicAction(state);
  if (Either.isLeft(spent)) {
    return spent;
  }

  const successfulIds = new Set(
    action.targetResults
      .filter((result) => result.saveOutcome === "success")
      .map((result) => result.targetId),
  );
  const affectedIds = new Set(action.targetResults.map((result) => result.targetId));

  return Either.right({
    ...spent.right,
    turnOrder: mapTurnOrder(spent.right, (participant) => {
      const combatant = participant.combatant;
      if (!affectedIds.has(combatant.id)) {
        return participant;
      }

      const damage = successfulIds.has(combatant.id)
        ? Math.floor(action.damage / 2)
        : action.damage;
      return {
        ...participant,
        combatant: {
          ...combatant,
          currentHp: clampHp(combatant.currentHp - damage, combatant.maxHp),
        },
      };
    }),
  } satisfies BattleState);
}

function reduceGrantExtraAction(
  state: BattleState,
  action: Extract<ResolvedBattleAction, { readonly tag: "grantExtraAction" }>,
) {
  const actor = state.turnOrder
    .map((participant) => participant.combatant)
    .find((combatant) => combatant.id === action.actorId);
  if (actor === undefined) {
    return missingCombatant(action.actorId);
  }

  const unit = unitForCombatant(actor, action.unitAccessId);
  if (unit === null) {
    return invalidBattleAction("unit is not currently available to the acting combatant");
  }

  const interpretation = interpretRuntimeUnit(unit);
  if (interpretation._tag !== "Some" || interpretation.value.tag !== "grantExtraAction") {
    return invalidBattleAction("unit does not structurally grant an extra action");
  }

  const resourceState = resourceStateForUnit(actor, action.unitAccessId);
  if (resourceState === null) {
    return invalidBattleAction("unit resource state is missing");
  }

  if (resourceState.usedThisTurn) {
    return invalidBattleAction("unit has already been used this turn");
  }

  if (
    resourceState.expendedUses >=
    maxUsesForCombatant(actor, interpretation.value)
  ) {
    return invalidBattleAction("unit has no uses remaining");
  }

  const updated = updateCombatant(state, action.actorId, (combatant) => ({
    ...combatant,
    unitResourceStates: combatant.unitResourceStates.map((candidate) =>
      candidate.unitAccessId !== action.unitAccessId
        ? candidate
        : {
            ...candidate,
            expendedUses: candidate.expendedUses + 1,
            usedThisTurn: true,
          },
    ),
  }));
  if (Either.isLeft(updated)) {
    return updated;
  }

  return Either.right({
    ...updated.right,
    nonMagicActionsRemaining: updated.right.nonMagicActionsRemaining + 1,
  } satisfies BattleState);
}

export function reduceBattleState(
  state: BattleState,
  action: ResolvedBattleAction,
): Either.Either<BattleState, MissingCombatantError | InvalidBattleActionError> {
  if (state.turnOrder[0].combatant.id !== action.actorId) {
    return invalidBattleAction("resolved action does not belong to the current turn actor");
  }

  if (action.tag === "endTurn") {
    return Either.right(advanceBattleTurn(state));
  }
  if (action.tag === "attack") {
    return reduceAttack(state, action);
  }
  if (action.tag === "singleTargetHeal") {
    return reduceSingleTargetHeal(state, action);
  }
  if (action.tag === "areaSaveDamage") {
    return reduceAreaSaveDamage(state, action);
  }

  return reduceGrantExtraAction(state, action);
}
