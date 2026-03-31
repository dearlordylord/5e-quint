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
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext, SorcererClassState } from "#/machine-types.ts"

const SORCEROUS_RESTORATION_LEVEL = 5

function s(c: DndContext) {
  return c.classStates.sorcerer!
}

// -- Action Updates --

/**
 * Font of Magic: convert spell slot to sorcery points.
 * SRD: "You can expend a spell slot to gain a number of Sorcery Points
 * equal to the slot's level (no action required)."
 */
export function convertSlotToPointsUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  const ss = s(c)
  if (isIncapacitated(c) || ss.level < 2) return {}
  if (slotLevel < 1 || slotLevel > 9) return {}
  const currentSlots = [...c.slotsCurrent]
  const idx = slotLevel - 1
  if (idx >= currentSlots.length || currentSlots[idx] <= 0) return {}
  currentSlots[idx] = currentSlots[idx] - 1
  const newPts = Math.min(ss.sorceryPoints + slotLevel, ss.sorceryPointsMax)
  return {
    slotsCurrent: currentSlots,
    ...updateClass(c, "sorcerer", { sorceryPoints: newPts })
  }
}

/**
 * Font of Magic: convert sorcery points to spell slot.
 * SRD: "As a Bonus Action, you can transform unexpended Sorcery Points
 * into one spell slot." Max slot level 5.
 */
export function convertPointsToSlotUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  const ss = s(c)
  if (isIncapacitated(c) || ss.level < 2 || c.bonusActionUsed) return {}
  if (slotLevel < 1 || slotLevel > 5) return {}
  const cost = slotCreationCost(slotLevel)
  if (cost === 0 || ss.sorceryPoints < cost) return {}
  const currentSlots = [...c.slotsCurrent]
  const idx = slotLevel - 1
  if (idx >= currentSlots.length || currentSlots[idx] >= c.slotsMax[idx]) return {}
  currentSlots[idx] = currentSlots[idx] + 1
  return {
    bonusActionUsed: true,
    slotsCurrent: currentSlots,
    ...updateClass(c, "sorcerer", { sorceryPoints: ss.sorceryPoints - cost })
  }
}

// -- Lifecycle --

const INNATE_SORCERY_DURATION = 10

export function sorcererStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const ss = c.classStates.sorcerer
  if (!ss || ss.level === 0) return {}
  const metamagicReset: Partial<SorcererClassState> = {
    metamagicUsedThisCast: new Set<MetamagicOption>(),
    apotheosisUsedThisTurn: false
  }
  if (ss.innateSorceryActive && ss.innateSorceryTurnsRemaining > 0) {
    const remaining = ss.innateSorceryTurnsRemaining - 1
    if (remaining === 0)
      return updateClass(c, "sorcerer", {
        ...metamagicReset,
        innateSorceryTurnsRemaining: 0,
        innateSorceryActive: false
      })
    return updateClass(c, "sorcerer", { ...metamagicReset, innateSorceryTurnsRemaining: remaining })
  }
  return updateClass(c, "sorcerer", metamagicReset)
}

export function sorcererShortRestUpdate(c: DndContext): Partial<DndContext> {
  const ss = c.classStates.sorcerer
  if (!ss || ss.level === 0) return {}
  if (ss.level >= SORCEROUS_RESTORATION_LEVEL && !ss.sorcerousRestorationUsed) {
    const HALVE = 2
    const regain = Math.floor(ss.level / HALVE)
    return updateClass(c, "sorcerer", {
      sorceryPoints: Math.min(ss.sorceryPoints + regain, ss.sorceryPointsMax),
      sorcerousRestorationUsed: true
    })
  }
  return {}
}

export function sorcererLongRestUpdate(c: DndContext): Partial<DndContext> {
  const ss = c.classStates.sorcerer
  if (!ss || ss.level === 0) return {}
  const result = tsSorcererLongRest({ sorcererLevel: ss.level })
  return updateClass(c, "sorcerer", {
    sorceryPoints: result.sorceryPoints,
    sorceryPointsMax: result.sorceryPointsMax,
    innateSorceryActive: result.innateSorceryActive,
    innateSorceryCharges: result.innateSorceryCharges,
    innateSorceryTurnsRemaining: 0,
    sorcerousRestorationUsed: false,
    metamagicUsedThisCast: new Set<MetamagicOption>(),
    apotheosisUsedThisTurn: false
  })
}

// -- Innate Sorcery --

export function innateSorceryUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c)) return {}
  const ss = s(c)
  const state = {
    innateSorceryActive: ss.innateSorceryActive,
    innateSorceryCharges: ss.innateSorceryCharges,
    sorceryPoints: ss.sorceryPoints,
    sorcererLevel: ss.level,
    bonusActionUsed: c.bonusActionUsed
  }
  if (!canUseInnateSorcery(state)) return {}
  const result = tsUseInnateSorcery(state)
  return {
    bonusActionUsed: true,
    ...updateClass(c, "sorcerer", {
      innateSorceryActive: result.innateSorceryActive,
      innateSorceryCharges: result.innateSorceryCharges,
      innateSorceryTurnsRemaining: INNATE_SORCERY_DURATION,
      sorceryPoints: result.sorceryPoints
    })
  }
}

// -- Metamagic --

export function useMetamagicUpdate(c: DndContext, option: string): Partial<DndContext> {
  if (isIncapacitated(c)) return {}
  if (!METAMAGIC_OPTIONS.includes(option as MetamagicOption)) return {}
  const ss = s(c)
  const state = {
    sorcererLevel: ss.level,
    sorceryPoints: ss.sorceryPoints,
    bonusActionUsed: c.bonusActionUsed,
    nonCantripActionSpellCast: c.nonCantripActionSpellCast,
    metamagicUsedThisCast: ss.metamagicUsedThisCast,
    apotheosisUsedThisTurn: ss.apotheosisUsedThisTurn,
    innateSorceryActive: ss.innateSorceryActive
  }
  if (!canUseMetamagic(state, option as MetamagicOption)) return {}
  const result = tsUseMetamagic(state, option as MetamagicOption)
  return {
    bonusActionUsed: result.bonusActionUsed,
    ...updateClass(c, "sorcerer", {
      sorceryPoints: result.sorceryPoints,
      metamagicUsedThisCast: result.metamagicUsedThisCast,
      apotheosisUsedThisTurn: result.apotheosisUsedThisTurn
    })
  }
}

// -- Init --

export function initialSorcererState(sorcererLevel: number): SorcererClassState {
  const spMax = sorceryPointsMax(sorcererLevel)
  return {
    level: sorcererLevel,
    sorceryPoints: spMax,
    sorceryPointsMax: spMax,
    sorcerousRestorationUsed: false,
    innateSorceryActive: false,
    innateSorceryCharges: 2,
    innateSorceryTurnsRemaining: 0,
    metamagicUsedThisCast: new Set<MetamagicOption>(),
    apotheosisUsedThisTurn: false
  }
}
