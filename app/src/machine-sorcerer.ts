import {
  canUseInnateSorcery,
  canUseMetamagic,
  METAMAGIC_OPTIONS,
  type MetamagicOption,
  slotCreationCost,
  sorcererLongRest as tsSorcererLongRest,
  sorceryPointsMax,
  useInnateSorcery as tsUseInnateSorcery,
  useMetamagic as tsUseMetamagic
} from "#/features/class-sorcerer.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"

const SORCEROUS_RESTORATION_LEVEL = 5

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

const INNATE_SORCERY_DURATION = 10

export function sorcererStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.sorcererLevel === 0) return {}
  const metamagicReset: Partial<DndContext> = {
    metamagicUsedThisCast: new Set<string>(),
    apotheosisUsedThisTurn: false
  }
  if (c.innateSorceryActive && c.innateSorceryTurnsRemaining > 0) {
    const remaining = c.innateSorceryTurnsRemaining - 1
    if (remaining === 0) return { ...metamagicReset, innateSorceryTurnsRemaining: 0, innateSorceryActive: false }
    return { ...metamagicReset, innateSorceryTurnsRemaining: remaining }
  }
  return metamagicReset
}

export function sorcererShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.sorcererLevel === 0) return {}
  // Quint parity: fire at L5+ when not yet used, even if SP is at max
  // (canUseSorcerousRestoration has an extra SP-full guard that Quint lacks)
  if (c.sorcererLevel >= SORCEROUS_RESTORATION_LEVEL && !c.sorcerousRestorationUsed) {
    const HALVE = 2
    const regain = Math.floor(c.sorcererLevel / HALVE)
    return {
      sorceryPoints: Math.min(c.sorceryPoints + regain, c.sorceryPointsMax),
      sorcerousRestorationUsed: true
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
    innateSorceryTurnsRemaining: 0,
    sorcerousRestorationUsed: false,
    metamagicUsedThisCast: new Set<string>(),
    apotheosisUsedThisTurn: false
  }
}

// -- Innate Sorcery --

export function innateSorceryUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c)) return {}
  const state = {
    innateSorceryActive: c.innateSorceryActive,
    innateSorceryCharges: c.innateSorceryCharges,
    sorceryPoints: c.sorceryPoints,
    sorcererLevel: c.sorcererLevel,
    bonusActionUsed: c.bonusActionUsed
  }
  if (!canUseInnateSorcery(state)) return {}
  const result = tsUseInnateSorcery(state)
  return {
    bonusActionUsed: true,
    innateSorceryActive: result.innateSorceryActive,
    innateSorceryCharges: result.innateSorceryCharges,
    innateSorceryTurnsRemaining: INNATE_SORCERY_DURATION,
    sorceryPoints: result.sorceryPoints
  }
}

// -- Metamagic --

export function useMetamagicUpdate(c: DndContext, option: string): Partial<DndContext> {
  if (isIncapacitated(c)) return {}
  if (!METAMAGIC_OPTIONS.includes(option as MetamagicOption)) return {}
  const state = {
    sorcererLevel: c.sorcererLevel,
    sorceryPoints: c.sorceryPoints,
    bonusActionUsed: c.bonusActionUsed,
    nonCantripActionSpellCast: c.nonCantripActionSpellCast,
    metamagicUsedThisCast: c.metamagicUsedThisCast,
    apotheosisUsedThisTurn: c.apotheosisUsedThisTurn,
    innateSorceryActive: c.innateSorceryActive
  }
  if (!canUseMetamagic(state, option as MetamagicOption)) return {}
  const result = tsUseMetamagic(state, option as MetamagicOption)
  return {
    sorceryPoints: result.sorceryPoints,
    metamagicUsedThisCast: result.metamagicUsedThisCast,
    apotheosisUsedThisTurn: result.apotheosisUsedThisTurn,
    bonusActionUsed: result.bonusActionUsed
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
    innateSorceryCharges: 2,
    innateSorceryTurnsRemaining: 0,
    metamagicUsedThisCast: new Set<string>(),
    apotheosisUsedThisTurn: false
  }
}
