import { Match } from "effect";
import { currentActing, nextInitiative } from "@dnd/shared/initiative-algebra";

import {
  coreAttackDamageHole,
  coreAttackRollHole,
  coreAttackTargetHole,
} from "#/reducer-core-attack-holes.ts";
import { canUseCoreAttack } from "#/reducer-core-acts.ts";
import type { State } from "#/reducer-state.ts";
import { holeId } from "#/reducer-types.ts";
import type {
  FilledHoleValue,
  ResolutionRequest,
  ResolutionResult,
  RuntimeHoleSet,
} from "#/reducer-types.ts";

function isTargetChoiceValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: "targetChoice" }> {
  return value.kind === "targetChoice";
}

function isAttackRollValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: "attackRoll" }> {
  return value.kind === "attackRoll";
}

function isRolledDiceValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: "rolledDice" }> {
  return value.kind === "rolledDice";
}

function needsTargetHole(): ResolutionResult {
  return {
    tag: "needsHoles",
    holes: [coreAttackTargetHole()],
  };
}

function needsAttackRollHole(): ResolutionResult {
  return {
    tag: "needsHoles",
    holes: [coreAttackRollHole()],
  };
}

function needsDamageRollHole(): ResolutionResult {
  return {
    tag: "needsHoles",
    holes: [coreAttackDamageHole()],
  };
}

function validateCurrentHoleInputs(
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
  expectedHoles: RuntimeHoleSet,
): (ResolutionResult & { readonly tag: "invalid" }) | null {
  const expectedById = new Map(
    expectedHoles.map((hole) => [hole.holeId, hole]),
  );
  const seen = new Set<string>();

  for (const value of filledHoleValues) {
    const seenKey = String(value.holeId);
    if (seen.has(seenKey)) {
      return {
        tag: "invalid",
        reason: `duplicate filled value for hole ${seenKey}`,
      };
    }
    seen.add(seenKey);

    const expectedHole = expectedById.get(value.holeId);
    if (expectedHole === undefined) {
      return {
        tag: "invalid",
        reason: `unexpected filled value for hole ${seenKey}`,
      };
    }

    if (expectedHole.kind !== value.kind) {
      return {
        tag: "invalid",
        reason: `filled value kind ${value.kind} does not match hole ${seenKey}`,
      };
    }
  }

  return null;
}

function ensureActingCreature(
  state: State,
  request: ResolutionRequest,
): ResolutionResult | null {
  const acting = currentActing(state.initiative);
  if (request.subject.actorId !== acting) {
    return { tag: "invalid", reason: "actor is not currently acting" };
  }

  return null;
}

function advanceCoreAttackHoleResolution(
  state: State,
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
): ResolutionResult {
  if (!canUseCoreAttack(state)) {
    return { tag: "invalid", reason: "no action available for attack" };
  }

  const acting = currentActing(state.initiative);

  if (![...state.combatants.keys()].some((id) => id !== acting)) {
    return { tag: "invalid", reason: "no valid attack target" };
  }

  const targetChoice = filledHoleValues
    .filter(isTargetChoiceValue)
    .find((value) => value.holeId === holeId("core_attack_target"));

  if (targetChoice === undefined) {
    const targetValidation = validateCurrentHoleInputs(filledHoleValues, [
      coreAttackTargetHole(),
    ]);
    if (targetValidation !== null) {
      return targetValidation;
    }

    return needsTargetHole();
  }

  if (
    targetChoice.value === acting ||
    !state.combatants.has(targetChoice.value)
  ) {
    return { tag: "invalid", reason: "invalid attack target" };
  }

  const attackRoll = filledHoleValues
    .filter(isAttackRollValue)
    .find((value) => value.holeId === holeId("core_attack_roll"));

  if (attackRoll === undefined) {
    const attackRollValidation = validateCurrentHoleInputs(filledHoleValues, [
      coreAttackTargetHole(),
      coreAttackRollHole(),
    ]);
    if (attackRollValidation !== null) {
      return attackRollValidation;
    }

    return needsAttackRollHole();
  }

  const damageRoll = filledHoleValues
    .filter(isRolledDiceValue)
    .find((value) => value.holeId === holeId("core_attack_damage"));

  if (damageRoll === undefined) {
    const damageRollValidation = validateCurrentHoleInputs(filledHoleValues, [
      coreAttackTargetHole(),
      coreAttackRollHole(),
      coreAttackDamageHole(),
    ]);
    if (damageRollValidation !== null) {
      return damageRollValidation;
    }

    return needsDamageRollHole();
  }

  const fullValidation = validateCurrentHoleInputs(filledHoleValues, [
    coreAttackTargetHole(),
    coreAttackRollHole(),
    coreAttackDamageHole(),
  ]);
  if (fullValidation !== null) {
    return fullValidation;
  }

  return {
    tag: "invalid",
    reason: "attack hit adjudication is not implemented yet",
  };
}

function resolveCoreEndTurn(state: State): ResolutionResult {
  const initiative = nextInitiative(state.initiative);

  return {
    tag: "resolved",
    state: {
      ...state,
      initiative,
      currentActionsAvailable: 1,
      currentHasBonusAction: true,
      currentHasFreeAction: true,
    },
  };
}

export function resolveSubjectHoles(
  state: State,
  request: ResolutionRequest,
): ResolutionResult {
  const actingError = ensureActingCreature(state, request);
  if (actingError !== null) {
    return actingError;
  }

  return Match.value(request.subject).pipe(
  Match.when({ tag: "coreAct" }, (subject) =>
    Match.value(subject.act).pipe(
      Match.when("attack", () =>
        advanceCoreAttackHoleResolution(state, request.filledHoleValues),
      ),
      Match.when("endTurn", () => resolveCoreEndTurn(state)),
      Match.exhaustive,
    ),
  ),
  Match.when({ tag: "unit" }, () => resolveUnitSubjectHoles(state, request)),
  Match.orElse(() => ({ tag: "invalid", reason: "not implemented" }) as const),
);
}

export function resolveUnitSubjectHoles(
  state: State,
  request: ResolutionRequest,
): ResolutionResult {
  const actor = state.combatants.get(request.subject.actorId);
  return {
    tag: "invalid",
    reason: "unit-backed hole resolution not implemented yet",
  };
}
