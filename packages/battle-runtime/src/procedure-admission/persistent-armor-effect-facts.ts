import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  ArmorClassSchema,
  type ArmorClass,
} from "@dnd/shared-algebras/armor-class-values";
import type {
  OngoingEffectMechanics,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";

/** Authored-free facts projected at the persistent-armor admission boundary. */
export type PersistentArmorEffectExecutionFacts = {
  readonly baseArmorClass: ArmorClass;
  readonly durationTicks: ElapsedTimeTicks;
};

export type PersistentArmorEffectSpellRecord = SpellRecord & {
  readonly mechanics: OngoingEffectMechanics;
};

export type PersistentArmorEffectAdmission = {
  readonly authoredSpell: PersistentArmorEffectSpellRecord;
  readonly executionFacts: PersistentArmorEffectExecutionFacts;
};

export function admitPersistentArmorEffectSpell(
  spell: SpellRecord,
): PersistentArmorEffectAdmission | null {
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
  const baseArmorClass = Schema.decodeUnknownEither(ArmorClassSchema)(
    operation.effect.formula.base,
  );
  if (
    Either.isLeft(durationTicks) ||
    Either.isLeft(requiredDurationTicks) ||
    Either.isLeft(baseArmorClass) ||
    Number(durationTicks.right) !== Number(requiredDurationTicks.right)
  ) {
    return null;
  }
  return {
    authoredSpell: { ...spell, mechanics: spell.mechanics },
    executionFacts: {
      baseArmorClass: baseArmorClass.right,
      durationTicks: durationTicks.right,
    },
  };
}

export function persistentArmorEffectExecutionFactsForSpell(
  spell: SpellRecord,
): PersistentArmorEffectExecutionFacts | null {
  return admitPersistentArmorEffectSpell(spell)?.executionFacts ?? null;
}
