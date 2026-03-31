import { canUseCunningAction } from "#/features/class-rogue.ts"
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
  if (c.movementRemaining !== c.effectiveSpeed) return {} // SRD: "only if you haven't moved"
  return {
    bonusActionUsed: true,
    steadyAimUsedThisTurn: true,
    effectiveSpeed: movementFeet(0),
    movementRemaining: movementFeet(0)
  }
}

// -- Cunning Action (L2+) --

export function cunningActionDashUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || !canUseCunningAction(c.rogueLevel, c.bonusActionUsed)) return {}
  return {
    bonusActionUsed: true,
    movementRemaining: movementFeet(c.movementRemaining + c.effectiveSpeed)
  }
}

export function cunningActionDisengageUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || !canUseCunningAction(c.rogueLevel, c.bonusActionUsed)) return {}
  return { bonusActionUsed: true, disengaged: true }
}

export function cunningActionHideUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || !canUseCunningAction(c.rogueLevel, c.bonusActionUsed)) return {}
  return { bonusActionUsed: true }
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
