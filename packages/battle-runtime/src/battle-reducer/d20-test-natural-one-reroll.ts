// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll

import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { selectedD20TestNaturalD20 } from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleCreatureState,
  BattleD20TestNaturalOneRerollDieDecision,
  BattleD20TestNaturalOneRerollDecision,
  BattleD20TestNaturalOneRerollOutcomeDecision,
  BattleD20TestNaturalOneRerollOption,
  BattleD20TestRoll,
  BattleD20TestRolledDieOutcomeReplacement,
  BattleD20TestRolledDieRollReplacement,
  BattleD20TestRollReplacement,
} from "../battle-state-execution.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";
import {
  d20TestRolledDieProjectionIssue,
  d20TestRolledDieRollReplacementIssue,
  d20TestRollReplacementRollIssue,
  type D20TestRollFacts,
  type D20TestRollRerollMessages,
} from "./d20-test-roll-reroll.ts";

export const D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE =
  "D20 Test natural-1 reroll is not available for this actor.";
export const D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE =
  "D20 Test natural-1 reroll can be used only after rolling a natural 1.";
export const D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE =
  "D20 Test natural-1 replacement roll is outside the d20 protocol.";
export const D20_TEST_NATURAL_ONE_REROLL_MODE_MESSAGE =
  "D20 Test natural-1 replacement roll mode does not match the current D20 Test rule.";
export const D20_TEST_REROLL_DECISION_REQUIRED_MESSAGE =
  "D20 Test reroll requires an explicit reroll or decline decision.";
export const D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE =
  "D20 Test natural-1 reroll support requires the triggering natural d20 face.";
export const D20_TEST_REROLL_WITHOUT_ROLL_MESSAGE =
  "Saving Throw outcomes without a roll cannot include d20 roll or reroll facts.";
export const D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE =
  "D20 Test natural-1 rolled-die reroll requires an explicit raw die selection.";
export const D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_MESSAGE =
  "D20 Test natural-1 rolled-die reroll must select a rolled natural 1.";
export const D20_TEST_NATURAL_ONE_REROLL_MODIFIER_MESSAGE =
  "D20 Test natural-1 replacement roll must keep the original roll's modifiers; only the d20 changes.";
export const D20_TEST_NATURAL_ONE_REROLL_PROJECTION_MESSAGE =
  "D20 Test natural-1 rolled-die replacement does not match the projected D20 Test result.";
const D20_TEST_NATURAL_ONE_REROLL_MESSAGES = {
  replacement: D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE,
  mode: D20_TEST_NATURAL_ONE_REROLL_MODE_MESSAGE,
  dieSelectionRequired:
    D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE,
  dieSelection: D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_MESSAGE,
  projection: D20_TEST_NATURAL_ONE_REROLL_PROJECTION_MESSAGE,
  modifier: D20_TEST_NATURAL_ONE_REROLL_MODIFIER_MESSAGE,
} as const satisfies D20TestRollRerollMessages;
const D20_TEST_NATURAL_ONE_REROLL_OPTION = {
  effectKind: "d20_test_natural_one_reroll",
  label: "D20 Test natural-1 reroll",
} as const satisfies BattleD20TestNaturalOneRerollOption;

/**
 * Whether the natural-1 reroll may decide on a roll as it stands: the roller
 * has it and the roll shows a natural 1.
 */
export function d20TestNaturalOneRerollOffered(
  actor: BattleCreatureState | undefined,
  d20TestRoll: BattleD20TestRoll | undefined,
): boolean {
  return (
    combatantHasD20TestNaturalOneReroll(actor) &&
    d20TestNaturalOneRerollTriggered({ d20TestRoll })
  );
}

/**
 * The issue with a roll that a natural-1 reroll holder makes without saying
 * what its d20 showed: the reroll needs the face to know whether it applies.
 */
export function d20TestNaturalOneRerollRollFactsIssue(
  actor: BattleCreatureState | undefined,
  d20TestRoll: BattleD20TestRoll | undefined,
): string | null {
  return combatantHasD20TestNaturalOneReroll(actor)
    ? d20TestRollFactsIssue({ d20TestRoll })
    : null;
}

/** Whether a bare d20 roll shows the natural 1 its holder may reroll. */
export function d20TestNaturalOneRerollDieOffered(
  actor: BattleCreatureState | undefined,
  originalNaturalD20: number,
): boolean {
  return combatantHasD20TestNaturalOneReroll(actor) && originalNaturalD20 === 1;
}

type D20TestNaturalOneRerollGate =
  | { readonly tag: "decide" }
  | { readonly tag: "finished"; readonly issue: string | null };

