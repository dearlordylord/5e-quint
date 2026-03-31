import {
  canUseInnateSorcery,
  canUseSorcerousRestoration,
  slotCreationCost,
  sorcererLongRest as tsSorcererLongRest,
  sorcerousRestoration as tsSorcerousRestoration,
  sorceryPointsMax,
  useInnateSorcery as tsUseInnateSorcery
} from "#/features/class-sorcerer.ts"
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
  if (
    canUseSorcerousRestoration({
      sorceryPoints: c.sorceryPoints,
      sorceryPointsMax: c.sorceryPointsMax,
      sorcererLevel: c.sorcererLevel,
      sorcerousRestorationUsed: c.sorcerousRestorationUsed
    })
  ) {
    const result = tsSorcerousRestoration({
      sorceryPoints: c.sorceryPoints,
      sorceryPointsMax: c.sorceryPointsMax,
      sorcererLevel: c.sorcererLevel,
      sorcerousRestorationUsed: c.sorcerousRestorationUsed
    })
    return {
      sorceryPoints: result.sorceryPoints,
      sorcerousRestorationUsed: result.sorcerousRestorationUsed
    }
  }
  return {}
}

export function sorcererLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.sorcererLevel === 0) return {}
  const result = tsSorcererLongRest({ sorcererLevel: c.sorcererLevel })
  return {
    sorceryPoints: result.sorceryPoints,
    sorceryPointsMax: result.sorceryPointsMax,
    innateSorceryActive: result.innateSorceryActive,
    innateSorceryCharges: result.innateSorceryCharges,
    sorcerousRestorationUsed: false
  }
}

// -- Innate Sorcery --

export function innateSorceryUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c)) return {}
  if (
    !canUseInnateSorcery({
      innateSorceryActive: c.innateSorceryActive,
      innateSorceryCharges: c.innateSorceryCharges,
      sorceryPoints: c.sorceryPoints,
      sorcererLevel: c.sorcererLevel,
      bonusActionUsed: c.bonusActionUsed
    })
  )
    return {}
  const result = tsUseInnateSorcery({
    innateSorceryActive: c.innateSorceryActive,
    innateSorceryCharges: c.innateSorceryCharges,
    sorceryPoints: c.sorceryPoints,
    sorcererLevel: c.sorcererLevel,
    bonusActionUsed: c.bonusActionUsed
  })
  return {
    bonusActionUsed: true,
    innateSorceryActive: result.innateSorceryActive,
    innateSorceryCharges: result.innateSorceryCharges,
    sorceryPoints: result.sorceryPoints
  }
}

// -- Init --

export function initialSorcererState(sorcererLevel: number) {
  const spMax = sorceryPointsMax(sorcererLevel)
  return {
    sorcererLevel,
    sorceryPoints: spMax,
    sorceryPointsMax: spMax,
    sorcerousRestorationUsed: false,
    innateSorceryActive: false,
    innateSorceryCharges: 2
  }
}
