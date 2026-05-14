// Repeated damage allocation spell profile extracted from spells-profiles-support.ts.

import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import type { SupportedSpellInvocation } from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import { supportedDamageAmountExpr, supportedRepeatedEffectCount } from "./spells-profiles-save-gates.ts";

export function supportedPreparedSlotSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    typeof spell.mechanics.range.feet !== "number" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.effects?.length !== 1
  ) {
    return [];
  }
  const effect = phase.effects?.[0];
  if (effect?.kind !== "damage" || typeof effect.damageType !== "string") {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({ amount: effect.amount });
  if (damageExpr == null || typeof effect.damageType !== "string") {
    return [];
  }
  const damageType = effect.damageType;
  const rangeFeet = movementFeet(spell.mechanics.range.feet);
  const repeatedEffectCountForSlotLevel = supportedRepeatedEffectCount(
    phase.attachment.value.selection,
    spell.mechanics.level,
  );
  if (repeatedEffectCountForSlotLevel === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "repeatedDamageAllocation",
        spell,
        targeting: {
          kind: "repeatedEffectTargetAllocation",
          repeatedEffectCount: repeatedEffectCountForSlotLevel(slot.spellLevel),
        },
        damage: {
          expr: damageExpr,
          damageType,
        },
        rangeFeet,
      },
    ];
  });
}
