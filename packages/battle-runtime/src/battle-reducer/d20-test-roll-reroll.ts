// Replacement checks shared by every D20 Test reroll source: the natural-1
// reroll and Heroic Inspiration. Each source supplies its own messages and
// which rolled faces it may replace.

import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { selectedD20TestNaturalD20 } from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleAttackRollResult,
  BattleD20TestRoll,
  BattleD20TestRollReplacement,
  BattleD20TestRollRerollDecision,
  BattleD20TestRolledDieOutcomeReplacement,
  BattleD20TestRolledDieRollReplacement,
} from "../battle-state-execution.ts";

/** The issue messages one D20 Test reroll source reports. */
export type D20TestRollRerollMessages = {
  readonly replacement: string;
  readonly mode: string;
  readonly dieSelectionRequired: string;
  readonly dieSelection: string;
  readonly projection: string;
  readonly modifier: string;
};

export type D20TestRollFacts = {
  readonly total?: number | undefined;
  readonly d20TestRoll: BattleD20TestRoll | undefined;
};

/** Whether a source may replace a rolled d20 showing `face`. */
export type D20TestRerollableFace = (face: number) => boolean;

/* v8 ignore start -- @preserve -- Malformed single-roll reroll protocol: the admitted roll cannot change its die shape, or violate replacement/mode validation. */
export function d20TestRollReplacementRollIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement: BattleD20TestRollReplacement;
  readonly requiredRollMode?: AttackRollMode | undefined;
  readonly messages: D20TestRollRerollMessages;
}): string | null {
  if (input.facts.d20TestRoll?.tag === "multiple") {
    return input.messages.dieSelectionRequired;
  }
  if (!d20TestRollReplacementIsValid(input.replacement)) {
    return input.messages.replacement;
  }
  if (!d20TestRollModeMatches(input.replacement, input.requiredRollMode)) {
    return input.messages.mode;
  }
  return d20TestRollReplacementKeepsModifier(input.facts, input.replacement)
    ? null
    : input.messages.modifier;
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- A parsed multiple-die roll keeps both faces and its mode together. */
export function d20TestRolledDieRollReplacementIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement: BattleD20TestRolledDieRollReplacement;
  readonly requiredRollMode?: AttackRollMode | undefined;
  readonly messages: D20TestRollRerollMessages;
  readonly rerollableFace: D20TestRerollableFace;
}): string | null {
  if (!d20TestRollReplacementIsValid(input.replacement.result)) {
    return input.messages.replacement;
  }
  const requiredRollMode =
    input.requiredRollMode ??
    (input.facts.d20TestRoll?.tag === "multiple"
      ? input.facts.d20TestRoll.rollMode
      : "normal");
  if (!d20TestRollModeMatches(input.replacement.result, requiredRollMode)) {
    return input.messages.mode;
  }
  return d20TestRolledDieProjectionIssue({
    facts: input.facts,
    replacement: input.replacement,
    projectedNaturalD20: Number(
      selectedD20TestNaturalD20(input.replacement.result.d20TestRoll),
    ),
    projectedTotal: input.replacement.result.total,
    messages: input.messages,
    rerollableFace: input.rerollableFace,
  });
}
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- A rolled-die reroll projects through the parsed mode union. */
export function d20TestRolledDieProjectionIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement:
    | BattleD20TestRolledDieRollReplacement
    | BattleD20TestRolledDieOutcomeReplacement;
  readonly projectedNaturalD20: number;
  readonly projectedTotal?: number | undefined;
  readonly messages: D20TestRollRerollMessages;
  readonly rerollableFace: D20TestRerollableFace;
}): string | null {
  const original = input.facts.d20TestRoll;
  if (original?.tag !== "multiple") {
    return input.messages.dieSelectionRequired;
  }
  if (!input.rerollableFace(Number(original[input.replacement.die]))) {
    return input.messages.dieSelection;
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
    return input.messages.projection;
  }
  if (
    input.projectedTotal !== undefined &&
    input.facts.total !== undefined &&
    input.projectedTotal !==
      input.facts.total -
        Number(selectedD20TestNaturalD20(original)) +
        projectedNaturalD20
  ) {
    return input.messages.projection;
  }
  return null;
}
/* v8 ignore stop -- @preserve */

/** The attack roll after a source's reroll decision, or unchanged without one. */
export function attackRollAfterD20TestRollReroll(
  attackRoll: BattleAttackRollResult,
  decision: BattleD20TestRollRerollDecision<string> | undefined,
): BattleAttackRollResult {
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

export function d20TestRollAfterRolledDieReplacement(
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

/**
 * A reroll replaces only the die: the replacement total keeps everything the
 * original total added to its d20. Without a known original total there is
 * nothing to compare.
 */
function d20TestRollReplacementKeepsModifier(
  facts: D20TestRollFacts,
  replacement: BattleD20TestRollReplacement,
): boolean {
  if (facts.total === undefined || facts.d20TestRoll === undefined) {
    return true;
  }
  return (
    replacement.total -
      Number(selectedD20TestNaturalD20(replacement.d20TestRoll)) ===
    facts.total - Number(selectedD20TestNaturalD20(facts.d20TestRoll))
  );
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
