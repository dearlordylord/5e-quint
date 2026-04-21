import { Either } from "effect";

import { InvalidBattlePromptAnswerError } from "#/errors.ts";
import type {
  AvailableBattleAction,
  AvailableBattlePrompt,
  BattlePromptAnswer,
  BattleResolutionResult,
  BattleState,
  OpenBattlePrompt,
  OpenBattlePromptState,
} from "#/battle-types.ts";
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
  if (state.turnActorId === null) {
    return null;
  }

  return (
    state.combatants.find((combatant) => combatant.id === state.turnActorId) ??
    null
  );
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

function sameUnitAccess(
  left: RuntimeUnitAccess,
  right: RuntimeUnitAccess,
): boolean {
  return (
    left.ownerId === right.ownerId &&
    left.sourceKind === right.sourceKind &&
    left.unit.id === right.unit.id
  );
}

function actorOwnsChoice(
  availableChoices: ReadonlyArray<AvailableBattleAction>,
  choice: AvailableBattleAction,
): boolean {
  return availableChoices.some((availableChoice) => {
    if (availableChoice.tag !== choice.tag) {
      return false;
    }

    if (availableChoice.tag === "coreAction" && choice.tag === "coreAction") {
      return availableChoice.action === choice.action;
    }

    if (availableChoice.tag === "unit" && choice.tag === "unit") {
      return sameUnitAccess(availableChoice.unit, choice.unit);
    }

    return false;
  });
}

function attackTargetIds(
  state: BattleState,
  actorId: CreatureId,
): ReadonlyArray<CreatureId> {
  return state.combatants
    .filter((combatant) => combatant.id !== actorId)
    .map((combatant) => combatant.id);
}

function actorActionChoices(
  state: BattleState,
): ReadonlyArray<AvailableBattleAction> {
  const combatant = currentCombatant(state);
  if (combatant === null) {
    return [];
  }

  const choices: Array<AvailableBattleAction> = [
    { tag: "coreAction", action: "endTurn" },
    ...combatant.units.map(
      (unit) =>
        ({
          tag: "unit",
          unit,
        }) satisfies AvailableBattleAction,
    ),
  ];

  if (attackTargetIds(state, combatant.id).length > 0) {
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
  _openPrompt: OpenBattlePromptState,
): Either.Either<OpenBattlePrompt, InvalidBattlePromptAnswerError> {
  const combatant = currentCombatant(state);
  if (combatant === null) {
    return invalidBattlePromptAnswer("no prompt is currently available");
  }

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

export function discoverAvailableBattlePrompt(
  state: BattleState,
): AvailableBattlePrompt | null {
  if (state.turnActorId === null) {
    return null;
  }

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
      return Either.right({
        tag: "resolvedAction",
        state: clearOpenPrompt(state),
        action: {
          tag: "useUnit",
          unit: answer.choice.unit,
        },
      });
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

    const nextPromptState: OpenBattlePromptState = {
      tag: "chooseAttackTarget",
    };
    const nextState = stateWithOpenPrompt(clearOpenPrompt(state), nextPromptState);
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

  if (prompt.tag !== "chooseAttackTarget" || answer.tag !== "chooseAttackTarget") {
    return invalidBattlePromptAnswer(
      `expected answer for ${prompt.tag}, received ${answer.tag}`,
    );
  }

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
    },
  });
}
