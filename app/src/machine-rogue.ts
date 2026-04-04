import { assert } from "#/assert.ts"
import { canUseCunningAction, maxCunningStrikeEffects } from "#/features/class-rogue.ts"
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext, RogueClassState } from "#/machine-types.ts"
import type { ClassLevel } from "#/types.ts"
import { movementFeet } from "#/types.ts"

function r(c: DndContext) {
  return c.classStates.rogue!
}

// -- Action Updates --

export function sneakAttackUpdate(c: DndContext): Partial<DndContext> {
  const rs = r(c)
  assert(
    !isIncapacitated(c) && rs.level >= 1 && !rs.sneakAttackUsedThisTurn,
    "guard: canSneakAttack should have prevented this"
  )
  return updateClass(c, "rogue", { sneakAttackUsedThisTurn: true })
}

export function steadyAimUpdate(c: DndContext): Partial<DndContext> {
  const rs = r(c)
  assert(
    !isIncapacitated(c) &&
      rs.level >= 3 &&
      !rs.steadyAimUsedThisTurn &&
      !c.bonusActionUsed &&
      c.movementRemaining === c.effectiveSpeed,
    "guard: canSteadyAim should have prevented this"
  )
  return {
    bonusActionUsed: true,
    effectiveSpeed: movementFeet(0),
    movementRemaining: movementFeet(0),
    ...updateClass(c, "rogue", { steadyAimUsedThisTurn: true })
  }
}

// -- Cunning Action (L2+) --

export function cunningActionDashUpdate(c: DndContext): Partial<DndContext> {
  assert(
    !isIncapacitated(c) && canUseCunningAction(r(c).level, c.bonusActionUsed),
    "guard: canCunningAction should have prevented this"
  )
  return {
    bonusActionUsed: true,
    movementRemaining: movementFeet(c.movementRemaining + c.effectiveSpeed)
  }
}

export function cunningActionDisengageUpdate(c: DndContext): Partial<DndContext> {
  assert(
    !isIncapacitated(c) && canUseCunningAction(r(c).level, c.bonusActionUsed),
    "guard: canCunningAction should have prevented this"
  )
  return { bonusActionUsed: true, disengaged: true }
}

export function cunningActionHideUpdate(c: DndContext): Partial<DndContext> {
  assert(
    !isIncapacitated(c) && canUseCunningAction(r(c).level, c.bonusActionUsed),
    "guard: canCunningAction should have prevented this"
  )
  return { bonusActionUsed: true }
}

// -- Uncanny Dodge (L5+) --

/** Uncanny Dodge: consume reaction. Damage halving is caller-managed.
 * SRD L5: "you can use your Reaction to halve the attack's damage" */
export function uncannyDodgeUpdate(c: DndContext): Partial<DndContext> {
  assert(
    !isIncapacitated(c) && r(c).level >= 5 && c.reactionAvailable,
    "guard: canUncannyDodge should have prevented this"
  )
  return { reactionAvailable: false }
}

// -- Cunning Strike (L5+) --

/** Cunning Strike: increment uses counter (1 at L5, up to 2 at L11+).
 * SRD L5: "you can add one of the following Cunning Strike effects."
 * SRD L11: "You can use up to two Cunning Strike effects." */
export function cunningStrikeUpdate(c: DndContext): Partial<DndContext> {
  const rs = r(c)
  assert(
    !isIncapacitated(c) &&
      rs.level >= 5 &&
      rs.sneakAttackUsedThisTurn &&
      rs.cunningStrikeUsesThisTurn < maxCunningStrikeEffects(rs.level),
    "guard: canCunningStrike should have prevented this"
  )
  return updateClass(c, "rogue", { cunningStrikeUsesThisTurn: rs.cunningStrikeUsesThisTurn + 1 })
}

// -- Lifecycle --

export function rogueStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const rs = c.classStates.rogue
  if (!rs || rs.level === 0) return {}
  return updateClass(c, "rogue", {
    sneakAttackUsedThisTurn: false,
    steadyAimUsedThisTurn: false,
    cunningStrikeUsesThisTurn: 0
  })
}

export function rogueShortRestUpdate(c: DndContext): Partial<DndContext> {
  const rs = c.classStates.rogue
  if (!rs || rs.level === 0) return {}
  return {}
}

export function rogueLongRestUpdate(c: DndContext): Partial<DndContext> {
  const rs = c.classStates.rogue
  if (!rs || rs.level === 0) return {}
  return {}
}

// -- Init --

export function initialRogueState(rogueLevel: ClassLevel): RogueClassState {
  return {
    level: rogueLevel,
    sneakAttackUsedThisTurn: false,
    steadyAimUsedThisTurn: false,
    cunningStrikeUsesThisTurn: 0
  }
}
