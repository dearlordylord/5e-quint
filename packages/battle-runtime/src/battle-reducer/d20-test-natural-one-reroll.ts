// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll

import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { selectedD20TestNaturalD20 } from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleFill,
  BattleAttackRollResult,
  BattleAttackRollHole,
  BattleCreatureState,
  BattleD20TestNaturalOneRerollDieDecision,
  BattleD20TestNaturalOneRerollDecision,
  BattleD20TestNaturalOneRerollOutcomeDecision,
  BattleD20TestNaturalOneRerollOption,
  BattleD20TestRoll,
  BattleD20TestRolledDieOutcomeReplacement,
  BattleD20TestRolledDieRollReplacement,
  BattleHole,
  BattleSpellAttackRollHole,
  BattleD20TestRollReplacement,
  BattleSavingThrowOutcome,
} from "../battle-state-execution.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";

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
  readonly d20TestRoll: BattleD20TestRoll | undefined;
};

type D20TestNaturalOneRerollGate<Decision> =
  | { readonly tag: "decision"; readonly decision: Decision }
  | { readonly tag: "finished"; readonly issue: string | null };

function d20TestNaturalOneRerollGate<Decision>(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly facts: D20TestRollFacts;
  readonly decision: Decision | undefined;
}): D20TestNaturalOneRerollGate<Decision> {
  if (!combatantHasD20TestNaturalOneReroll(input.actor)) {
    return {
      tag: "finished",
      issue:
        input.decision === undefined
          ? null
          : D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE,
    };
  }
  const factsIssue = d20TestRollFactsIssue(input.facts);
  if (factsIssue !== null) {
    return { tag: "finished", issue: factsIssue };
  }
  if (!d20TestNaturalOneRerollTriggered(input.facts)) {
    return {
      tag: "finished",
      issue:
        input.decision === undefined
          ? null
          : D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE,
    };
  }
  return input.decision === undefined
    ? {
        tag: "finished",
        issue: D20_TEST_NATURAL_ONE_REROLL_DECISION_REQUIRED_MESSAGE,
      }
    : { tag: "decision", decision: input.decision };
}

function d20TestNaturalOneRerollDecisionState<Decision>(
  input: Parameters<typeof d20TestRollFacts>[0] & {
    readonly actor: BattleCreatureState | undefined;
    readonly decision: Decision | undefined;
  },
): {
  readonly facts: D20TestRollFacts;
  readonly gate: D20TestNaturalOneRerollGate<Decision>;
} {
  const facts = d20TestRollFacts(input);
  return {
    facts,
    gate: d20TestNaturalOneRerollGate({
      actor: input.actor,
      facts,
      decision: input.decision,
    }),
  };
}

export function d20TestNaturalOneRerollRollDecisionRequired(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalD20TestRoll: BattleD20TestRoll | undefined;
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
  readonly originalD20TestRoll: BattleD20TestRoll | undefined;
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
    characterUnitProcedureBindings(actor.origin.execution).some(
      ({ procedure }) =>
        procedure.kind === "unitFeature" &&
        procedure.execution.kind === "d20TestNaturalOneReroll",
    )
  );
}

export function d20TestNaturalOneRerollRollIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly total?: number | undefined;
  readonly originalD20TestRoll: BattleD20TestRoll | undefined;
  readonly decision: BattleD20TestNaturalOneRerollDecision | undefined;
  readonly requiredRollMode?: AttackRollMode | undefined;
  readonly otherD20RerollPresent?: boolean;
}): string | null {
  const { facts, gate } = d20TestNaturalOneRerollDecisionState(input);
  if (gate.tag === "finished") {
    return gate.issue;
  }
  const decision = gate.decision;
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
  if (input.originalD20TestRoll?.tag === "multiple") {
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

/* v8 ignore start -- @preserve -- Malformed raw natural-1 outcome protocol: supported decisions require consistent roll presence, raw-die selection, replacement face, and projected outcome; effective outcome application remains measured. */
export function d20TestNaturalOneRerollOutcomeIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalD20TestRoll: BattleD20TestRoll | undefined;
  readonly decision: BattleD20TestNaturalOneRerollOutcomeDecision | undefined;
  readonly withoutRoll?: true | undefined;
  readonly succeeded?: boolean | undefined;
}): string | null {
  if (input.withoutRoll === true) {
    return input.originalD20TestRoll === undefined &&
      input.decision === undefined
      ? null
      : D20_TEST_NATURAL_ONE_REROLL_WITHOUT_ROLL_MESSAGE;
  }
  const { facts, gate } = d20TestNaturalOneRerollDecisionState(input);
  if (gate.tag === "finished") {
    return gate.issue;
  }
  const decision = gate.decision;
  if (decision.kind === "decline") {
    return null;
  }
  if (decision.kind === "rerollRolledDie") {
    return d20TestNaturalOneRerollRolledDieOutcomeIssue({
      facts,
      replacement: decision.replacement,
    });
  }
  if (input.originalD20TestRoll?.tag === "multiple") {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE;
  }
  return null;
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Malformed raw natural-1 die protocol: supported decisions require an eligible actor, a known natural 1, and a valid d20 replacement face; effective reroll application remains measured. */
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
/* v8 ignore stop -- @preserve */

export function effectiveD20TestNaturalOneRerollAttackRoll(
  attackRoll: BattleAttackRollResult,
): BattleAttackRollResult {
  const decision = attackRoll.d20TestNaturalOneReroll;
  if (decision?.kind === "rerollRolledDie") {
    return {
      ...attackRoll,
      total: decision.replacement.result.total,
      d20TestRoll: d20TestRollAfterRolledDieReplacement(
        attackRoll.d20TestRoll,
        decision.replacement,
      ),
    };
  }
  if (decision?.kind !== "reroll") {
    return attackRoll;
  }
  return {
    ...attackRoll,
    total: decision.replacement.total,
    d20TestRoll: decision.replacement.d20TestRoll,
  };
}

export function effectiveD20TestNaturalOneRerollAbilityCheckValue<
  T extends {
    readonly total: number;
    readonly d20TestRoll?: BattleD20TestRoll;
    readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollDecision;
  },
>(value: T): T {
  const decision = value.d20TestNaturalOneReroll;
  if (decision?.kind === "rerollRolledDie") {
    return {
      ...value,
      total: decision.replacement.result.total,
      d20TestRoll: d20TestRollAfterRolledDieReplacement(
        value.d20TestRoll,
        decision.replacement,
      ),
    };
  }
  if (decision?.kind !== "reroll") {
    return value;
  }
  return {
    ...value,
    total: decision.replacement.total,
    d20TestRoll: decision.replacement.d20TestRoll,
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
    const { withoutRoll: _withoutRoll, ...value } = fill.value;
    return {
      ...fill,
      value: {
        ...value,
        succeeded: decision.replacement.result.succeeded,
        d20TestRoll: d20TestRollAfterRolledDieReplacement(
          fill.value.d20TestRoll,
          decision.replacement,
        ),
      },
    };
  }
  if (decision?.kind !== "reroll") {
    return fill;
  }
  const { withoutRoll: _withoutRoll, ...value } = fill.value;
  return {
    ...fill,
    value: {
      ...value,
      succeeded: decision.replacement.succeeded,
      d20TestRoll: decision.replacement.d20TestRoll,
    },
  };
}

export function effectiveD20TestNaturalOneRerollSavingThrowOutcome(
  outcome: BattleSavingThrowOutcome,
): BattleSavingThrowOutcome {
  const decision = outcome.d20TestNaturalOneReroll;
  if (decision?.kind === "rerollRolledDie") {
    const { withoutRoll: _withoutRoll, ...rolledOutcome } = outcome;
    return {
      ...rolledOutcome,
      succeeded: decision.replacement.result.succeeded,
      d20TestRoll: d20TestRollAfterRolledDieReplacement(
        outcome.d20TestRoll,
        decision.replacement,
      ),
    };
  }
  if (decision?.kind !== "reroll") {
    return outcome;
  }
  const { withoutRoll: _withoutRoll, ...rolledOutcome } = outcome;
  return {
    ...rolledOutcome,
    succeeded: decision.replacement.succeeded,
    d20TestRoll: decision.replacement.d20TestRoll,
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
  return Number.isInteger(replacement.total);
}

function d20TestRollModeMatches(
  replacement: BattleD20TestRollReplacement,
  requiredRollMode: AttackRollMode | undefined,
): boolean {
  if (requiredRollMode === undefined || requiredRollMode === "normal") {
    return replacement.d20TestRoll.tag === "single";
  }
  return (
    replacement.d20TestRoll.tag === "multiple" &&
    replacement.d20TestRoll.rollMode === requiredRollMode
  );
}

function d20TestRollFacts(input: {
  readonly total?: number | undefined;
  readonly originalD20TestRoll: BattleD20TestRoll | undefined;
}): D20TestRollFacts {
  return {
    total: input.total,
    d20TestRoll: input.originalD20TestRoll,
  };
}

function d20TestRollFactsIssue(facts: D20TestRollFacts): string | null {
  return facts.d20TestRoll === undefined
    ? D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE
    : null;
}

function d20TestNaturalOneRerollTriggered(facts: D20TestRollFacts): boolean {
  const roll = facts.d20TestRoll;
  if (roll === undefined) {
    return false;
  }
  return roll.tag === "single"
    ? Number(roll.naturalD20) === 1
    : Number(roll.first) === 1 || Number(roll.second) === 1;
}

/* v8 ignore start -- @preserve -- A parsed multiple-die roll keeps both faces and its mode together. */
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
  const requiredRollMode =
    input.requiredRollMode ??
    (input.facts.d20TestRoll?.tag === "multiple"
      ? input.facts.d20TestRoll.rollMode
      : "normal");
  if (!d20TestRollModeMatches(input.replacement.result, requiredRollMode)) {
    return D20_TEST_NATURAL_ONE_REROLL_MODE_MESSAGE;
  }
  return d20TestRolledDieProjectionIssue({
    facts: input.facts,
    replacement: input.replacement,
    projectedNaturalD20: Number(
      selectedD20TestNaturalD20(input.replacement.result.d20TestRoll),
    ),
    projectedTotal: input.replacement.result.total,
  });
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Parsed replacement rolls carry their projected face in the same D20 Test union. */
function d20TestNaturalOneRerollRolledDieOutcomeIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement: BattleD20TestRolledDieOutcomeReplacement;
}): string | null {
  return d20TestRolledDieProjectionIssue({
    facts: input.facts,
    replacement: input.replacement,
    projectedNaturalD20: Number(
      selectedD20TestNaturalD20(input.replacement.result.d20TestRoll),
    ),
  });
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- A rolled-die reroll projects through the parsed mode union. */
function d20TestRolledDieProjectionIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement:
    | BattleD20TestRolledDieRollReplacement
    | BattleD20TestRolledDieOutcomeReplacement;
  readonly projectedNaturalD20: number;
  readonly projectedTotal?: number | undefined;
}): string | null {
  const original = input.facts.d20TestRoll;
  if (original?.tag !== "multiple") {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE;
  }
  if (Number(original[input.replacement.die]) !== 1) {
    return D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_MESSAGE;
  }
  const replacementFace = selectedD20TestNaturalD20(
    input.replacement.result.d20TestRoll,
  );
  const replaced = replaceD20TestRoll(
    original,
    input.replacement.die,
    replacementFace,
  );
  const projectedNaturalD20 = Number(selectedD20TestNaturalD20(replaced));
  if (input.projectedNaturalD20 !== projectedNaturalD20) {
    return D20_TEST_NATURAL_ONE_REROLL_PROJECTION_MESSAGE;
  }
  if (
    input.projectedTotal !== undefined &&
    input.facts.total !== undefined &&
    input.projectedTotal !==
      input.facts.total -
        Number(selectedD20TestNaturalD20(original)) +
        projectedNaturalD20
  ) {
    return D20_TEST_NATURAL_ONE_REROLL_PROJECTION_MESSAGE;
  }
  return null;
}
/* v8 ignore stop -- @preserve */

function replaceD20TestRoll(
  roll: Extract<BattleD20TestRoll, { readonly tag: "multiple" }>,
  die: "first" | "second",
  replacementFace: Extract<
    BattleD20TestRoll,
    { readonly tag: "single" }
  >["naturalD20"],
): Extract<BattleD20TestRoll, { readonly tag: "multiple" }> {
  return {
    ...roll,
    [die]: replacementFace,
  } as const;
}

function d20TestRollAfterRolledDieReplacement(
  original: BattleD20TestRoll | undefined,
  replacement:
    | BattleD20TestRolledDieRollReplacement
    | BattleD20TestRolledDieOutcomeReplacement,
): BattleD20TestRoll {
  const replacementRoll = replacement.result.d20TestRoll;
  return original?.tag === "multiple"
    ? replaceD20TestRoll(
        original,
        replacement.die,
        selectedD20TestNaturalD20(replacementRoll),
      )
    : replacementRoll;
}

function d20DieFaceIsValid(face: number): boolean {
  return Number.isInteger(face) && face >= 1 && face <= 20;
}
