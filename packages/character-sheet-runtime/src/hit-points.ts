// KERNEL-COVERAGE: runtime-owner SHEET.HIT_POINTS.MAXIMUM_DERIVATION
import {
  STABLE_RECOVERY_ROLL_DICE_EXPR,
  advanceStableRecovery,
  advanceStableRecoveryWithRoll,
} from "@dnd/shared-algebras/stable-recovery-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
  type FilledHoleValue,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { ElapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { DieRollResult, Hp, type Hp as HpType } from "@dnd/shared/types";
import { Either } from "effect";

import {
  characterSheetIssue,
  isNonNegativeInteger,
  type CharacterSheet,
  type CharacterSheetElapsedTimeResult,
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

export function characterSheetHitPoints(
  input: CharacterSheetHitPointsInput,
): Either.Either<CharacterSheetHitPoints, CharacterSheetIssue> {
  if (!isNonNegativeInteger(input.tempHp)) {
    return characterSheetIssue(
      "Character Sheet Temporary Hit Points must be nonnegative.",
    );
  }
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
  if (input.positiveHpUnconscious !== undefined) {
    return characterSheetIssue(
      "Zero-HP Character Sheet cannot carry Knock Out Unconscious state.",
    );
  }
  const lifecycle = canonicalZeroHpLifecycle(
    input.zeroHpLifecycle ?? {
      tag: "unstable",
      deathSaves: { successes: 0, failures: 0 },
    },
  );
  return Either.isLeft(lifecycle)
    ? Either.left(lifecycle.left)
    : Either.right({ tag: "zero", tempHp, lifecycle: lifecycle.right });
}

export function characterSheetCurrentHp(sheet: CharacterSheet): HpType {
  return characterSheetHitPointsCurrentHp(sheet.hitPoints);
}

export function characterSheetTempHp(sheet: CharacterSheet): HpType {
  return sheet.hitPoints.tempHp;
}

export function characterSheetHitPointMaximum(sheet: CharacterSheet): HpType {
  return Hp(Number(sheet.maximumHp) - Number(sheet.hitPointMaximumReduction));
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
    "maximumHp" | "currentHp" | "hitPointMaximumReduction"
  >,
): Either.Either<void, CharacterSheetIssue> {
  if (input.maximumHp < 1) {
    return characterSheetIssue("Character Sheet maximum HP must be positive.");
  }
  if (input.hitPointMaximumReduction >= input.maximumHp) {
    return characterSheetIssue(
      "Character Sheet Hit Point maximum reduction must leave a positive Hit Point maximum.",
    );
  }
  if (input.currentHp > input.maximumHp - input.hitPointMaximumReduction) {
    return characterSheetIssue(
      "Character Sheet current HP exceeds maximum HP.",
    );
  }
  return Either.right(undefined);
}

export function recoverCharacterSheetHitPoints(input: {
  readonly sheet: CharacterSheet;
  readonly healing: HpType;
  readonly overflow: CharacterSheetHitPointRecoveryOverflow;
  readonly deadCharacterMessage: string;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (input.healing === Hp(0)) return Either.right(input.sheet);
  if (
    input.sheet.hitPoints.tag === "zero" &&
    input.sheet.hitPoints.lifecycle.tag === "dead"
  ) {
    return characterSheetIssue(input.deadCharacterMessage);
  }

  const currentHp = characterSheetCurrentHp(input.sheet);
  const hitPointMaximum = characterSheetHitPointMaximum(input.sheet);
  const recoveredHp = currentHp + input.healing;
  if (
    input.overflow.tag === "rejectAboveMaximum" &&
    recoveredHp > hitPointMaximum
  ) {
    return characterSheetIssue(input.overflow.message);
  }
  const hitPoints = characterSheetHitPoints({
    currentHp: Hp(Math.min(Number(hitPointMaximum), Number(recoveredHp))),
    tempHp: characterSheetTempHp(input.sheet),
  });
  return Either.isLeft(hitPoints)
    ? Either.left(hitPoints.left)
    : Either.right({ ...input.sheet, hitPoints: hitPoints.right });
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
    if (input.fills.length !== 0) {
      return invalidElapsedTimeResult(
        input.sheet,
        "Elapsed-time recovery received fills when no roll is pending.",
      );
    }
    return passStableRecoveryRule({
      sheet: input.sheet,
      ticks: input.ticks,
    });
  }
  const hole = stableRecoveryRollHole(input.sheet.characterId);
  const fill = stableRecoveryFillFor(input.fills, hole);
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
  if (fill === undefined) {
    return passStableRecoveryRule({
      sheet: input.sheet,
      ticks: input.ticks,
      hole,
    });
  }
  const roll = stableRecoveryRollFromFill(fill);
  return Either.isLeft(roll)
    ? invalidElapsedTimeResult(input.sheet, roll.left.message)
    : passStableRecoveryRuleWithRoll({
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

function passStableRecoveryRule(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly hole?: RuntimeHole;
}): CharacterSheetElapsedTimeResult {
  const sheet = input.sheet;
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable"
  ) {
    return { tag: "resolved", sheet, elapsedTicks: input.ticks };
  }
  const recovery = sheet.hitPoints.lifecycle.recovery;
  const advanced =
    recovery.kind === "regains1HpAfter"
      ? advanceStableRecovery({ recovery, ticks: input.ticks })
      : advanceStableRecovery({ recovery, ticks: input.ticks });
  if (Either.isLeft(advanced)) {
    return invalidElapsedTimeResult(sheet, advanced.left.message);
  }
  if (advanced.right.tag === "needsStableRecoveryRoll") {
    return {
      tag: "needsHoles",
      sheet,
      holes: [input.hole ?? stableRecoveryRollHole(sheet.characterId)],
      elapsedTicks: advanced.right.elapsedTicks,
      remainingTicks: advanced.right.remainingTicks,
    };
  }
  if (advanced.right.tag === "recovered") {
    return {
      tag: "resolved",
      sheet: replaceCharacterSheetHitPoints(sheet, {
        tag: "positive",
        currentHp: Hp(1),
        tempHp: sheet.hitPoints.tempHp,
      }),
      elapsedTicks: advanced.right.elapsedTicks,
    };
  }
  return {
    tag: "resolved",
    sheet: replaceCharacterSheetHitPoints(sheet, {
      ...sheet.hitPoints,
      lifecycle: {
        tag: "stable",
        recovery: advanced.right.recovery,
      },
    }),
    elapsedTicks: advanced.right.elapsedTicks,
  };
}

function passStableRecoveryRuleWithRoll(input: {
  readonly sheet: CharacterSheet;
  readonly ticks: ElapsedTimeTicks;
  readonly roll: DieRollResult;
  readonly hole: RuntimeHole;
}): CharacterSheetElapsedTimeResult {
  const sheet = input.sheet;
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
  const advanced = advanceStableRecoveryWithRoll({
    recovery: sheet.hitPoints.lifecycle.recovery,
    ticks: input.ticks,
    roll: input.roll,
  });
  if (Either.isLeft(advanced)) {
    return invalidElapsedTimeResult(sheet, advanced.left.message);
  }
  if (advanced.right.tag === "needsStableRecoveryRoll") {
    return {
      tag: "needsHoles",
      sheet,
      holes: [input.hole],
      elapsedTicks: advanced.right.elapsedTicks,
      remainingTicks: advanced.right.remainingTicks,
    };
  }
  if (advanced.right.tag === "recovered") {
    return {
      tag: "resolved",
      sheet: replaceCharacterSheetHitPoints(sheet, {
        tag: "positive",
        currentHp: Hp(1),
        tempHp: sheet.hitPoints.tempHp,
      }),
      elapsedTicks: advanced.right.elapsedTicks,
    };
  }
  return {
    tag: "resolved",
    sheet: replaceCharacterSheetHitPoints(sheet, {
      ...sheet.hitPoints,
      lifecycle: {
        tag: "stable",
        recovery: advanced.right.recovery,
      },
    }),
    elapsedTicks: advanced.right.elapsedTicks,
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
  if (validation !== null) {
    return characterSheetIssue(validation.reason);
  }
  const group = fill.value[0];
  const roll = group?.results[0];
  return roll === undefined
    ? characterSheetIssue("Stable recovery requires one d4 roll.")
    : Either.right(roll);
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
    if (successes === 3 || failures !== 3) {
      return characterSheetIssue(
        "Dead Character Sheet requires exactly three death save failures.",
      );
    }
    return Either.right({ tag: "dead", deathSaves: { successes, failures } });
  }
  const { successes, failures } = lifecycle.deathSaves;
  if (successes === 3 || failures === 3) {
    return characterSheetIssue(
      "Unstable Character Sheet cannot carry terminal death save counts.",
    );
  }
  return Either.right({ tag: "unstable", deathSaves: { successes, failures } });
}

function isCharacterSheetWithSpellSlots(
  sheet: CharacterSheet,
): sheet is CharacterSheetWithSpellSlots {
  return "spellSlotExpenditures" in sheet && "createdSpellSlots" in sheet;
}
