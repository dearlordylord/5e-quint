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
import { Result, Schema } from "effect";
import type { BattleSpellAdmissionSource } from "../battle-state-execution.ts";
import { singleTargetSpellRangeFeet } from "../battle-reducer/spells-execution-facts.ts";

/** Authored-free facts projected by the persistent-armor support gate. */
export type PersistentArmorEffectExecutionFacts = {
  readonly rangeFeet: MovementFeet;
  readonly slotLevel: SpellSlotLevel;
  readonly baseArmorClass: ArmorClass;
  readonly ability: "dex";
  readonly durationTicks: ElapsedTimeTicks;
  readonly earlyEnds: readonly [{ readonly kind: "targetDonsArmor" }];
};

export function persistentArmorEffectExecutionFactsForSpell(
  spell: Pick<BattleSpellAdmissionSource, "mechanics">,
): PersistentArmorEffectExecutionFacts | null {
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
  const baseArmorClass = Schema.decodeUnknownResult(ArmorClassSchema)(
    operation.effect.formula.base,
  );
  const rangeFeet = singleTargetSpellRangeFeet(spell.mechanics.range);
  if (
    Result.isFailure(durationTicks) ||
    Result.isFailure(requiredDurationTicks) ||
    Result.isFailure(baseArmorClass) ||
    rangeFeet === null ||
    Number(durationTicks.success) !== Number(requiredDurationTicks.success)
  ) {
    return null;
  }
  return {
    rangeFeet,
    slotLevel: spellSlotLevel(spell.mechanics.level),
    baseArmorClass: baseArmorClass.success,
    ability: "dex",
    durationTicks: durationTicks.success,
    earlyEnds: [{ kind: "targetDonsArmor" }],
  };
}
