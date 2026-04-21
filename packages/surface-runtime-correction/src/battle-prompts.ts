import { Either } from "effect";

import { InvalidBattlePromptAnswerError } from "#/errors.ts";
import type {
  AvailableTurnOption,
  AvailableBattlePrompt,
  BattleUnitAccessId,
  BattlePromptAnswer,
  BattleResolutionResult,
  BattleState,
  OpenBattlePrompt,
  OpenBattlePromptState,
  ResolvedBattleAction,
} from "#/battle-types.ts";
import {
  interpretRuntimeUnit,
  maxUsesForCombatant,
  resourceStateForUnit,
} from "#/surface-interpretation.ts";
import type { CreatureId, RuntimeUnitAccess } from "#/types.ts";

function invalidBattlePromptAnswer(
  message: string,
): Either.Either<never, InvalidBattlePromptAnswerError> {
  return Either.left(new InvalidBattlePromptAnswerError({ message }));
}

function duplicateIds(ids: ReadonlyArray<CreatureId>): ReadonlyArray<CreatureId> {
  const seen = new Set<CreatureId>();
  const duplicates = new Set<CreatureId>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
      continue;
    }
    seen.add(id);
  }
  return [...duplicates];
}

function currentCombatant(state: BattleState) {
  return state.turnOrder[0]?.combatant ?? null;
}

function clearOpenPrompt(state: BattleState): BattleState {
  return {
    ...state,
    openPrompt: null,
  };
}

function stateWithOpenPrompt(
  state: BattleState,
  prompt: OpenBattlePromptState,
): BattleState {
  return {
    ...state,
    openPrompt: prompt,
  };
}

function actorOwnsChoice(
  availableChoices: ReadonlyArray<AvailableTurnOption>,
  choice: AvailableTurnOption,
): boolean {
  return availableChoices.some((availableChoice) => {
    if (availableChoice.tag !== choice.tag) {
      return false;
    }

    if (availableChoice.tag === "coreAction" && choice.tag === "coreAction") {
      return availableChoice.action === choice.action;
    }

    if (availableChoice.tag === "unit" && choice.tag === "unit") {
      return availableChoice.unitAccessId === choice.unitAccessId;
    }

    return false;
  });
}

function combatantIds(state: BattleState): ReadonlyArray<CreatureId> {
  return state.turnOrder.map((participant) => participant.combatant.id);
}

function attackTargetIds(
  state: BattleState,
  actorId: CreatureId,
): ReadonlyArray<CreatureId> {
  return state.turnOrder
    .map((participant) => participant.combatant)
    .filter((combatant) => combatant.id !== actorId)
    .map((combatant) => combatant.id);
}

function canTakeMagicAction(state: BattleState): boolean {
  return state.standardActionsRemaining > 0;
}

function canTakeNonMagicAction(state: BattleState): boolean {
  return (
    state.standardActionsRemaining > 0 || state.nonMagicActionsRemaining > 0
  );
}

function unitAccessForCombatant(
  state: BattleState,
  actorId: CreatureId,
  unitAccessId: BattleUnitAccessId,
): RuntimeUnitAccess | null {
  const combatant = state.turnOrder
    .map((participant) => participant.combatant)
    .find((candidate) => candidate.id === actorId);
  if (combatant === undefined) {
    return null;
  }

  return combatant.units.find((unit) => unit.accessId === unitAccessId) ?? null;
}

function unitActionAvailable(
  state: BattleState,
  unit: RuntimeUnitAccess,
): boolean {
  const interpretation = interpretRuntimeUnit(unit);
  if (interpretation._tag !== "Some") {
    return false;
  }

  if (interpretation.value.tag === "grantExtraAction") {
    const combatant = currentCombatant(state);
    if (combatant === null) {
      return false;
    }
    const resourceState = resourceStateForUnit(combatant, unit.accessId);
    return (
      resourceState !== null &&
      !resourceState.usedThisTurn &&
      resourceState.expendedUses <
        maxUsesForCombatant(combatant, interpretation.value)
    );
  }

  return canTakeMagicAction(state);
}

function actorActionChoices(
  state: BattleState,
): ReadonlyArray<AvailableTurnOption> {
  const combatant = currentCombatant(state);
  if (combatant === null) {
    return [];
  }

  const choices: Array<AvailableTurnOption> = [
    { tag: "coreAction", action: "endTurn" },
    ...combatant.units
      .filter((unit) => unitActionAvailable(state, unit))
      .map(
        (unit) =>
          ({
            tag: "unit",
            unitAccessId: unit.accessId,
          }) satisfies AvailableTurnOption,
      ),
  ];

  if (
    canTakeNonMagicAction(state) &&
    attackTargetIds(state, combatant.id).length > 0
  ) {
    choices.unshift({ tag: "coreAction", action: "attack" });
  }

  return choices;
}

