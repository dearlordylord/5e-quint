import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { ArmorClass } from "@dnd/shared-algebras/armor-class-values";
import type { MovementFeet, SpellSlotLevel } from "@dnd/shared/types";

/** Authored-free facts projected by the persistent-armor support gate. */
export type PersistentArmorEffectExecutionFacts = {
  readonly rangeFeet: MovementFeet;
  readonly slotLevel: SpellSlotLevel;
  readonly baseArmorClass: ArmorClass;
  readonly ability: "dex";
  readonly durationTicks: ElapsedTimeTicks;
  readonly earlyEnds: readonly [{ readonly kind: "targetDonsArmor" }];
};
