import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"
import { movementFeet } from "#/types.ts"

// -- Action Updates --

export function sneakAttackUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.rogueLevel < 1 || c.sneakAttackUsedThisTurn) return {}
  return { sneakAttackUsedThisTurn: true }
}

export function steadyAimUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.rogueLevel < 3 || c.steadyAimUsedThisTurn || c.bonusActionUsed) return {}
  return {
    bonusActionUsed: true,
    steadyAimUsedThisTurn: true,
    effectiveSpeed: movementFeet(0),
    movementRemaining: movementFeet(0)
  }
}

// -- Lifecycle --

export function rogueStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.rogueLevel === 0) return {}
  return { sneakAttackUsedThisTurn: false, steadyAimUsedThisTurn: false }
}

export function rogueShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.rogueLevel === 0) return {}
  return {}
}

export function rogueLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.rogueLevel === 0) return {}
  return {}
}

// -- Init --

export function initialRogueState(rogueLevel: number) {
  return {
    rogueLevel,
    sneakAttackUsedThisTurn: false,
    steadyAimUsedThisTurn: false
  }
}
