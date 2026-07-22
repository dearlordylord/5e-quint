import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  ArmorClassSchema,
  type ArmorClass,
} from "@dnd/shared-algebras/armor-class-values";
import {
  spellSlotLevel,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  OngoingEffectMechanics,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Brand, Either, Schema } from "effect";
import { singleTargetSpellRangeFeet } from "./spell-range-facts.ts";

/** Authored-free facts projected at the persistent-armor admission boundary. */
export type PersistentArmorEffectExecutionFacts = {
  readonly rangeFeet: MovementFeet;
  readonly slotLevel: SpellSlotLevel;
  readonly baseArmorClass: ArmorClass;
  readonly ability: "dex";
  readonly durationTicks: ElapsedTimeTicks;
  readonly earlyEnds: readonly [{ readonly kind: "targetDonsArmor" }];
};

type OngoingEffectSpellRecord = SpellRecord & {
  readonly mechanics: OngoingEffectMechanics;
};

export type PersistentArmorEffectAdmission = {
  readonly authoredSpell: OngoingEffectSpellRecord;
  readonly executionFacts: PersistentArmorEffectExecutionFacts;
} & Brand.Brand<"PersistentArmorEffectAdmission">;
const PersistentArmorEffectAdmission =
  Brand.nominal<PersistentArmorEffectAdmission>();

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
  const rangeFeet = singleTargetSpellRangeFeet(spell.mechanics.range);
  if (
    Either.isLeft(durationTicks) ||
    Either.isLeft(requiredDurationTicks) ||
    Either.isLeft(baseArmorClass) ||
    rangeFeet === null ||
    Number(durationTicks.right) !== Number(requiredDurationTicks.right)
  ) {
    return null;
  }
  return PersistentArmorEffectAdmission({
    authoredSpell: { ...spell, mechanics: spell.mechanics },
    executionFacts: {
      rangeFeet,
      slotLevel: spellSlotLevel(spell.mechanics.level),
      baseArmorClass: baseArmorClass.right,
      ability: "dex",
      durationTicks: durationTicks.right,
      earlyEnds: [{ kind: "targetDonsArmor" }],
    },
  });
}
