import { slotCreationCost, sorceryPointsMax } from "#/features/class-sorcerer.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"

// -- Action Updates --

/**
 * Font of Magic: convert spell slot to sorcery points.
 * SRD: "You can expend a spell slot to gain a number of Sorcery Points
 * equal to the slot's level (no action required)."
 */
export function convertSlotToPointsUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  if (isIncapacitated(c) || c.sorcererLevel < 2) return {}
  if (slotLevel < 1 || slotLevel > 9) return {}
  const currentSlots = [...c.slotsCurrent]
  const idx = slotLevel - 1
  if (idx >= currentSlots.length || currentSlots[idx] <= 0) return {}
  if (c.sorceryPoints >= c.sorceryPointsMax) return {}
  currentSlots[idx] = currentSlots[idx] - 1
  const newPts = Math.min(c.sorceryPoints + slotLevel, c.sorceryPointsMax)
  return {
    slotsCurrent: currentSlots,
    sorceryPoints: newPts
  }
}

/**
 * Font of Magic: convert sorcery points to spell slot.
 * SRD: "As a Bonus Action, you can transform unexpended Sorcery Points
 * into one spell slot." Max slot level 5.
 */
export function convertPointsToSlotUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  if (isIncapacitated(c) || c.sorcererLevel < 2 || c.bonusActionUsed) return {}
  if (slotLevel < 1 || slotLevel > 5) return {}
  const cost = slotCreationCost(slotLevel)
  if (cost === 0 || c.sorceryPoints < cost) return {}
  const currentSlots = [...c.slotsCurrent]
  const idx = slotLevel - 1
  if (idx >= currentSlots.length || currentSlots[idx] >= c.slotsMax[idx]) return {}
  currentSlots[idx] = currentSlots[idx] + 1
  return {
    bonusActionUsed: true,
    slotsCurrent: currentSlots,
    sorceryPoints: c.sorceryPoints - cost
  }
}

// -- Lifecycle --

export function sorcererStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.sorcererLevel === 0) return {}
  return {}
}

export function sorcererShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.sorcererLevel === 0) return {}
  return {}
}

export function sorcererLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.sorcererLevel === 0) return {}
  const spMax = sorceryPointsMax(c.sorcererLevel)
  return { sorceryPoints: spMax, sorceryPointsMax: spMax }
}

// -- Init --

export function initialSorcererState(sorcererLevel: number) {
  const spMax = sorceryPointsMax(sorcererLevel)
  return {
    sorcererLevel,
    sorceryPoints: spMax,
    sorceryPointsMax: spMax
  }
}
