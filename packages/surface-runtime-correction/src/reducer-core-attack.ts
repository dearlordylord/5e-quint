import type { CreatureId } from "@dnd/shared/types";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";

import {
  coreAttackDamageHole,
  coreAttackRollHole,
  coreAttackTargetHole,
} from "#/reducer-core-attack-holes.ts";
import { canUseCoreAttack } from "#/reducer-core-acts.ts";
import { validateCurrentHoleInputs } from "#/reducer-hole-refilling.ts";
import type { State } from "#/reducer-state.ts";
import { holeId } from "#/reducer-types.ts";
import type {
  AvailableAct,
  FilledHoleValue,
  ResolutionResult,
  RuntimeHoleSet,
  Subject,
} from "#/reducer-types.ts";

export type CoreAttackSubject = Extract<
  Subject,
  { readonly tag: "coreAct" }
> & { readonly act: "attack" };

export type CoreAttackAct = AvailableAct & {
  readonly subject: CoreAttackSubject;
};

function invalid(reason: string): ResolutionResult {
  return { tag: "invalid", reason };
}

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

function hasAttackTarget(state: State, actorId: CreatureId): boolean {
  return [...state.combatants.keys()].some((id) => id !== actorId);
}

export function discoverCoreAttackAct(
  state: State,
  actorId: CreatureId,
): CoreAttackAct | null {
  if (!canUseCoreAttack(state) || !hasAttackTarget(state, actorId)) {
    return null;
  }

  return {
    subject: {
      tag: "coreAct",
      actorId,
      act: "attack",
    },
    label: "Attack",
    summary: "Make an attack.",
    initialHoles: [coreAttackTargetHole()],
  };
}

function nextCoreAttackHoles(holes: RuntimeHoleSet): ResolutionResult {
  return {
    tag: "needsHoles",
    holes,
  };
}

export function resolveCoreAttackHoles(
  state: State,
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
): ResolutionResult {
  if (!canUseCoreAttack(state)) {
    return invalid("no action available for attack");
  }

  const acting = currentActing(state.initiative);

  if (!hasAttackTarget(state, acting)) {
    return invalid("no valid attack target");
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

    return nextCoreAttackHoles([coreAttackTargetHole()]);
  }

  if (
    targetChoice.value === acting ||
    !state.combatants.has(targetChoice.value)
  ) {
    return invalid("invalid attack target");
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

    return nextCoreAttackHoles([coreAttackRollHole()]);
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

    return nextCoreAttackHoles([coreAttackDamageHole()]);
  }

  const fullValidation = validateCurrentHoleInputs(filledHoleValues, [
    coreAttackTargetHole(),
    coreAttackRollHole(),
    coreAttackDamageHole(),
  ]);
  if (fullValidation !== null) {
    return fullValidation;
  }

  return invalid("attack hit adjudication is not implemented yet");
}
