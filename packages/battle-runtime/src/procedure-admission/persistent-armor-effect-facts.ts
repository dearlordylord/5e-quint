import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  OngoingEffectMechanics,
  SpellRecord,
} from "@dnd/surface/surface/types";
import * as Either from "effect/Either";

export type PersistentArmorEffectSpellRecord = SpellRecord & {
  readonly mechanics: OngoingEffectMechanics;
};

export type PersistentArmorEffectSpellProfile = {
  readonly spell: PersistentArmorEffectSpellRecord;
  readonly baseArmorClass: number;
  readonly durationTicks: ElapsedTimeTicks;
};

export function persistentArmorEffectSpellProfileForSpell(
  spell: SpellRecord,
): PersistentArmorEffectSpellProfile | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.earlyEnd?.length !== 1 ||
    spell.mechanics.duration.earlyEnd[0]?.kind !== "target_dons_armor" ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  if (
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "modify_ac_set_base" ||
    operation.effect.formula.kind !== "base_plus_dex"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  const requiredDurationTicks = elapsedTimeTicksFromHours(8);
  if (
    Either.isLeft(durationTicks) ||
    Either.isLeft(requiredDurationTicks) ||
    Number(durationTicks.right) !== Number(requiredDurationTicks.right)
  ) {
    return null;
  }
  return {
    spell: { ...spell, mechanics: spell.mechanics },
    baseArmorClass: operation.effect.formula.base,
    durationTicks: durationTicks.right,
  };
}
