import { wildShapeMaxCharges } from "#/features/class-druid.ts"
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext, DruidClassState } from "#/machine-types.ts"
import { tempHp } from "#/types.ts"

function d(c: DndContext) {
  return c.classStates.druid!
}

// -- Actions --

/** SRD 5.2.1: "you retain your Hit Points" + "you gain Temporary Hit Points equal to your
 * Druid level." No separate beast HP pool (5.1 had one with spillover — removed in 5.2.1). */
export function enterWildShapeUpdate(c: DndContext): Partial<DndContext> {
  const ds = d(c)
  if (isIncapacitated(c) || ds.level < 2 || ds.wildShapeCharges <= 0 || c.bonusActionUsed || ds.inWildShape) return {}
  return {
    bonusActionUsed: true,
    tempHp: tempHp(ds.level),
    ...updateClass(c, "druid", { wildShapeCharges: ds.wildShapeCharges - 1, inWildShape: true })
  }
}

export function exitWildShapeUpdate(c: DndContext): Partial<DndContext> {
  const ds = d(c)
  if (isIncapacitated(c) || !ds.inWildShape || c.bonusActionUsed) return {}
  return { bonusActionUsed: true, ...updateClass(c, "druid", { inWildShape: false }) }
}

/** Wild Resurgence part 1: expend spell slot → regain WS charge.
 * SRD L5: "if you have no uses of Wild Shape left, you can give yourself
 * one use by expending a spell slot (no action required)." */
export function wildResurgenceChargeUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  const ds = d(c)
  if (isIncapacitated(c) || ds.level < 5 || ds.wildShapeCharges !== 0) return {}
  const idx = slotLevel - 1
  if (idx < 0 || idx >= c.slotsCurrent.length || c.slotsCurrent[idx] <= 0) return {}
  const newSlots = [...c.slotsCurrent]
  newSlots[idx] = newSlots[idx] - 1
  return { slotsCurrent: newSlots, ...updateClass(c, "druid", { wildShapeCharges: ds.wildShapeCharges + 1 }) }
}

/** Wild Resurgence part 2: expend WS charge → regain L1 spell slot.
 * SRD: "you can't do so again until you finish a Long Rest." */
export function wildResurgenceSlotUpdate(c: DndContext): Partial<DndContext> {
  const ds = d(c)
  if (isIncapacitated(c) || ds.level < 5 || ds.wildShapeCharges <= 0 || ds.wildResurgenceSlotUsedThisLR) return {}
  if (c.slotsCurrent[0] >= c.slotsMax[0]) return {}
  const newSlots = [...c.slotsCurrent]
  newSlots[0] = newSlots[0] + 1
  return {
    slotsCurrent: newSlots,
    ...updateClass(c, "druid", { wildShapeCharges: ds.wildShapeCharges - 1, wildResurgenceSlotUsedThisLR: true })
  }
}

// -- Lifecycle --

export function druidStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const ds = c.classStates.druid
  if (!ds || ds.level === 0) return {}
  return {}
}

/** SRD: "You regain one expended use when you finish a Short Rest" */
export function druidShortRestUpdate(c: DndContext): Partial<DndContext> {
  const ds = c.classStates.druid
  if (!ds || ds.level === 0) return {}
  return updateClass(c, "druid", { wildShapeCharges: Math.min(ds.wildShapeCharges + 1, ds.wildShapeMax) })
}

/** SRD: "you regain all expended uses when you finish a Long Rest" */
export function druidLongRestUpdate(c: DndContext): Partial<DndContext> {
  const ds = c.classStates.druid
  if (!ds || ds.level === 0) return {}
  return updateClass(c, "druid", {
    wildShapeCharges: ds.wildShapeMax,
    inWildShape: false,
    wildResurgenceSlotUsedThisLR: false
  })
}

// -- Init --

export function initialDruidState(druidLevel: number): DruidClassState {
  const wsMax = wildShapeMaxCharges(druidLevel)
  return {
    level: druidLevel,
    wildShapeCharges: wsMax,
    wildShapeMax: wsMax,
    inWildShape: false,
    wildResurgenceSlotUsedThisLR: false
  }
}
