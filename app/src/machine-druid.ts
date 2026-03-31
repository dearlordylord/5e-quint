import { wildShapeMaxCharges } from "#/features/class-druid.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"

// -- Actions --

export function enterWildShapeUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.druidLevel < 2 || c.wildShapeCharges <= 0 || c.bonusActionUsed || c.inWildShape) return {}
  return { bonusActionUsed: true, wildShapeCharges: c.wildShapeCharges - 1, inWildShape: true }
}

export function exitWildShapeUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || !c.inWildShape || c.bonusActionUsed) return {}
  return { bonusActionUsed: true, inWildShape: false }
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
  return { wildShapeCharges: c.wildShapeMax, inWildShape: false }
}

// -- Init --

export function initialDruidState(druidLevel: number) {
  const wsMax = wildShapeMaxCharges(druidLevel)
  return {
    druidLevel,
    wildShapeCharges: wsMax,
    wildShapeMax: wsMax,
    inWildShape: false
  }
}
