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
  BattleD20TestRolledD20s,
  BattleD20TestRolledDieOutcomeReplacement,
  BattleD20TestRolledDieRollReplacement,
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
export const D20_TEST_NATURAL_ONE_REROLL_ROLLED_DICE_MESSAGE =
  "D20 Test rolled d20 facts are outside the d20 protocol.";
export const D20_TEST_NATURAL_ONE_REROLL_ROLLED_DICE_MODE_MESSAGE =
  "D20 Test rolled d20 facts require Advantage or Disadvantage roll mode.";
export const D20_TEST_NATURAL_ONE_REROLL_SELECTED_DIE_MESSAGE =
  "D20 Test rolled d20 selection does not match the selected D20 Test result.";
export const D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE =
  "D20 Test natural-1 rolled-die reroll requires an explicit raw die selection.";
export const D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_MESSAGE =
  "D20 Test natural-1 rolled-die reroll must select a rolled natural 1.";
export const D20_TEST_NATURAL_ONE_REROLL_PROJECTION_MESSAGE =
  "D20 Test natural-1 rolled-die replacement does not match the projected D20 Test result.";
const D20_TEST_NATURAL_ONE_REROLL_OPTION = {
  effectKind: "d20_test_natural_one_reroll",
  label: "D20 Test natural-1 reroll",
} as const satisfies BattleD20TestNaturalOneRerollOption;

type D20TestRollFacts = {
  readonly total?: number | undefined;
  readonly naturalD20: number | undefined;
  readonly rollMode?: AttackRollMode | undefined;
  readonly rolledD20s?: BattleD20TestRolledD20s | undefined;
};

export function d20TestNaturalOneRerollRollDecisionRequired(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly rollMode?: AttackRollMode | undefined;
  readonly rolledD20s?: BattleD20TestRolledD20s | undefined;
  readonly decision: BattleD20TestNaturalOneRerollDecision | undefined;
}): boolean {
  const facts = d20TestRollFacts(input);
  return (
    combatantHasD20TestNaturalOneReroll(input.actor) &&
    d20TestRollFactsIssue(facts) === null &&
    d20TestNaturalOneRerollTriggered(facts) &&
    input.decision === undefined
  );
}