function validateDistinctTargetIds(
  ids: ReadonlyArray<CreatureId>,
  allowedIds: ReadonlyArray<CreatureId>,
  label: string,
): Either.Either<ReadonlyArray<CreatureId>, InvalidBattlePromptAnswerError> {
  const duplicates = duplicateIds(ids);
  if (duplicates.length > 0) {
    return invalidBattlePromptAnswer(
      `${label} contain duplicate actor ids: ${duplicates.join(", ")}`,
    );
  }

  const allowedIdSet = new Set(allowedIds);
  const unknownIds = ids.filter((id) => !allowedIdSet.has(id));
  if (unknownIds.length > 0) {
    return invalidBattlePromptAnswer(
      `${label} contain unknown actor ids: ${unknownIds.join(", ")}`,
    );
  }

  return Either.right(ids);
}

function deriveOpenBattlePrompt(
  state: BattleState,
  openPrompt: OpenBattlePromptState,
): Either.Either<OpenBattlePrompt, InvalidBattlePromptAnswerError> {
  const combatant = currentCombatant(state);
  if (combatant === null) {
    return invalidBattlePromptAnswer("no prompt is currently available");
  }

  if (openPrompt.tag === "chooseAttackTarget") {
    const availableTargetIds = attackTargetIds(state, combatant.id);
    if (availableTargetIds.length === 0) {
      return invalidBattlePromptAnswer("attack is not currently available");
    }

    return Either.right({
      tag: "chooseAttackTarget",
      actorId: combatant.id,
      availableTargetIds,
    });
  }

  if (openPrompt.tag === "chooseSingleTargetUnit") {
    const unit = unitAccessForCombatant(
      state,
      combatant.id,
      openPrompt.unitAccessId,
    );
    if (unit === null) {
      return invalidBattlePromptAnswer("selected unit is no longer available");
    }

    const interpretation = interpretRuntimeUnit(unit);
    if (interpretation._tag !== "Some" || interpretation.value.tag !== "singleTargetHeal") {
      return invalidBattlePromptAnswer(
        "selected unit is not a structurally supported single-target heal",
      );
    }

    return Either.right({
      tag: "chooseSingleTargetUnit",
      actorId: combatant.id,
      unitAccessId: openPrompt.unitAccessId,
      targeting: interpretation.value.targeting,
      effect: {
        tag: "healHp",
      },
    });
  }

  const unit = unitAccessForCombatant(
    state,
    combatant.id,
    openPrompt.unitAccessId,
  );
  if (unit === null) {
    return invalidBattlePromptAnswer("selected unit is no longer available");
  }

  const interpretation = interpretRuntimeUnit(unit);
  if (interpretation._tag !== "Some" || interpretation.value.tag !== "areaSaveDamage") {
    return invalidBattlePromptAnswer(
      "selected unit is not a structurally supported area effect",
    );
  }
  if (combatant.spellSaveDc === null) {
    return invalidBattlePromptAnswer("current actor does not have a spell save dc");
  }

  return Either.right({
    tag: "chooseAreaEffect",
    actorId: combatant.id,
    unitAccessId: openPrompt.unitAccessId,
    targeting: interpretation.value.targeting,
    save: {
      ability: interpretation.value.saveAbility,
      dc: combatant.spellSaveDc,
    },
    effect: {
      tag: "damage",
      damageType: interpretation.value.damageType,
      onSuccess: "half",
    },
  });
}

function openPromptForUnit(
  state: BattleState,
  actorId: CreatureId,
  unitAccessId: BattleUnitAccessId,
): Either.Either<BattleResolutionResult, InvalidBattlePromptAnswerError> {
  const unit = unitAccessForCombatant(state, actorId, unitAccessId);
  if (unit === null) {
    return invalidBattlePromptAnswer("selected unit is not currently available");
  }

  const interpretation = interpretRuntimeUnit(unit);
  if (interpretation._tag !== "Some") {
    return invalidBattlePromptAnswer(
      "selected unit is not structurally supported in this slice",
    );
  }

  if (interpretation.value.tag === "grantExtraAction") {
    return Either.right({
      tag: "resolvedAction",
      state: clearOpenPrompt(state),
      action: {
        tag: "grantExtraAction",
        actorId,
        unitAccessId,
      } satisfies ResolvedBattleAction,
    });
  }

  if (interpretation.value.tag === "singleTargetHeal") {
    const nextState = stateWithOpenPrompt(clearOpenPrompt(state), {
      tag: "chooseSingleTargetUnit",
      unitAccessId,
    });
    const nextPrompt = deriveOpenBattlePrompt(nextState, nextState.openPrompt!);
    if (Either.isLeft(nextPrompt)) {
      return Either.left(nextPrompt.left);
    }
    return Either.right({
      tag: "openedPrompt",
      state: nextState,
      prompt: nextPrompt.right,
    });
  }

  const nextState = stateWithOpenPrompt(clearOpenPrompt(state), {
    tag: "chooseAreaEffect",
    unitAccessId,
  });
  const nextPrompt = deriveOpenBattlePrompt(nextState, nextState.openPrompt!);
  if (Either.isLeft(nextPrompt)) {
    return Either.left(nextPrompt.left);
  }
  return Either.right({
    tag: "openedPrompt",
    state: nextState,
    prompt: nextPrompt.right,
  });
}

