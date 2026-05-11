// Healing spell profile projections extracted from spells-profiles-support.ts.

import { movementFeet, type AbilityModifier, type MovementFeet, type SpellSlotLevel } from "@dnd/shared/types";
import type { Attachment, DiceExpr, SpellRecord, DiceAmount as SurfaceDiceAmount, TargetSelection } from "@dnd/surface/surface/types";
import { Match } from "effect";
import type { HealingSpellActionCost, HealingSpellTargeting, SupportedSpellInvocation } from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";

export function supportedPreparedHealingSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const actionCost = healingSpellActionCost(spell.mechanics.castingTime);
  const targeting =
    phase?.kind === "direct" && phase.attachment.kind === "hole"
      ? healingSpellTargeting(phase.attachment.value)
      : null;
  const rangeFeet = healingSpellRangeFeet(spell.mechanics.range);
  if (
    actionCost === null ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    targeting === null ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "heal_hp"
  ) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const healingExpr = supportedHealingAmountExpr(
      effect.amount,
      spell.mechanics.level,
      slot.spellLevel,
      spellcastingAbilityModifier,
    );
    return healingExpr === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "directHitPointRestoration",
            spell,
            actionCost,
            targeting,
            healing: { expr: healingExpr },
            rangeFeet,
          },
        ];
  });
}

export function healingSpellTargeting(
  attachment: Attachment,
): HealingSpellTargeting | null {
  if (attachment.kind === "target") {
    const targetBounds = healingSpellTargetBounds(attachment.selection);
    return targetBounds === null
      ? null
      : {
          kind: "targetList",
          minTargets: 1,
          maxTargets: targetBounds.maxTargets,
        };
  }

  if (attachment.kind === "area") {
    const targetBounds =
      attachment.selection === undefined
        ? null
        : healingSpellTargetBounds(attachment.selection);
    if (
      targetBounds === null ||
      attachment.origin.kind !== "point_within_range" ||
      attachment.shape.kind !== "sphere"
    ) {
      return null;
    }
    return {
      kind: "pointOriginSphereTargetList",
      minTargets: 1,
      maxTargets: targetBounds.maxTargets,
      area: {
        kind: "pointOriginSphere",
        radiusFeet: movementFeet(attachment.shape.radiusFeet),
      },
    };
  }

  return null;
}

export function healingSpellActionCost(
  castingTime: SpellRecord["mechanics"]["castingTime"],
): HealingSpellActionCost | null {
  return Match.value(castingTime).pipe(
    Match.when({ kind: "action" }, () => "magicAction" as const),
    Match.when({ kind: "bonus_action" }, () => "bonusAction" as const),
    Match.orElse(() => null),
  );
}

export function healingSpellTargetBounds(
  selection: TargetSelection,
): { readonly maxTargets: number } | null {
  if (selection.mode === "one") {
    return { maxTargets: 1 };
  }
  if (
    selection.mode === "choose_up_to" &&
    typeof selection.count === "number" &&
    selection.count >= 1
  ) {
    return { maxTargets: selection.count };
  }
  return null;
}

export function healingSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  return Match.value(range).pipe(
    Match.when({ kind: "point" }, (point) => movementFeet(point.feet)),
    Match.when({ kind: "touch" }, () => movementFeet(5)),
    Match.orElse(() => null),
  );
}

export function supportedHealingAmountExpr(
  amount: SurfaceDiceAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
  spellcastingAbilityModifier: AbilityModifier,
): DiceExpr | null {
  if (
    amount.kind !== "linear_per_level" ||
    amount.startingAtLevel !== spellLevel ||
    amount.base.spellcastingMod !== true ||
    amount.base.dieSize === undefined
  ) {
    return null;
  }
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    flat: Number(spellcastingAbilityModifier),
  };
}
