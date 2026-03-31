import { canUseMagicalCunning, canUseMysticArcanum } from "#/features/class-warlock.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"

// -- Actions --

/** Magical Cunning: set used flag. Pact slot recovery is caller-managed.
 * SRD: "you regain expended Pact Magic spell slots but no more than a number
 * equal to half your maximum (round up). Once you use this feature, you can't
 * do so again until you finish a Long Rest." */
export function magicalCunningUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || !canUseMagicalCunning(c.warlockLevel, c.magicalCunningUsed)) return {}
  return { magicalCunningUsed: true }
}

/** Mystic Arcanum: mark spell level as used this LR.
 * SRD: "You can cast your arcanum spell once without expending a spell slot,
 * and you must finish a Long Rest before you can cast it in this way again." */
export function mysticArcanumUpdate(c: DndContext, spellLevel: number): Partial<DndContext> {
  if (isIncapacitated(c) || c.warlockLevel < 11) return {}
  if (!canUseMysticArcanum(spellLevel, c.mysticArcanumUsed)) return {}
  return { mysticArcanumUsed: new Set([...c.mysticArcanumUsed, spellLevel]) }
}

// -- Lifecycle --

export function warlockStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.warlockLevel === 0) return {}
  return {}
}

/** SRD: Pact Magic slots recover on Short Rest (handled by caller).
 * Magical Cunning recharges on Long Rest only — no SR reset. */
export function warlockShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.warlockLevel === 0) return {}
  return {}
}

/** SRD: Long Rest resets Magical Cunning and all Mystic Arcanum uses. */
export function warlockLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.warlockLevel === 0) return {}
  return { mysticArcanumUsed: new Set<number>(), magicalCunningUsed: false }
}

// -- Init --

export function initialWarlockState(warlockLevel: number) {
  return {
    warlockLevel,
    mysticArcanumUsed: new Set<number>(),
    magicalCunningUsed: false
  }
}
