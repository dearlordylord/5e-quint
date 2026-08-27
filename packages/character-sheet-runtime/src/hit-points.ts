// KERNEL-COVERAGE: runtime-owner SHEET.HIT_POINTS.MAXIMUM_DERIVATION
import {
  characterBuildHitPoints,
  characterCreationIssueMessage,
  type CharacterBuild,
  type CharacterBuildProjectionIssue,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  STABLE_RECOVERY_ROLL_DICE_EXPR,
  advanceStableRecovery,
  advanceStableRecoveryWithRoll,
  type StableRecoveryAdvanceResult,
} from "@dnd/shared-algebras/stable-recovery-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
  type FilledHoleValue,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { ElapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  DieRollResult,
  Hp,
  type Hp as HpType,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import { Either } from "effect";

import {
  characterSheetIssue,
  isNonNegativeInteger,
  type CharacterSheet,
  type CharacterSheetElapsedTimeResult,
  type CharacterSheetHitPointMaximumProjection,
  type CharacterSheetHitPointRecoveryOverflow,
  type CharacterSheetHitPoints,
  type CharacterSheetHitPointsInput,
  type CharacterSheetId,
  type CharacterSheetInput,
  type CharacterSheetIssue,
  type CharacterSheetWithSpellSlots,
  type CharacterSheetZeroHpLifecycle,
  type CharacterSheetZeroHpLifecycleInput,
} from "./sheet-types.ts";

const CHARACTER_SHEET_HIT_POINT_MAXIMUM_PROJECTION_ROUTE = [
  {
    kind: "projectCharacterSheetFacts",
    subject: "hitPoint",
    owner: "hitPoint",
  },
  {
    kind: "recordCharacterSheetFacts",
    subject: "hitPoint",
    facts: ["hitPointMaximumArithmeticInput"],
    owner: "buildProjection",
  },
] as const satisfies CharacterSheetHitPointMaximumProjection["qRoute"];

/**
 * Character Sheet HP projection failures retain the original Character Build
 * leaves for battle admission. The ordinary Sheet API continues to expose a
 * presentation-only Character Sheet issue for callers that do not need those
 * structured causes.
 */
export type CharacterSheetHitPointMaximumProjectionIssue =
  | CharacterSheetIssue
  | ReadonlyNonEmptyArray<CharacterBuildProjectionIssue>;

export function characterSheetHitPoints(
  input: CharacterSheetHitPointsInput,
): Either.Either<CharacterSheetHitPoints, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed HP input: Temporary Hit Points are not a nonnegative integer. */
  if (!isNonNegativeInteger(input.tempHp)) {
    return characterSheetIssue(
      "Character Sheet Temporary Hit Points must be nonnegative.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const tempHp = input.tempHp;
  if (Number(input.currentHp) > 0) {
    if (input.zeroHpLifecycle !== undefined) {
      return characterSheetIssue(
        "Positive-HP Character Sheet cannot carry zero-HP state.",
      );
    }
    if (
      input.positiveHpUnconscious !== undefined &&
      Number(input.currentHp) !== 1
    ) {
      return characterSheetIssue(
        "Knocked Out Character Sheet must have exactly 1 current HP.",
      );
    }
    return Either.right(
      input.positiveHpUnconscious === undefined
        ? { tag: "positive", currentHp: input.currentHp, tempHp }
        : { tag: "knockedOut", tempHp },
    );
  }
  /* v8 ignore start -- @preserve -- Malformed zero-HP input: Knock Out Unconscious state is meaningful only while current HP is positive. */
  if (input.positiveHpUnconscious !== undefined) {
    return characterSheetIssue(
      "Zero-HP Character Sheet cannot carry Knock Out Unconscious state.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const lifecycle = canonicalZeroHpLifecycle(
    input.zeroHpLifecycle ?? {
      tag: "unstable",
      deathSaves: { successes: 0, failures: 0 },
    },
  );
  /* v8 ignore start -- @preserve -- Malformed zero-HP input: the supplied lifecycle failed its terminal-count invariants. */
  if (Either.isLeft(lifecycle)) return Either.left(lifecycle.left);
  /* v8 ignore stop -- @preserve */
  return Either.right({ tag: "zero", tempHp, lifecycle: lifecycle.right });
}

export function characterSheetCurrentHp(sheet: CharacterSheet): HpType {
  return characterSheetHitPointsCurrentHp(sheet.hitPoints);
}

export function characterSheetTempHp(sheet: CharacterSheet): HpType {
  return sheet.hitPoints.tempHp;
}

export function characterSheetNormalHitPointMaximum(input: {
  readonly sheet: Pick<CharacterSheet, "build">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<HpType, CharacterSheetIssue> {
  return characterSheetBuildNormalHitPointMaximum({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
  });
}

export function characterSheetHitPointMaximum(input: {
  readonly sheet: Pick<CharacterSheet, "build" | "hitPointMaximumReduction">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<HpType, CharacterSheetIssue> {
  return Either.map(
    characterSheetHitPointMaximumProjection(input),
    (projection) => projection.effectiveHitPointMaximum,
  );
}

export function characterSheetHitPointMaximumProjection(input: {
  readonly sheet: Pick<CharacterSheet, "build" | "hitPointMaximumReduction">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetHitPointMaximumProjection,
  CharacterSheetIssue
> {
  const projection = characterSheetHitPointMaximumProjectionWithIssues(input);
  if (Either.isLeft(projection)) {
    return characterSheetIssue(
      characterSheetHitPointMaximumProjectionIssueMessage(projection.left),
    );
  }
  return Either.right(projection.right);
}

/**
 * Project a Character Sheet HP maximum while retaining every independent
 * Character Build projection cause. This is the structured companion to
 * characterSheetHitPointMaximumProjection's presentation-only failure.
 */
export function characterSheetHitPointMaximumProjectionWithIssues(input: {
  readonly sheet: Pick<CharacterSheet, "build" | "hitPointMaximumReduction">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetHitPointMaximumProjection,
  CharacterSheetHitPointMaximumProjectionIssue
> {
  const normalHitPointMaximum =
    characterSheetBuildNormalHitPointMaximumWithIssues({
      build: input.sheet.build,
      unitLibrary: input.unitLibrary,
    });
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: normal or reduced HP maximum cannot be projected from the retained build. */
  if (Either.isLeft(normalHitPointMaximum)) {
    return Either.left(normalHitPointMaximum.left);
  }
  const effectiveHitPointMaximum = characterSheetEffectiveHitPointMaximum({
    normalMaximum: normalHitPointMaximum.right,
    hitPointMaximumReduction: input.sheet.hitPointMaximumReduction,
  });
  if (Either.isLeft(effectiveHitPointMaximum)) {
    return Either.left(effectiveHitPointMaximum.left);
  }
  /* v8 ignore stop -- @preserve */
  return Either.right({
    normalHitPointMaximum: normalHitPointMaximum.right,
    effectiveHitPointMaximum: effectiveHitPointMaximum.right,
    hitPointMaximumReduction: input.sheet.hitPointMaximumReduction,
    qRoute: CHARACTER_SHEET_HIT_POINT_MAXIMUM_PROJECTION_ROUTE,
  });
}

function characterSheetHitPointMaximumProjectionIssueMessage(
  issue: CharacterSheetHitPointMaximumProjectionIssue,
): string {
  return isCharacterBuildProjectionIssues(issue)
    ? issue.map(characterCreationIssueMessage).join("; ")
    : issue.message;
}

function isCharacterBuildProjectionIssues(
  issue: CharacterSheetHitPointMaximumProjectionIssue,
): issue is ReadonlyNonEmptyArray<CharacterBuildProjectionIssue> {
  return Array.isArray(issue);
}

export function characterSheetHitPointsCurrentHp(
  hitPoints: CharacterSheetHitPoints,
): HpType {
  if (hitPoints.tag === "positive") return hitPoints.currentHp;
  return hitPoints.tag === "knockedOut" ? Hp(1) : Hp(0);
}

export function characterSheetHitPointCapacity(
  input: Pick<
    CharacterSheetInput,
    "build" | "unitLibrary" | "currentHp" | "hitPointMaximumReduction"
  >,
): Either.Either<
  { readonly currentHp: HpType; readonly hitPointMaximum: HpType },
  CharacterSheetIssue
> {
  const normalMaximum = characterSheetBuildNormalHitPointMaximum(input);
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: admitted class progression must still yield its normal HP maximum. */
  if (Either.isLeft(normalMaximum)) return Either.left(normalMaximum.left);
  const hitPointMaximum = characterSheetEffectiveHitPointMaximum({
    normalMaximum: normalMaximum.right,
    hitPointMaximumReduction: input.hitPointMaximumReduction,
  });
  /* v8 ignore next -- @preserve -- Malformed retained HP state: maximum reduction must remain below the build-derived normal maximum. */
  if (Either.isLeft(hitPointMaximum)) return Either.left(hitPointMaximum.left);
  const currentHp = input.currentHp ?? hitPointMaximum.right;
  if (currentHp > hitPointMaximum.right) {
    return characterSheetIssue(
      "Character Sheet current HP exceeds maximum HP.",
    );
  }
  return Either.right({ currentHp, hitPointMaximum: hitPointMaximum.right });
}

export function recoverCharacterSheetHitPoints(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly healing: HpType;
  readonly overflow: CharacterSheetHitPointRecoveryOverflow;
  readonly deadCharacterMessage: string;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (input.healing === Hp(0)) return Either.right(input.sheet);
  /* v8 ignore start -- @preserve -- Malformed healing input: a dead character cannot regain HP through this recovery path. */
  if (
    input.sheet.hitPoints.tag === "zero" &&
    input.sheet.hitPoints.lifecycle.tag === "dead"
  ) {
    return characterSheetIssue(input.deadCharacterMessage);
  }
  /* v8 ignore stop -- @preserve */

  const currentHp = characterSheetCurrentHp(input.sheet);
  const hitPointMaximum = characterSheetHitPointMaximum({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Malformed sheet/catalog correlation: healing reuses the HP maximum admitted for this sheet build. */
  if (Either.isLeft(hitPointMaximum)) return Either.left(hitPointMaximum.left);
  const recoveredHp = currentHp + input.healing;
  /* v8 ignore start -- @preserve -- Malformed healing input: reject-above-maximum recovery exceeds the build-derived missing HP. */
  if (
    input.overflow.tag === "rejectAboveMaximum" &&
    recoveredHp > hitPointMaximum.right
  ) {
    return characterSheetIssue(input.overflow.message);
  }
  /* v8 ignore stop -- @preserve */
  const hitPoints = characterSheetHitPoints({
    currentHp: Hp(Math.min(Number(hitPointMaximum.right), Number(recoveredHp))),
    tempHp: characterSheetTempHp(input.sheet),
  });
  /* v8 ignore start -- @preserve -- The recovery calculation above produces a nonnegative canonical HP state. */
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  /* v8 ignore stop -- @preserve */
  return Either.right({ ...input.sheet, hitPoints: hitPoints.right });
}

export function passStableRecoveryTime(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly fills: readonly FilledHoleValue[];
}): CharacterSheetElapsedTimeResult {
  if (input.sheet.hitPoints.tag !== "zero") {
    return {
      tag: "resolved",
      sheet: input.sheet,
      elapsedTicks: input.ticks,
    };
  }
  const lifecycle = input.sheet.hitPoints.lifecycle;
  if (lifecycle.tag !== "stable") {
    return {
      tag: "resolved",
      sheet: input.sheet,
      elapsedTicks: input.ticks,
    };
  }
  if (lifecycle.recovery.kind === "regains1HpAfter") {
    /* v8 ignore start -- @preserve -- Malformed elapsed-time input: fixed Stable recovery received a fill even though no roll hole exists. */
    if (input.fills.length !== 0) {
      return invalidElapsedTimeResult(
        input.sheet,
        "Elapsed-time recovery received fills when no roll is pending.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return passStableRecoveryRule({
      sheet: input.sheet,
      ticks: input.ticks,
    });
  }
  const hole = stableRecoveryRollHole(input.sheet.characterId);
  const fill = stableRecoveryFillFor(input.fills, hole);
  /* v8 ignore start -- @preserve -- Malformed elapsed-time input: Stable recovery received a wrong, duplicate, or extra roll fill. */
  if (fill === undefined && input.fills.length !== 0) {
    return invalidElapsedTimeResult(
      input.sheet,
      "Elapsed-time recovery received a fill for a different hole.",
    );
  }
  if (fill !== undefined && input.fills.length !== 1) {
    return invalidElapsedTimeResult(
      input.sheet,
      "Elapsed-time recovery accepts exactly one matching fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (fill === undefined) {
    return passStableRecoveryRule({
      sheet: input.sheet,
      ticks: input.ticks,
      hole,
    });
  }
  const roll = stableRecoveryRollFromFill(fill);
  /* v8 ignore start -- @preserve -- Malformed elapsed-time input: the matching Stable recovery fill failed its one-d4 parser. */
  if (Either.isLeft(roll))
    return invalidElapsedTimeResult(input.sheet, roll.left.message);
  /* v8 ignore stop -- @preserve */
  return passStableRecoveryRuleWithRoll({
    sheet: input.sheet,
    ticks: input.ticks,
    roll: roll.right,
    hole,
  });
}

export function invalidElapsedTimeResult(
  sheet: CharacterSheet,
  message: string,
): CharacterSheetElapsedTimeResult {
  return {
    tag: "invalid",
    sheet,
    reason: "invalidFill",
    message,
  };
}

export function parseHp(
  value: unknown,
): Either.Either<HpType, CharacterSheetIssue> {
  return isNonNegativeInteger(value)
    ? Either.right(Hp(value))
    : characterSheetIssue("Expected nonnegative HP.");
}

function characterSheetBuildNormalHitPointMaximum(input: {
  readonly build: Pick<
    CharacterBuild,
    "progression" | "species" | "abilityScores" | "features"
  >;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<HpType, CharacterSheetIssue> {
  const hitPoints = characterSheetBuildNormalHitPointMaximumWithIssues(input);
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: character creation cannot project the retained build's normal HP maximum. */
  if (Either.isLeft(hitPoints))
    return characterSheetIssue(
      hitPoints.left.map(characterCreationIssueMessage).join("; "),
    );
  /* v8 ignore stop -- @preserve */
  return Either.right(hitPoints.right);
}

function characterSheetBuildNormalHitPointMaximumWithIssues(input: {
  readonly build: Pick<
    CharacterBuild,
    "progression" | "species" | "abilityScores" | "features"
  >;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  HpType,
  ReadonlyNonEmptyArray<CharacterBuildProjectionIssue>
> {
  const hitPoints = characterBuildHitPoints(input.build, input.unitLibrary);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  return Either.right(Hp(Number(hitPoints.right.maximum)));
}

function characterSheetEffectiveHitPointMaximum(input: {
  readonly normalMaximum: HpType;
  readonly hitPointMaximumReduction: HpType;
}): Either.Either<HpType, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed HP input: the normal maximum is nonpositive or its reduction leaves no positive effective maximum. */
  if (input.normalMaximum < Hp(1)) {
    return characterSheetIssue("Character Sheet maximum HP must be positive.");
  }
  if (input.hitPointMaximumReduction >= input.normalMaximum) {
    return characterSheetIssue(
      "Character Sheet Hit Point maximum reduction must leave a positive Hit Point maximum.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Either.right(
    Hp(Number(input.normalMaximum) - Number(input.hitPointMaximumReduction)),
  );
}

function passStableRecoveryRule(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly hole?: RuntimeHole;
}): CharacterSheetElapsedTimeResult {
  const sheet = input.sheet;
  /* v8 ignore start -- @preserve -- Internal workflow invariant: V8 maps the rejected edge to this guard, but passStableRecoveryTime calls this rule only after narrowing to zero HP with a Stable lifecycle. */
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable"
  ) {
    return { tag: "resolved", sheet, elapsedTicks: input.ticks };
  }
  /* v8 ignore stop -- @preserve */
  const recovery = sheet.hitPoints.lifecycle.recovery;
  const advanced =
    recovery.kind === "regains1HpAfter"
      ? advanceStableRecovery({ recovery, ticks: input.ticks })
      : advanceStableRecovery({ recovery, ticks: input.ticks });
  /* v8 ignore start -- @preserve -- Malformed elapsed-time input: Stable recovery advancement rejected an invalid tick interval. */
  if (Either.isLeft(advanced)) {
    return invalidElapsedTimeResult(sheet, advanced.left.message);
  }
  /* v8 ignore stop -- @preserve */
  return stableRecoveryAdvanceResult({
    sheet,
    hitPoints: sheet.hitPoints,
    advanced: advanced.right,
    hole: input.hole ?? stableRecoveryRollHole(sheet.characterId),
  });
}

function passStableRecoveryRuleWithRoll(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly roll: DieRollResult;
  readonly hole: RuntimeHole;
}): CharacterSheetElapsedTimeResult {
  const sheet = input.sheet;
  /* v8 ignore start -- @preserve -- Malformed elapsed-time input: a Stable recovery roll was applied while no roll was pending. */
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable" ||
    sheet.hitPoints.lifecycle.recovery.kind !== "regains1HpAfter1d4Hours"
  ) {
    return invalidElapsedTimeResult(
      sheet,
      "Elapsed-time recovery received a roll when no roll is pending.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const advanced = advanceStableRecoveryWithRoll({
    recovery: sheet.hitPoints.lifecycle.recovery,
    ticks: input.ticks,
    roll: input.roll,
  });
  if (Either.isLeft(advanced)) {
    return invalidElapsedTimeResult(sheet, advanced.left.message);
  }
  return stableRecoveryAdvanceResult({
    sheet,
    hitPoints: sheet.hitPoints,
    advanced: advanced.right,
    hole: input.hole,
  });
}

function stableRecoveryAdvanceResult(input: {
  readonly sheet: CharacterSheet;
  readonly hitPoints: Extract<
    CharacterSheetHitPoints,
    { readonly tag: "zero" }
  >;
  readonly advanced: StableRecoveryAdvanceResult;
  readonly hole: RuntimeHole;
}): CharacterSheetElapsedTimeResult {
  if (input.advanced.tag === "needsStableRecoveryRoll") {
    return {
      tag: "needsHoles",
      sheet: input.sheet,
      holes: [input.hole],
      elapsedTicks: input.advanced.elapsedTicks,
      remainingTicks: input.advanced.remainingTicks,
    };
  }
  if (input.advanced.tag === "recovered") {
    return {
      tag: "resolved",
      sheet: replaceCharacterSheetHitPoints(input.sheet, {
        tag: "positive",
        currentHp: Hp(1),
        tempHp: input.hitPoints.tempHp,
      }),
      elapsedTicks: input.advanced.elapsedTicks,
    };
  }
  return {
    tag: "resolved",
    sheet: replaceCharacterSheetHitPoints(input.sheet, {
      ...input.hitPoints,
      lifecycle: {
        tag: "stable",
        recovery: input.advanced.recovery,
      },
    }),
    elapsedTicks: input.advanced.elapsedTicks,
  };
}

function stableRecoveryRollHole(characterId: CharacterSheetId): RuntimeHole {
  return {
    kind: "rolledDice",
    holeId: holeId(`character-sheet:${characterId}:stable-recovery-roll`),
    holeInstanceKey: holeInstanceKey(
      `character-sheet:${characterId}:stable-recovery-roll`,
    ),
    label: "Stable recovery 1d4 hours",
  };
}

function stableRecoveryFillFor(
  fills: readonly FilledHoleValue[],
  hole: RuntimeHole,
): Extract<FilledHoleValue, { readonly kind: "rolledDice" }> | undefined {
  return fills.find(
    (
      candidate,
    ): candidate is Extract<FilledHoleValue, { readonly kind: "rolledDice" }> =>
      candidate.kind === "rolledDice" && candidate.holeId === hole.holeId,
  );
}

function stableRecoveryRollFromFill(
  fill: Extract<FilledHoleValue, { readonly kind: "rolledDice" }>,
): Either.Either<DieRollResult, CharacterSheetIssue> {
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: STABLE_RECOVERY_ROLL_DICE_EXPR.dice,
    dieSize: STABLE_RECOVERY_ROLL_DICE_EXPR.dieSize,
  });
  /* v8 ignore start -- @preserve -- Malformed Stable recovery fill: the roll group fails the exact one-d4 hole validator. */
  if (validation !== null) {
    return characterSheetIssue(validation.reason);
  }
  const group = fill.value[0];
  const roll = group?.results[0];
  return roll === undefined
    ? characterSheetIssue("Stable recovery requires one d4 roll.")
    : Either.right(roll);
  /* v8 ignore stop -- @preserve */
}

function replaceCharacterSheetHitPoints(
  sheet: CharacterSheet,
  hitPoints: CharacterSheetHitPoints,
): CharacterSheet {
  return isCharacterSheetWithSpellSlots(sheet)
    ? {
        ...sheet,
        hitPoints,
        spellSlotExpenditures: sheet.spellSlotExpenditures,
      }
    : { ...sheet, hitPoints };
}

function canonicalZeroHpLifecycle(
  lifecycle: CharacterSheetZeroHpLifecycleInput,
): Either.Either<CharacterSheetZeroHpLifecycle, CharacterSheetIssue> {
  if (lifecycle.tag === "stable") return Either.right(lifecycle);
  if (lifecycle.tag === "dead") {
    const { successes, failures } = lifecycle.deathSaves;
    /* v8 ignore start -- @preserve -- Malformed zero-HP lifecycle: Dead requires exactly three failures and fewer than three successes. */
    if (successes === 3 || failures !== 3) {
      return characterSheetIssue(
        "Dead Character Sheet requires exactly three death save failures.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return Either.right({ tag: "dead", deathSaves: { successes, failures } });
  }
  const { successes, failures } = lifecycle.deathSaves;
  /* v8 ignore start -- @preserve -- Malformed zero-HP lifecycle: Unstable cannot retain terminal success or failure counts. */
  if (successes === 3 || failures === 3) {
    return characterSheetIssue(
      "Unstable Character Sheet cannot carry terminal death save counts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Either.right({ tag: "unstable", deathSaves: { successes, failures } });
}

function isCharacterSheetWithSpellSlots(
  sheet: CharacterSheet,
): sheet is CharacterSheetWithSpellSlots {
  return "spellSlotExpenditures" in sheet && "createdSpellSlots" in sheet;
}
