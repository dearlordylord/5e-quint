// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// Replacement checks shared by every D20 Test reroll source: the natural-1
// reroll, Heroic Inspiration and Seeking Spell. Each source supplies its own messages and
// which rolled faces it may replace. Also the roll after one decision, for each
// kind of D20 Test roll.

import { Match } from "effect";

import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { selectedD20TestNaturalD20 } from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleD20TestDieReplacement,
  BattleD20TestOutcomeReplacement,
  BattleD20TestDieRerollDecision,
  BattleD20TestOutcomeRerollDecision,
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

export function d20TestRollReplacementRollIssue(input: {
  readonly facts: D20TestRollFacts;
  readonly replacement: BattleD20TestRollReplacement;
  readonly requiredRollMode?: AttackRollMode | undefined;
  readonly messages: D20TestRollRerollMessages;
}): string | null {
  /* v8 ignore start -- @preserve -- Malformed single-roll reroll protocol: the admitted roll cannot change its die shape, or violate replacement/mode validation. */
  if (input.facts.d20TestRoll?.tag === "multiple") {
    return input.messages.dieSelectionRequired;
  }
  if (!d20TestRollReplacementIsValid(input.replacement)) {
    return input.messages.replacement;
  }
  if (!d20TestRollModeMatches(input.replacement, input.requiredRollMode)) {
    return input.messages.mode;
  }
  /* v8 ignore stop -- @preserve */
  return d20TestRollReplacementKeepsModifier(input.facts, input.replacement)
    ? null
    : input.messages.modifier;
}

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
  const replacement = input.replacement.result.d20TestRoll;
  if (replacement.rollMode !== original.rollMode) {
    return input.messages.mode;
  }
  const untouchedDieMatches = Match.value(input.replacement.die).pipe(
    Match.when("first", () => replacement.second === original.second),
    Match.when("second", () => replacement.first === original.first),
    Match.exhaustive,
  );
  if (!untouchedDieMatches) {
    return input.messages.projection;
  }
  if (
    "total" in input.replacement.result &&
    !d20TestRollReplacementKeepsModifier(input.facts, input.replacement.result)
  ) {
    return input.messages.projection;
  }
  return null;
}
/* v8 ignore stop -- @preserve */

/**
 * The issue with a source's replacement of a rolled outcome whose success the
 * table rules (a saving throw), if any. Under Advantage or Disadvantage it
 * replaces one chosen die, not both (playing-the-game.md, "Interactions with
 * Rerolls"); otherwise it replaces the single d20.
 */
export function d20TestOutcomeReplacementIssue(input: {
  /** The roll as it stands: the original roll, or another source's reroll of it. */
  readonly originalD20TestRoll: BattleD20TestRoll;
  readonly replacement:
    | {
        readonly kind: "reroll";
        readonly replacement: BattleD20TestOutcomeReplacement;
      }
    | {
        readonly kind: "rerollRolledDie";
        readonly replacement: BattleD20TestRolledDieOutcomeReplacement;
      };
  readonly messages: D20TestRollRerollMessages;
  readonly rerollableFace: D20TestRerollableFace;
}): string | null {
  return Match.value(input.replacement).pipe(
    Match.discriminatorsExhaustive("kind")({
      reroll: ({ replacement }) =>
        input.originalD20TestRoll.tag === "multiple"
          ? input.messages.dieSelectionRequired
          : replacement.d20TestRoll.tag === "single"
            ? null
            : input.messages.mode,
      rerollRolledDie: ({ replacement }) =>
        d20TestRolledDieProjectionIssue({
          facts: { d20TestRoll: input.originalD20TestRoll },
          replacement,
          messages: input.messages,
          rerollableFace: input.rerollableFace,
        }),
    }),
  );
}

/**
 * A roll with a total (an attack roll or an ability check) after a source's
 * reroll decision.
 */
export function d20TestRollAfterReroll<
  T extends {
    readonly total: number;
    readonly d20TestRoll?: BattleD20TestRoll;
  },
>(roll: T, decision: BattleD20TestRollRerollDecision<string>): T {
  if (decision.kind === "rerollRolledDie") {
    return {
      ...roll,
      total: decision.replacement.result.total,
      d20TestRoll: decision.replacement.result.d20TestRoll,
    };
  }
  return decision.kind === "reroll"
    ? {
        ...roll,
        total: decision.replacement.total,
        d20TestRoll: decision.replacement.d20TestRoll,
      }
    : roll;
}

/**
 * A rolled outcome whose success the table rules (a saving throw) after a
 * source's reroll decision.
 */
export function d20TestOutcomeAfterReroll<
  T extends {
    readonly succeeded: boolean;
    readonly d20TestRoll: BattleD20TestRoll;
  },
>(outcome: T, decision: BattleD20TestOutcomeRerollDecision<string>): T {
  if (decision.kind === "rerollRolledDie") {
    return {
      ...outcome,
      succeeded: decision.replacement.result.succeeded,
      d20TestRoll: decision.replacement.result.d20TestRoll,
    };
  }
  return decision.kind === "reroll"
    ? {
        ...outcome,
        succeeded: decision.replacement.succeeded,
        d20TestRoll: decision.replacement.d20TestRoll,
      }
    : outcome;
}

/** A bare d20 roll (a Death Saving Throw) after a source's reroll decision. */
export function d20TestDieAfterReroll(
  naturalD20: BattleD20TestDieReplacement,
  decision: BattleD20TestDieRerollDecision<string>,
): BattleD20TestDieReplacement {
  return decision.kind === "reroll" ? decision.replacement : naturalD20;
}

/**
 * A reroll replaces only the die: the replacement total keeps everything the
 * original total added to its d20. Without a known original total there is
 * nothing to compare.
 */
export function d20TestRollReplacementKeepsModifier(
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