export function d20TestNaturalOneRerollOutcomeDecisionRequired(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly rollMode?: AttackRollMode | undefined;
  readonly rolledD20s?: BattleD20TestRolledD20s | undefined;
  readonly decision: BattleD20TestNaturalOneRerollOutcomeDecision | undefined;
  readonly withoutRoll?: true | undefined;
}): boolean {
  const facts = d20TestRollFacts(input);
  return (
    combatantHasD20TestNaturalOneReroll(input.actor) &&
    input.withoutRoll !== true &&
    d20TestRollFactsIssue(facts) === null &&
    d20TestNaturalOneRerollTriggered(facts) &&
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
>(
  hole: T,
): T & {
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
>(
  hole: T,
): T & {
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
  readonly total?: number | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly rollMode?: AttackRollMode | undefined;
  readonly rolledD20s?: BattleD20TestRolledD20s | undefined;
  readonly decision: BattleD20TestNaturalOneRerollDecision | undefined;
  readonly requiredRollMode?: AttackRollMode | undefined;
  readonly otherD20RerollPresent?: boolean;
}): string | null {
  const decision = input.decision;
  const facts = d20TestRollFacts(input);
  const rawFactsIssue = d20TestRawRolledD20sIssue(facts);
  if (rawFactsIssue !== null) {
    return rawFactsIssue;
  }
  if (!combatantHasD20TestNaturalOneReroll(input.actor)) {
    return decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE;
  }
  const factsIssue = d20TestRollFactsIssue(facts);
  if (factsIssue !== null) {
    return factsIssue;
  }
  if (!d20TestNaturalOneRerollTriggered(facts)) {
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
  if (decision.kind === "rerollRolledDie") {
    return d20TestNaturalOneRerollRolledDieRollIssue({
      facts,
      replacement: decision.replacement,
      requiredRollMode: input.requiredRollMode,
      otherD20RerollPresent: input.otherD20RerollPresent,
    });
  }
  if (input.rolledD20s !== undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE;
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
  readonly rollMode?: AttackRollMode | undefined;
  readonly rolledD20s?: BattleD20TestRolledD20s | undefined;
  readonly decision: BattleD20TestNaturalOneRerollOutcomeDecision | undefined;
  readonly withoutRoll?: true | undefined;
  readonly succeeded?: boolean | undefined;
}): string | null {
  const decision = input.decision;
  if (input.withoutRoll === true) {
    return input.originalNaturalD20 === undefined &&
      input.rolledD20s === undefined &&
      decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_WITHOUT_ROLL_MESSAGE;
  }
  const facts = d20TestRollFacts(input);
  const rawFactsIssue = d20TestRawRolledD20sIssue(facts);
  if (rawFactsIssue !== null) {
    return rawFactsIssue;
  }
  if (!combatantHasD20TestNaturalOneReroll(input.actor)) {
    return decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE;
  }
  const factsIssue = d20TestRollFactsIssue(facts);
  if (factsIssue !== null) {
    return factsIssue;
  }
  if (!d20TestNaturalOneRerollTriggered(facts)) {
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
  if (decision.kind === "rerollRolledDie") {
    return d20TestNaturalOneRerollRolledDieOutcomeIssue({
      facts,
      replacement: decision.replacement,
    });
  }
  if (input.rolledD20s !== undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE;
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
  if (decision?.kind === "rerollRolledDie") {
    const rolledD20s = effectiveRolledD20s(
      attackRoll.rolledD20s,
      attackRoll.rollMode,
      decision.replacement,
    );
    return {
      ...attackRoll,
      total: decision.replacement.result.total,
      naturalD20: decision.replacement.result.naturalD20,
      ...(decision.replacement.result.rollMode === undefined
        ? {}
        : { rollMode: decision.replacement.result.rollMode }),
      ...(rolledD20s === undefined ? {} : { rolledD20s }),
    };
  }
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

export function effectiveD20TestNaturalOneRerollAbilityCheckValue<
  T extends {
    readonly total: number;
    readonly naturalD20?: BattleD20TestRollReplacement["naturalD20"];
    readonly rollMode?: AttackRollMode;
    readonly rolledD20s?: BattleD20TestRolledD20s;
    readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollDecision;
  },
>(value: T, context?: { readonly rollMode?: AttackRollMode | undefined }): T {
  const decision = value.d20TestNaturalOneReroll;
  if (decision?.kind === "rerollRolledDie") {
    const rollMode = value.rollMode ?? context?.rollMode;
    const rolledD20s = effectiveRolledD20s(
      value.rolledD20s,
      rollMode,
      decision.replacement,
    );
    return {
      ...value,
      total: decision.replacement.result.total,
      naturalD20: decision.replacement.result.naturalD20,
      ...(rolledD20s === undefined ? {} : { rolledD20s }),
    };
  }
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
  if (decision?.kind === "rerollRolledDie") {
    const {
      withoutRoll: _withoutRoll,
      rolledD20s: _rolledD20s,
      ...value
    } = fill.value;
    const rolledD20s = effectiveRolledD20s(
      fill.value.rolledD20s,
      undefined,
      decision.replacement,
    );
    return {
      ...fill,
      value: {
        ...value,
        succeeded: decision.replacement.result.succeeded,
        naturalD20: decision.replacement.result.naturalD20,
        ...(rolledD20s === undefined ? {} : { rolledD20s }),
      },
    };
  }
  if (decision?.kind !== "reroll") {
    return fill;
  }
  const {
    withoutRoll: _withoutRoll,
    rolledD20s: _rolledD20s,
    ...value
  } = fill.value;
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
  if (decision?.kind === "rerollRolledDie") {
    const {
      withoutRoll: _withoutRoll,
      rolledD20s: _rolledD20s,
      ...rolledOutcome
    } = outcome;
    const rolledD20s = effectiveRolledD20s(
      outcome.rolledD20s,
      undefined,
      decision.replacement,
    );
    return {
      ...rolledOutcome,
      succeeded: decision.replacement.result.succeeded,
      naturalD20: decision.replacement.result.naturalD20,
      ...(rolledD20s === undefined ? {} : { rolledD20s }),
    };
  }
  if (decision?.kind !== "reroll") {
    return outcome;
  }
  const {
    withoutRoll: _withoutRoll,
    rolledD20s: _rolledD20s,
    ...rolledOutcome
  } = outcome;
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
  return requiredRollMode === undefined
    ? replacement.rollMode === undefined || replacement.rollMode === "normal"
    : replacement.rollMode === requiredRollMode;
}

function d20TestRollFacts(input: {
  readonly total?: number | undefined;
  readonly originalNaturalD20: number | undefined;
  readonly rollMode?: AttackRollMode | undefined;
  readonly rolledD20s?: BattleD20TestRolledD20s | undefined;
}): D20TestRollFacts {
  return {
    total: input.total,
    naturalD20: input.originalNaturalD20,
    rollMode: input.rollMode,
    rolledD20s: input.rolledD20s,
  };
}

function d20TestRollFactsIssue(facts: D20TestRollFacts): string | null {
  if (facts.naturalD20 === undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE;
  }
  return d20TestRawRolledD20sIssue(facts);
}

function d20TestRawRolledD20sIssue(facts: D20TestRollFacts): string | null {
  if (facts.rolledD20s === undefined) {
    return null;
  }
  if (facts.naturalD20 === undefined) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE;
  }
  if (
    !d20DieFaceIsValid(Number(facts.rolledD20s.first)) ||
    !d20DieFaceIsValid(Number(facts.rolledD20s.second))
  ) {
    return D20_TEST_NATURAL_ONE_REROLL_ROLLED_DICE_MESSAGE;
  }
  if (facts.rollMode !== "advantage" && facts.rollMode !== "disadvantage") {
    return D20_TEST_NATURAL_ONE_REROLL_ROLLED_DICE_MODE_MESSAGE;
  }
  const selected = selectedRolledD20Face(facts.rolledD20s);
  if (selected !== facts.naturalD20) {
    return D20_TEST_NATURAL_ONE_REROLL_SELECTED_DIE_MESSAGE;
  }
  const expectedSelected = selectedNaturalD20ForRollMode(
    facts.rolledD20s,
    facts.rollMode,
  );
  return selected === expectedSelected
    ? null
    : D20_TEST_NATURAL_ONE_REROLL_SELECTED_DIE_MESSAGE;
}

function d20TestNaturalOneRerollTriggered(facts: D20TestRollFacts): boolean {
  return facts.rolledD20s === undefined
    ? facts.naturalD20 === 1
    : Number(facts.rolledD20s.first) === 1 ||
        Number(facts.rolledD20s.second) === 1;
}

function d20TestNaturalOneRerollRolledDieRollIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement: BattleD20TestRolledDieRollReplacement;
  readonly requiredRollMode?: AttackRollMode | undefined;
  readonly otherD20RerollPresent?: boolean | undefined;
}): string | null {
  if (input.otherD20RerollPresent === true) {
    return D20_TEST_NATURAL_ONE_REROLL_STACKING_MESSAGE;
  }
  if (!d20TestRollReplacementIsValid(input.replacement.result)) {
    return D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE;
  }
  if (!d20DieFaceIsValid(Number(input.replacement.naturalD20))) {
    return D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE;
  }
  const requiredRollMode = input.requiredRollMode ?? input.facts.rollMode;
  if (!d20TestRollModeMatches(input.replacement.result, requiredRollMode)) {
    return D20_TEST_NATURAL_ONE_REROLL_MODE_MESSAGE;
  }
  return d20TestRolledDieProjectionIssue({
    facts: input.facts,
    replacement: input.replacement,
    projectedNaturalD20: Number(input.replacement.result.naturalD20),
    projectedTotal: input.replacement.result.total,
  });
}

function d20TestNaturalOneRerollRolledDieOutcomeIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement: BattleD20TestRolledDieOutcomeReplacement;
}): string | null {
  if (!d20DieFaceIsValid(Number(input.replacement.naturalD20))) {
    return D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE;
  }
  if (!d20DieFaceIsValid(Number(input.replacement.result.naturalD20))) {
    return D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE;
  }
  return d20TestRolledDieProjectionIssue({
    facts: input.facts,
    replacement: input.replacement,
    projectedNaturalD20: Number(input.replacement.result.naturalD20),
  });
}

function d20TestRolledDieProjectionIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement:
    | BattleD20TestRolledDieRollReplacement
    | BattleD20TestRolledDieOutcomeReplacement;
  readonly projectedNaturalD20: number;
  readonly projectedTotal?: number | undefined;
}): string | null {
  if (
    input.facts.rolledD20s === undefined ||
    (input.facts.rollMode !== "advantage" &&
      input.facts.rollMode !== "disadvantage")
  ) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE;
  }
  if (rolledD20Face(input.facts.rolledD20s, input.replacement.die) !== 1) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_MESSAGE;
  }
  const replaced = replaceRolledD20(input.facts.rolledD20s, input.replacement);
  const projectedNaturalD20 = selectedNaturalD20ForRollMode(
    replaced,
    input.facts.rollMode,
  );
  if (input.projectedNaturalD20 !== projectedNaturalD20) {
    return D20_TEST_NATURAL_ONE_REROLL_PROJECTION_MESSAGE;
  }
  if (
    input.projectedTotal !== undefined &&
    input.facts.total !== undefined &&
    input.facts.naturalD20 !== undefined &&
    input.projectedTotal !==
      input.facts.total - input.facts.naturalD20 + projectedNaturalD20
  ) {
    return D20_TEST_NATURAL_ONE_REROLL_PROJECTION_MESSAGE;
  }
  return null;
}

