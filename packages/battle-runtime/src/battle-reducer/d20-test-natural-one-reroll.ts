// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll

import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleFill,
  BattleAttackRollResult,
  BattleAttackRollHole,
  BattleCreatureState,
  BattleD20TestNaturalOneRerollDieDecision,
  BattleD20TestNaturalOneRerollDecision,
  BattleD20TestNaturalOneRerollOutcomeDecision,
  BattleD20TestNaturalOneRerollOption,
  BattleHole,
  BattleSpellAttackRollHole,
  BattleD20TestRollReplacement,
  BattleSavingThrowOutcome,
} from "../battle-reducer.ts";

export const D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE =
  "D20 Test natural-1 reroll is not available for this actor.";
export const D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE =
  "D20 Test natural-1 reroll can be used only after rolling a natural 1.";
export const D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE =
  "D20 Test natural-1 replacement roll is outside the d20 protocol.";
export const D20_TEST_NATURAL_ONE_REROLL_MODE_MESSAGE =
  "D20 Test natural-1 replacement roll mode does not match the current D20 Test rule.";
export const D20_TEST_NATURAL_ONE_REROLL_STACKING_MESSAGE =
  "D20 Test natural-1 reroll cannot be combined with another d20 reroll on the same roll.";
export const D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE =
  "D20 Test natural-1 reroll requires an explicit reroll or decline decision.";
export const D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE =
  "D20 Test natural-1 reroll support requires the triggering natural d20 face.";
export const D20_TEST_NATURAL_ONE_REROLL_WITHOUT_ROLL_MESSAGE =
  "Saving Throw outcomes without a roll cannot include d20 roll or reroll facts.";
const D20_TEST_NATURAL_ONE_REROLL_OPTION = {
  effectKind: "d20_test_natural_one_reroll",
  label: "D20 Test natural-1 reroll",
} as const satisfies BattleD20TestNaturalOneRerollOption;

export function d20TestNaturalOneRerollRollDecisionRequired(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly decision: BattleD20TestNaturalOneRerollDecision | undefined;
}): boolean {
  return (
    combatantHasD20TestNaturalOneReroll(input.actor) &&
    input.originalNaturalD20 === 1 &&
    input.decision === undefined
  );
}

export function d20TestNaturalOneRerollOutcomeDecisionRequired(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly decision: BattleD20TestNaturalOneRerollOutcomeDecision | undefined;
  readonly withoutRoll?: true | undefined;
}): boolean {
  return (
    combatantHasD20TestNaturalOneReroll(input.actor) &&
    input.withoutRoll !== true &&
    input.originalNaturalD20 === 1 &&
    input.decision === undefined
  );
}

export function d20TestNaturalOneRerollDieDecisionRequired(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly decision: BattleD20TestNaturalOneRerollDieDecision | undefined;
}): boolean {
  return (
    combatantHasD20TestNaturalOneReroll(input.actor) &&
    input.originalNaturalD20 === 1 &&
    input.decision === undefined
  );
}

type BattleD20TestNaturalOneRerollHole = Extract<
  BattleHole,
  {
    readonly kind:
      | "abilityCheck"
      | "attackRoll"
      | "concentrationSavingThrow"
      | "deathSavingThrow"
      | "savingThrowOutcome"
      | "spellcastingAbilityCheck";
  }
>;

export function d20TestNaturalOneRerollHoleWithOption<
  T extends BattleD20TestNaturalOneRerollHole,
>(hole: T): T & {
  readonly d20TestNaturalOneRerolls: readonly [
    BattleD20TestNaturalOneRerollOption,
  ];
} {
  return {
    ...hole,
    d20TestNaturalOneRerolls: [D20_TEST_NATURAL_ONE_REROLL_OPTION],
  };
}

export function attackRollHoleWithD20TestNaturalOneRerollOption<
  T extends BattleAttackRollHole | BattleSpellAttackRollHole,
>(hole: T): T & {
  readonly d20TestNaturalOneRerolls: readonly [
    BattleD20TestNaturalOneRerollOption,
  ];
} {
  return d20TestNaturalOneRerollHoleWithOption(hole);
}

export function combatantHasD20TestNaturalOneReroll(
  actor: BattleCreatureState | undefined,
): boolean {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.d20TestNaturalOneRerollProfiles.size > 0
  );
}

export function d20TestNaturalOneRerollRollIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly decision: BattleD20TestNaturalOneRerollDecision | undefined;
  readonly requiredRollMode?: AttackRollMode | undefined;
  readonly otherD20RerollPresent?: boolean;
}): string | null {
  const decision = input.decision;
  if (!combatantHasD20TestNaturalOneReroll(input.actor)) {
    return decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE;
  }
  if (input.originalNaturalD20 === undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE;
  }
  if (input.originalNaturalD20 !== 1) {
    return decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE;
  }
  if (decision === undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE;
  }
  if (decision.kind === "decline") {
    return null;
  }
  if (input.otherD20RerollPresent === true) {
    return D20_TEST_NATURAL_ONE_REROLL_STACKING_MESSAGE;
  }
  if (!d20TestRollReplacementIsValid(decision.replacement)) {
    return D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE;
  }
  return d20TestRollModeMatches(decision.replacement, input.requiredRollMode)
    ? null
    : D20_TEST_NATURAL_ONE_REROLL_MODE_MESSAGE;
}

export function d20TestNaturalOneRerollOutcomeIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly decision: BattleD20TestNaturalOneRerollOutcomeDecision | undefined;
  readonly withoutRoll?: true | undefined;
  readonly succeeded?: boolean | undefined;
}): string | null {
  const decision = input.decision;
  if (input.withoutRoll === true) {
    return input.originalNaturalD20 === undefined &&
      decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_WITHOUT_ROLL_MESSAGE;
  }
  if (!combatantHasD20TestNaturalOneReroll(input.actor)) {
    return decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE;
  }
  if (input.originalNaturalD20 === undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE;
  }
  if (input.originalNaturalD20 !== 1) {
    return decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE;
  }
  if (decision === undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE;
  }
  if (decision.kind === "decline") {
    return null;
  }
  return d20DieFaceIsValid(Number(decision.replacement.naturalD20))
    ? null
    : D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE;
}

export function d20TestNaturalOneRerollDieIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly decision: BattleD20TestNaturalOneRerollDieDecision | undefined;
}): string | null {
  const decision = input.decision;
  if (!combatantHasD20TestNaturalOneReroll(input.actor)) {
    return decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE;
  }
  if (input.originalNaturalD20 === undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE;
  }
  if (input.originalNaturalD20 !== 1) {
    return decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE;
  }
  if (decision === undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE;
  }
  if (decision.kind === "decline") {
    return null;
  }
  return d20DieFaceIsValid(Number(decision.replacement))
    ? null
    : D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE;
}

export function effectiveD20TestNaturalOneRerollAttackRoll(
  attackRoll: BattleAttackRollResult,
): BattleAttackRollResult {
  const decision = attackRoll.d20TestNaturalOneReroll;
  if (decision?.kind !== "reroll") {
    return attackRoll;
  }
  return {
    ...attackRoll,
    total: decision.replacement.total,
    naturalD20: decision.replacement.naturalD20,
    ...(decision.replacement.rollMode === undefined
      ? {}
      : { rollMode: decision.replacement.rollMode }),
  };
}

export function effectiveD20TestNaturalOneRerollAbilityCheckValue<T extends {
  readonly total: number;
  readonly naturalD20?: BattleD20TestRollReplacement["naturalD20"];
  readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollDecision;
}>(value: T): T {
  const decision = value.d20TestNaturalOneReroll;
  if (decision?.kind !== "reroll") {
    return value;
  }
  return {
    ...value,
    total: decision.replacement.total,
    naturalD20: decision.replacement.naturalD20,
  };
}

export function effectiveD20TestNaturalOneRerollDeathSavingThrow(
  fill: Extract<BattleFill, { readonly kind: "deathSavingThrow" }>,
): Extract<BattleFill, { readonly kind: "deathSavingThrow" }> {
  const decision = fill.d20TestNaturalOneReroll;
  if (decision?.kind !== "reroll") {
    return fill;
  }
  return {
    ...fill,
    value: decision.replacement,
  };
}

export function effectiveD20TestNaturalOneRerollConcentrationSavingThrow<
  T extends Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>,
>(fill: T): T {
  const decision = fill.value.d20TestNaturalOneReroll;
  if (decision?.kind !== "reroll") {
    return fill;
  }
  const { withoutRoll: _withoutRoll, ...value } = fill.value;
  return {
    ...fill,
    value: {
      ...value,
      succeeded: decision.replacement.succeeded,
      naturalD20: decision.replacement.naturalD20,
    },
  };
}

export function effectiveD20TestNaturalOneRerollSavingThrowOutcome(
  outcome: BattleSavingThrowOutcome,
): BattleSavingThrowOutcome {
  const decision = outcome.d20TestNaturalOneReroll;
  if (decision?.kind !== "reroll") {
    return outcome;
  }
  const { withoutRoll: _withoutRoll, ...rolledOutcome } = outcome;
  return {
    ...rolledOutcome,
    succeeded: decision.replacement.succeeded,
    naturalD20: decision.replacement.naturalD20,
  };
}

export function effectiveD20TestNaturalOneRerollSavingThrowOutcomes<
  T extends { readonly outcomes: readonly BattleSavingThrowOutcome[] },
>(value: T): T {
  return {
    ...value,
    outcomes: value.outcomes.map(
      effectiveD20TestNaturalOneRerollSavingThrowOutcome,
    ),
  };
}

function d20TestRollReplacementIsValid(
  replacement: BattleD20TestRollReplacement,
): boolean {
  return attackRollResultIsValid(replacement);
}

function d20TestRollModeMatches(
  replacement: BattleD20TestRollReplacement,
  requiredRollMode: AttackRollMode | undefined,
): boolean {
  return (
    requiredRollMode === undefined || replacement.rollMode === requiredRollMode
  );
}

function d20DieFaceIsValid(face: number): boolean {
  return Number.isInteger(face) && face >= 1 && face <= 20;
}
