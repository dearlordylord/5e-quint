export function spellAttackSequencePartName(): "attack" {
  return "attack";
}

export { sameStringSet } from "../same-string-set.ts";

export function targetSelectionFromAttachment(
  attachment: Attachment,
): TargetSelection | null {
  return attachment.kind === "hole" && attachment.value.kind === "target"
    ? attachment.value.selection
    : null;
}

/**
 * Check that a target-selection projection accounts for every authored field.
 * Profiles provide the keys their execution targeting actually consumes.
 */
export function targetSelectionHasOnlyKeys(
  selection: TargetSelection,
  supportedKeys: readonly TargetSelectionKey[],
): boolean {
  return Object.keys(selection).every((key) =>
    supportedKeys.some((supportedKey) => supportedKey === key),
  );
}

/**
 * Check that an attachment's authored value accounts for every field it
 * carries. Hole protocol metadata remains outside this projection boundary.
 */
export function attachmentValueHasOnlyKeys(
  attachment: Attachment,
  supportedKeys: readonly AttachmentValueKey[],
): boolean {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  return Object.keys(value).every((key) =>
    supportedKeys.some((supportedKey) => supportedKey === key),
  );
}

export function supportedDamageAmountExpr(input: {
  readonly amount: SurfaceDiceAmount;
  readonly spellLevel?: number | undefined;
  readonly slotLevel?: SpellSlotLevel | undefined;
  readonly characterLevel?: number | undefined;
}): DiceExpr | null {
  const { amount } = input;
  if (amount.kind === "fixed") return amount.expr;
  if (
    isCharacterThresholdTierDamageAmount(amount) &&
    isCharacterLevel(input.characterLevel)
  ) {
    return thresholdTierDamageExpr(amount, input.characterLevel);
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
      ...optionalProperty("flat", amount.base.flat),
    };
  }
  return null;
}

type CharacterThresholdTierDamageAmount = Extract<
  SurfaceDiceAmount,
  { readonly kind: "threshold_tiers" }
> & { readonly axis: "character" };

function isCharacterThresholdTierDamageAmount(
  amount: SurfaceDiceAmount,
): amount is CharacterThresholdTierDamageAmount {
  return amount.kind === "threshold_tiers" && amount.axis === "character";
}

function isCharacterLevel(value: number | undefined): value is CharacterLevel {
  return (
    value !== undefined && Number.isInteger(value) && value >= 1 && value <= 20
  );
}

export function thresholdTierDamageExpr(
  amount: CharacterThresholdTierDamageAmount,
  scalingLevel: CharacterLevel,
): DiceExpr {
  return amount.tiers.reduce(
    (expr, tier) =>
      scalingLevel >= tier.atLevel
        ? diceExprWithDelta(expr, tier.override)
        : expr,
    amount.base,
  );
}

export function supportedSpellSlotDamageFacts(input: {
  readonly slots: readonly SpellAdmissionCastOption[];
  readonly amount: SurfaceDiceAmount;
  readonly spellLevel: number;
}): readonly {
  readonly slotLevel: SpellSlotLevel;
  readonly damageExpr: DiceExpr;
  readonly payment: SpellAdmissionCastOption["payment"];
}[] {
  return input.slots.flatMap(({ spellLevel: slotLevel, payment }) => {
    if (Number(slotLevel) < input.spellLevel) return [];
    const damageExpr = supportedDamageAmountExpr({
      amount: input.amount,
      spellLevel: input.spellLevel,
      slotLevel,
    });
    return damageExpr === null ? [] : [{ slotLevel, damageExpr, payment }];
  });
}

export function diceExprWithDelta(
  base: DiceExpr,
  delta: {
    readonly dice?: number;
    readonly dieSize?: number;
    readonly flat?: number;
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
import { optionalProperty } from "../optional-property.ts";
import {
  movementFeet,
  type CharacterLevel,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  Attachment,
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
  Range,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { isFixedDistancePointRange } from "@dnd/surface/surface/types";
import type { SpellAdmissionCastOption } from "./spell-procedure-profiles/profile.ts";

type DistributiveKeyOf<Value> = Value extends unknown ? keyof Value : never;
type TargetSelectionKey = Extract<DistributiveKeyOf<TargetSelection>, string>;
type AttachmentValue = Extract<
  Attachment,
  { readonly kind: "hole"; readonly value: unknown }
>["value"];
type AttachmentValueKey = Extract<DistributiveKeyOf<AttachmentValue>, string>;

type ExplodingMaxDieThresholdTier = {
  readonly atLevel: number;
  readonly dice: number;
};

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
  if (selection.mode === "one") return () => 1;
  if (selection.mode !== "choose_up_to" || selection.count === undefined) {
    return null;
  }
  const count = selection.count;
  if (typeof count === "number") return () => count;
  if (count.kind !== "linear") return null;
  const baseLevel = count.baseLevel ?? spellLevel;
  return (slotLevel) =>
    count.base +
    Math.max(0, Number(slotLevel) - baseLevel) * count.perSlotAboveBase;
}

export function supportedRepeatedEffectCount(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return null;
  }
  const count = selection.count;
  if (typeof count === "number") return () => count;
  if (count.kind !== "linear") return null;
  const baseLevel = count.baseLevel ?? spellLevel;
  return (slotLevel) =>
    count.base +
    Math.max(0, Number(slotLevel) - baseLevel) * count.perSlotAboveBase;
}

export function sameDiceExpr(left: DiceExpr, right: DiceExpr): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    (left.flat ?? 0) === (right.flat ?? 0)
  );
}

export function singleTargetSpellRangeFeet(range: Range): MovementFeet | null {
  if (isFixedDistancePointRange(range)) {
    return movementFeet(range.feet);
  }
  return range.kind === "touch" ? movementFeet(5) : null;
}
