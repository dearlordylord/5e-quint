import { wildShapeMaxCharges } from "#/features/class-druid.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"
import { hp } from "#/types.ts"

// -- Actions --

/** SRD 5.2.1: "you retain your Hit Points" + "you gain Temporary Hit Points equal to your
 * Druid level." No separate beast HP pool (5.1 had one with spillover — removed in 5.2.1). */
export function enterWildShapeUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.druidLevel < 2 || c.wildShapeCharges <= 0 || c.bonusActionUsed || c.inWildShape) return {}
  return {
    bonusActionUsed: true,
    wildShapeCharges: c.wildShapeCharges - 1,
    inWildShape: true,
    tempHp: hp(c.druidLevel)
  }
}

export function exitWildShapeUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || !c.inWildShape || c.bonusActionUsed) return {}
  return { bonusActionUsed: true, inWildShape: false }
}

/** Wild Resurgence part 1: expend spell slot → regain WS charge.
 * SRD L5: "if you have no uses of Wild Shape left, you can give yourself
 * one use by expending a spell slot (no action required)." */
export function wildResurgenceChargeUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  if (isIncapacitated(c) || c.druidLevel < 5 || c.wildShapeCharges !== 0) return {}
  const idx = slotLevel - 1
  if (idx < 0 || idx >= c.slotsCurrent.length || c.slotsCurrent[idx] <= 0) return {}
  const newSlots = [...c.slotsCurrent]
  newSlots[idx] = newSlots[idx] - 1
  return { slotsCurrent: newSlots, wildShapeCharges: c.wildShapeCharges + 1 }
}

/** Wild Resurgence part 2: expend WS charge → regain L1 spell slot.
 * SRD: "you can't do so again until you finish a Long Rest." */
export function wildResurgenceSlotUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.druidLevel < 5 || c.wildShapeCharges <= 0 || c.wildResurgenceSlotUsedThisLR) return {}
  if (c.slotsCurrent[0] >= c.slotsMax[0]) return {}
  const newSlots = [...c.slotsCurrent]
  newSlots[0] = newSlots[0] + 1
  return { slotsCurrent: newSlots, wildShapeCharges: c.wildShapeCharges - 1, wildResurgenceSlotUsedThisLR: true }
}

// -- Lifecycle --

export function druidStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.druidLevel === 0) return {}
  return {}
}

/** SRD: "You regain one expended use when you finish a Short Rest" */
export function druidShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.druidLevel === 0) return {}
  return { wildShapeCharges: Math.min(c.wildShapeCharges + 1, c.wildShapeMax) }
}

/** SRD: "you regain all expended uses when you finish a Long Rest" */
export function druidLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.druidLevel === 0) return {}
  return { wildShapeCharges: c.wildShapeMax, inWildShape: false, wildResurgenceSlotUsedThisLR: false }
}

// -- Init --

export function initialDruidState(druidLevel: number) {
  const wsMax = wildShapeMaxCharges(druidLevel)
  return {
    druidLevel,
    wildShapeCharges: wsMax,
    wildShapeMax: wsMax,
    inWildShape: false,
    wildResurgenceSlotUsedThisLR: false
  }
}