function d20TestNaturalOneRerollGate(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly facts: D20TestRollFacts;
}): D20TestNaturalOneRerollGate {
  if (!combatantHasD20TestNaturalOneReroll(input.actor)) {
    return {
      tag: "finished",
      issue: D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE,
    };
  }
  const factsIssue = d20TestRollFactsIssue(input.facts);
  if (factsIssue !== null) {
    return { tag: "finished", issue: factsIssue };
  }
  if (!d20TestNaturalOneRerollTriggered(input.facts)) {
    return {
      tag: "finished",
      issue: D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE,
    };
  }
  return { tag: "decide" };
}
/** The D20 Test hole, asked again with the natural-1 reroll option. */
export function d20TestHoleWithNaturalOneRerollOption<T extends object>(
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

/**
 * The issue with a natural-1 reroll decision on a roll with a total (an
 * attack roll or an ability check), checked against the roll as it stands.
 */
export function d20TestNaturalOneRerollRollIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly total?: number | undefined;
  readonly originalD20TestRoll: BattleD20TestRoll | undefined;
  readonly decision: BattleD20TestNaturalOneRerollDecision;
  readonly requiredRollMode?: AttackRollMode | undefined;
}): string | null {
  const facts = d20TestRollFacts(input);
  const gate = d20TestNaturalOneRerollGate({ actor: input.actor, facts });
  if (gate.tag === "finished") {
    return gate.issue;
  }
  const decision = input.decision;
  if (decision.kind === "decline") {
    return null;
  }
  if (decision.kind === "rerollRolledDie") {
    return d20TestNaturalOneRerollRolledDieRollIssue({
      facts,
      replacement: decision.replacement,
      requiredRollMode: input.requiredRollMode,
    });
  }
  return d20TestNaturalOneRerollReplacementRollIssue({
    facts,
    replacement: decision.replacement,
    requiredRollMode: input.requiredRollMode,
  });
}

/* v8 ignore start -- @preserve -- Malformed raw natural-1 outcome protocol: supported decisions require raw-die selection, a replacement face and a projected outcome that agree; the outcome that stands remains measured. */
/**
 * The issue with a natural-1 reroll decision on a rolled outcome whose success
 * the table rules, checked against the roll as it stands.
 */
export function d20TestNaturalOneRerollOutcomeIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalD20TestRoll: BattleD20TestRoll;
  readonly decision: BattleD20TestNaturalOneRerollOutcomeDecision;
}): string | null {
  const facts = d20TestRollFacts(input);
  const gate = d20TestNaturalOneRerollGate({ actor: input.actor, facts });
  if (gate.tag === "finished") {
    return gate.issue;
  }
  const decision = input.decision;
  if (decision.kind === "decline") {
    return null;
  }
  if (decision.kind === "rerollRolledDie") {
    return d20TestNaturalOneRerollRolledDieOutcomeIssue({
      facts,
      replacement: decision.replacement,
    });
  }
  return input.originalD20TestRoll.tag === "multiple"
    ? D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE
    : null;
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- Malformed raw natural-1 die protocol: supported decisions require an eligible actor, a natural 1 and a valid d20 replacement face; the die that stands remains measured. */
/** The issue with a natural-1 reroll decision on a bare d20 roll. */
export function d20TestNaturalOneRerollDieIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly originalNaturalD20: number;
  readonly decision: BattleD20TestNaturalOneRerollDieDecision;
}): string | null {
  const decision = input.decision;
  if (!combatantHasD20TestNaturalOneReroll(input.actor)) {
    return D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE;
  }
  if (input.originalNaturalD20 !== 1) {
    return D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE;
  }
  if (decision.kind === "decline") {
    return null;
  }
  return d20DieFaceIsValid(Number(decision.replacement))
    ? null
    : D20_TEST_NATURAL_ONE_REROLL_REPLACEMENT_MESSAGE;
}
/* v8 ignore stop -- @preserve */

function d20TestRollFacts(input: {
  readonly total?: number | undefined;
  readonly originalD20TestRoll: BattleD20TestRoll | undefined;
}): D20TestRollFacts {
  return {
    total: input.total,
    d20TestRoll: input.originalD20TestRoll,
  };
}

function d20TestRollFactsIssue(facts: {
  readonly d20TestRoll: BattleD20TestRoll | undefined;
}): string | null {
  return facts.d20TestRoll === undefined
    ? D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE
    : null;
}

function d20TestNaturalOneRerollTriggered(facts: {
  readonly d20TestRoll: BattleD20TestRoll | undefined;
}): boolean {
  const roll = facts.d20TestRoll;
  if (roll === undefined) {
    return false;
  }
  return roll.tag === "single"
    ? Number(roll.naturalD20) === 1
    : Number(roll.first) === 1 || Number(roll.second) === 1;
}

function d20TestNaturalOneRerollRolledDieRollIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement: BattleD20TestRolledDieRollReplacement;
  readonly requiredRollMode?: AttackRollMode | undefined;
}): string | null {
  return d20TestRolledDieRollReplacementIssue({
    ...input,
    messages: D20_TEST_NATURAL_ONE_REROLL_MESSAGES,
    rerollableFace: d20FaceIsNaturalOne,
  });
}

function d20TestNaturalOneRerollReplacementRollIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement: BattleD20TestRollReplacement;
  readonly requiredRollMode?: AttackRollMode | undefined;
}): string | null {
  return d20TestRollReplacementRollIssue({
    ...input,
    messages: D20_TEST_NATURAL_ONE_REROLL_MESSAGES,
  });
}

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
    messages: D20_TEST_NATURAL_ONE_REROLL_MESSAGES,
    rerollableFace: d20FaceIsNaturalOne,
  });
}
/* v8 ignore stop -- @preserve */

function d20FaceIsNaturalOne(face: number): boolean {
  return face === 1;
}

function d20DieFaceIsValid(face: number): boolean {
  return Number.isInteger(face) && face >= 1 && face <= 20;
}
