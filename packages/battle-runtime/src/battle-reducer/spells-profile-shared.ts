import {
  movementFeet,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
  SpellRecord,
  TargetSelection,
} from "@dnd/surface/surface/types";

export function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value) => right.includes(value)) &&
    right.every((value) => left.includes(value))
  );
}

export function sameDiceExpr(left: DiceExpr, right: DiceExpr): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    (left.flat ?? 0) === (right.flat ?? 0)
  );
}

export function spellAttackSequencePartName(): "attack" {
  return "attack";
}

export function scalarBuffSpellTargetCount(
  selection: TargetSelection,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): number | null {
  const countBySlot = targetCountBySlot(selection, spellLevel);
  return countBySlot === null ? null : countBySlot(slotLevel);
}

export function scalarBuffSpellTargetCountBySlot(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  return targetCountBySlot(selection, spellLevel);
}

export function targetCountBySlot(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  if (selection.mode === "one") {
    return () => 1;
  }
  if (selection.mode !== "choose_up_to" || selection.count === undefined) {
    return null;
  }
  const count = selection.count;
  if (typeof count === "number") {
    return () => count;
  }
  if (count.kind !== "linear") {
    return null;
  }
  const baseLevel = count.baseLevel ?? spellLevel;
  return (slotLevel) =>
    count.base +
    Math.max(0, Number(slotLevel) - baseLevel) * count.perSlotAboveBase;
}

export function singleTargetSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  if (range.kind === "point" && typeof range.feet === "number") {
    return movementFeet(range.feet);
  }
  if (range.kind === "touch") {
    return movementFeet(5);
  }
  return null;
}

type ExplodingMaxDieThresholdTier = {
  readonly atLevel: number;
  readonly dice: number;
};

export function supportedRepeatedEffectCount(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return null;
  }
  const count = selection.count;
  if (typeof count === "number") {
    return () => count;
  }
  if (count.kind !== "linear") {
    return null;
  }
  const { base, perSlotAboveBase } = count;
  const baseLevel = count.baseLevel ?? spellLevel;
  return (slotLevel) =>
    base + Math.max(0, Number(slotLevel) - baseLevel) * perSlotAboveBase;
}

export function supportedDamageAmountExpr(input: {
  readonly amount: SurfaceDiceAmount;
  readonly spellLevel?: number | undefined;
  readonly slotLevel?: SpellSlotLevel | undefined;
  readonly characterLevel?: number | undefined;
}): DiceExpr | null {
  const { amount } = input;
  if (amount.kind === "fixed") {
    return amount.expr;
  }
  if (
    amount.kind === "threshold_tiers" &&
    amount.axis === "character" &&
    input.characterLevel !== undefined
  ) {
    return amount.tiers.reduce(
      (expr, tier) =>
        input.characterLevel !== undefined &&
        input.characterLevel >= tier.atLevel
          ? diceExprWithDelta(expr, tier.override)
          : expr,
      amount.base,
    );
  }
  if (
    amount.kind === "threshold_tiers_exploding_max_die" &&
    amount.axis === "character" &&
    input.characterLevel !== undefined
  ) {
    return amount.tiers.reduce<DiceExpr>(
      (expr: DiceExpr, tier: ExplodingMaxDieThresholdTier): DiceExpr =>
        input.characterLevel !== undefined &&
        input.characterLevel >= tier.atLevel
          ? diceExprWithDelta(expr, { dice: tier.dice })
          : expr,
      { dice: amount.baseDice, dieSize: amount.dieSize },
    );
  }
  if (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    input.spellLevel !== undefined &&
    input.slotLevel !== undefined &&
    (amount.startingAtLevel === input.spellLevel ||
      amount.startingAtLevel === input.spellLevel + 1) &&
    amount.base.dieSize !== undefined
  ) {
    const firstIncreasedSlot = amount.startingAtLevel === input.spellLevel + 1;
    const slotDelta = Math.max(
      0,
      Number(input.slotLevel) -
        amount.startingAtLevel +
        (firstIncreasedSlot ? 1 : 0),
    );
    return {
      dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
      dieSize: amount.base.dieSize,
      ...(amount.base.flat === undefined ? {} : { flat: amount.base.flat }),
    };
  }
  return null;
}

export function diceExprWithDelta(
  base: DiceExpr,
  delta: {
    readonly dice?: number | undefined;
    readonly dieSize?: number | undefined;
    readonly flat?: number | undefined;
  },
): DiceExpr {
  return {
    dice: delta.dice ?? base.dice,
    dieSize: delta.dieSize ?? base.dieSize,
    ...((delta.flat ?? base.flat) === undefined
      ? {}
      : { flat: delta.flat ?? base.flat }),
  };
}