export function discoverAvailableBattlePrompt(
  state: BattleState,
): AvailableBattlePrompt | null {
  if (state.openPrompt !== null) {
    const openPrompt = deriveOpenBattlePrompt(state, state.openPrompt);
    return Either.isRight(openPrompt) ? openPrompt.right : null;
  }

  const combatant = currentCombatant(state);
  if (combatant === null) {
    return null;
  }

  return {
    tag: "chooseAction",
    actorId: combatant.id,
    options: actorActionChoices(state),
  };
}

export function answerBattlePrompt(
  state: BattleState,
  answer: BattlePromptAnswer,
): Either.Either<BattleResolutionResult, InvalidBattlePromptAnswerError> {
  if (state.openPrompt !== null) {
    const openPrompt = deriveOpenBattlePrompt(state, state.openPrompt);
    if (Either.isLeft(openPrompt)) {
      return Either.left(openPrompt.left);
    }

    return answerDerivedBattlePrompt(state, openPrompt.right, answer);
  }

  const prompt = discoverAvailableBattlePrompt(state);
  if (prompt === null) {
    return invalidBattlePromptAnswer("no prompt is currently available");
  }

  return answerDerivedBattlePrompt(state, prompt, answer);
}

function answerDerivedBattlePrompt(
  state: BattleState,
  prompt: AvailableBattlePrompt,
  answer: BattlePromptAnswer,
): Either.Either<BattleResolutionResult, InvalidBattlePromptAnswerError> {
  if (prompt.tag !== answer.tag) {
    return invalidBattlePromptAnswer(
      `expected answer for ${prompt.tag}, received ${answer.tag}`,
    );
  }

  if (prompt.tag === "chooseAction" && answer.tag === "chooseAction") {
    if (!actorOwnsChoice(prompt.options, answer.choice)) {
      return invalidBattlePromptAnswer("chosen action is not currently available");
    }

    if (answer.choice.tag === "unit") {
      return openPromptForUnit(
        state,
        prompt.actorId,
        answer.choice.unitAccessId,
      );
    }

    if (answer.choice.action === "endTurn") {
      return Either.right({
        tag: "resolvedAction",
        state: clearOpenPrompt(state),
        action: {
          tag: "endTurn",
          actorId: prompt.actorId,
        },
      });
    }

    const availableTargetIds = attackTargetIds(state, prompt.actorId);
    if (availableTargetIds.length === 0) {
      return invalidBattlePromptAnswer("attack is not currently available");
    }

    const nextState = stateWithOpenPrompt(clearOpenPrompt(state), {
      tag: "chooseAttackTarget",
    });
    const nextPrompt: OpenBattlePrompt = {
      tag: "chooseAttackTarget",
      actorId: prompt.actorId,
      availableTargetIds,
    };
    return Either.right({
      tag: "openedPrompt",
      state: nextState,
      prompt: nextPrompt,
    });
  }

  if (prompt.tag === "chooseAttackTarget" && answer.tag === "chooseAttackTarget") {
    const targetIds = validateDistinctTargetIds(
      [answer.targetId],
      prompt.availableTargetIds,
      "attack targets",
    );
    if (Either.isLeft(targetIds)) {
      return Either.left(targetIds.left);
    }

    return Either.right({
      tag: "resolvedAction",
      state: clearOpenPrompt(state),
      action: {
        tag: "attack",
        actorId: prompt.actorId,
        targetId: answer.targetId,
        damage: answer.damage,
      },
    });
  }

  if (
    prompt.tag === "chooseSingleTargetUnit" &&
    answer.tag === "chooseSingleTargetUnit"
  ) {
    const targetIds = validateDistinctTargetIds(
      [answer.targetId],
      combatantIds(state),
      "unit targets",
    );
    if (Either.isLeft(targetIds)) {
      return Either.left(targetIds.left);
    }

    return Either.right({
      tag: "resolvedAction",
      state: clearOpenPrompt(state),
      action: {
        tag: "singleTargetHeal",
        actorId: prompt.actorId,
        unitAccessId: prompt.unitAccessId,
        targetId: answer.targetId,
        healing: answer.amount,
      },
    });
  }

  if (prompt.tag !== "chooseAreaEffect" || answer.tag !== "chooseAreaEffect") {
    return invalidBattlePromptAnswer(
      `expected answer for ${prompt.tag}, received ${answer.tag}`,
    );
  }

  const targetIds = validateDistinctTargetIds(
    answer.targetResults.map((result) => result.targetId),
    combatantIds(state),
    "area targets",
  );
  if (Either.isLeft(targetIds)) {
    return Either.left(targetIds.left);
  }

  return Either.right({
    tag: "resolvedAction",
    state: clearOpenPrompt(state),
      action: {
        tag: "areaSaveDamage",
        actorId: prompt.actorId,
        unitAccessId: prompt.unitAccessId,
        targetResults: answer.targetResults,
        damage: answer.amount,
      },
  });
}