function selectedRolledD20Face(rolledD20s: BattleD20TestRolledD20s): number {
  return rolledD20Face(rolledD20s, rolledD20s.selected);
}

function rolledD20Face(
  rolledD20s: BattleD20TestRolledD20s,
  die: BattleD20TestRolledD20s["selected"],
): number {
  return Number(rolledD20s[die]);
}

function replaceRolledD20(
  rolledD20s: BattleD20TestRolledD20s,
  replacement:
    | BattleD20TestRolledDieRollReplacement
    | BattleD20TestRolledDieOutcomeReplacement,
): BattleD20TestRolledD20s {
  return {
    ...rolledD20s,
    [replacement.die]: replacement.naturalD20,
  };
}

function selectedNaturalD20ForRollMode(
  rolledD20s: BattleD20TestRolledD20s,
  rollMode: Extract<AttackRollMode, "advantage" | "disadvantage">,
): number {
  const first = Number(rolledD20s.first);
  const second = Number(rolledD20s.second);
  return rollMode === "advantage"
    ? Math.max(first, second)
    : Math.min(first, second);
}

function effectiveRolledD20s(
  rolledD20s: BattleD20TestRolledD20s | undefined,
  rollMode: AttackRollMode | undefined,
  replacement:
    | BattleD20TestRolledDieRollReplacement
    | BattleD20TestRolledDieOutcomeReplacement,
): BattleD20TestRolledD20s | undefined {
  if (
    rolledD20s === undefined ||
    (rollMode !== "advantage" && rollMode !== "disadvantage")
  ) {
    return undefined;
  }
  const replaced = replaceRolledD20(rolledD20s, replacement);
  const projectedNaturalD20 = Number(replacement.result.naturalD20);
  return {
    ...replaced,
    selected: selectedRolledDieForProjectedNaturalD20(
      replaced,
      replacement.die,
      projectedNaturalD20,
    ),
  };
}

function selectedRolledDieForProjectedNaturalD20(
  rolledD20s: BattleD20TestRolledD20s,
  preferred: BattleD20TestRolledD20s["selected"],
  projectedNaturalD20: number,
): BattleD20TestRolledD20s["selected"] {
  if (rolledD20Face(rolledD20s, preferred) === projectedNaturalD20) {
    return preferred;
  }
  return preferred === "first" ? "second" : "first";
}

function d20DieFaceIsValid(face: number): boolean {
  return Number.isInteger(face) && face >= 1 && face <= 20;
}
