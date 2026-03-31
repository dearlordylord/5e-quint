import {
  bardicInspirationMaxCharges,
  hasFontOfInspiration,
  hasPeerlessSkill,
  superiorInspirationRestore
} from "#/features/class-bard.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import { expendSlot } from "#/machine-spells.ts"
import type { DndContext } from "#/machine-types.ts"

// -- Action Updates --

export function useBardicInspirationUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.bardLevel < 1 || c.bardicInspirationCharges <= 0 || c.bonusActionUsed) return {}
  return {
    bardicInspirationCharges: c.bardicInspirationCharges - 1,
    bonusActionUsed: true
  }
}

export function useCuttingWordsUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.bardLevel < 3 || c.bardicInspirationCharges <= 0 || !c.reactionAvailable) return {}
  return {
    bardicInspirationCharges: c.bardicInspirationCharges - 1,
    reactionAvailable: false
  }
}

export function useFontSlotRestoreUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  if (isIncapacitated(c) || !hasFontOfInspiration(c.bardLevel)) return {}
  if (c.bardicInspirationCharges >= c.bardicInspirationMax) return {}
  const newSlots = expendSlot(c.slotsCurrent, slotLevel)
  if (newSlots === c.slotsCurrent) return {} // no slot available
  return {
    bardicInspirationCharges: c.bardicInspirationCharges + 1,
    slotsCurrent: newSlots
  }
}

export function usePeerlessSkillUpdate(c: DndContext, success: boolean): Partial<DndContext> {
  if (isIncapacitated(c) || !hasPeerlessSkill(c.bardLevel) || c.bardicInspirationCharges <= 0) return {}
  // Only spend charge on success
  if (success) return { bardicInspirationCharges: c.bardicInspirationCharges - 1 }
  return {}
}

// -- Lifecycle --

export function bardStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.bardLevel === 0) return {}
  // Superior Inspiration L18: restore charges to min 2 on initiative
  const restored = superiorInspirationRestore(c.bardLevel, c.bardicInspirationCharges)
  if (restored !== c.bardicInspirationCharges) return { bardicInspirationCharges: restored }
  return {}
}

export function bardShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.bardLevel === 0) return {}
  // Font of Inspiration L5: full recharge on short rest
  if (hasFontOfInspiration(c.bardLevel)) return { bardicInspirationCharges: c.bardicInspirationMax }
  return {}
}

export function bardLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.bardLevel === 0) return {}
  return { bardicInspirationCharges: c.bardicInspirationMax }
}

// -- Init --

export function initialBardState(bardLevel: number, chaMod?: number) {
  const cm = chaMod ?? 0
  const maxCharges = bardLevel >= 1 ? bardicInspirationMaxCharges(cm) : 0
  return {
    bardLevel,
    bardicInspirationCharges: maxCharges,
    bardicInspirationMax: maxCharges
  }
}
