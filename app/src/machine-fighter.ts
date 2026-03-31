import {
  fighterLongRest as tsFighterLongRest,
  fighterShortRest as tsFighterShortRest,
  heroicWarriorInspiration
} from "#/features/class-fighter.ts"
import type { DndContext } from "#/machine-types.ts"

// -- Lifecycle --

export function fighterStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.fighterLevel === 0) return {}
  return {
    actionSurgeUsedThisTurn: false,
    ...(heroicWarriorInspiration(c.fighterLevel, c.heroicInspiration) ? { heroicInspiration: true } : {})
  }
}

export function fighterShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.fighterLevel === 0) return {}
  return tsFighterShortRest({
    secondWindCharges: c.secondWindCharges,
    secondWindMax: c.secondWindMax,
    actionSurgeCharges: c.actionSurgeCharges,
    actionSurgeMax: c.actionSurgeMax
  })
}

export function fighterLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.fighterLevel === 0) return {}
  return tsFighterLongRest({
    secondWindCharges: c.secondWindCharges,
    secondWindMax: c.secondWindMax,
    actionSurgeCharges: c.actionSurgeCharges,
    actionSurgeMax: c.actionSurgeMax,
    indomitableMax: c.indomitableMax
  })
}
