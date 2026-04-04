import { assert } from "#/assert.ts"
import type { FocusPoolState } from "#/features/class-monk.ts"
import {
  pExpendFocus as tsExpendFocus,
  pFocusMax,
  pRestoreFocus,
  pRestoreFocusLongRest,
  pUncannyMetabolism as tsUncannyMetabolism
} from "#/features/class-monk.ts"
import { wholenessOfBodyMaxCharges } from "#/features/class-monk-features.ts"
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext, MonkClassState } from "#/machine-types.ts"
import type { ClassLevel, ResourceCount } from "#/types.ts"
import { hp, movementFeet, resourceCount } from "#/types.ts"

function m(c: DndContext) {
  return c.classStates.monk!
}

function toFocusPool(c: DndContext): FocusPoolState {
  const ms = m(c)
  return {
    focusPoints: ms.focusPoints,
    focusMax: ms.focusMax,
    uncannyMetabolismUsed: ms.uncannyMetabolismUsed
  }
}

// -- Action Updates --

export function flurryOfBlowsUpdate(c: DndContext): Partial<DndContext> {
  const ms = m(c)
  assert(!c.bonusActionUsed && !isIncapacitated(c) && ms.level >= 2, "guard: canMonkFocusBA should have prevented this")
  const r = tsExpendFocus(toFocusPool(c), 1)
  assert(r.success, "guard: canMonkFocusBA should have checked focus points")
  return { bonusActionUsed: true, ...updateClass(c, "monk", { focusPoints: resourceCount(r.focusPoints) }) }
}

export function patientDefenseFreeUpdate(c: DndContext): Partial<DndContext> {
  assert(
    !c.bonusActionUsed && !isIncapacitated(c) && m(c).level >= 2,
    "guard: canMonkFreeBA should have prevented this"
  )
  return { bonusActionUsed: true, disengaged: true }
}

export function patientDefenseFocusUpdate(c: DndContext): Partial<DndContext> {
  assert(
    !c.bonusActionUsed && !isIncapacitated(c) && m(c).level >= 2,
    "guard: canMonkFocusBA should have prevented this"
  )
  const r = tsExpendFocus(toFocusPool(c), 1)
  assert(r.success, "guard: canMonkFocusBA should have checked focus points")
  return {
    bonusActionUsed: true,
    dodging: true,
    disengaged: true,
    ...updateClass(c, "monk", { focusPoints: resourceCount(r.focusPoints) })
  }
}

export function stepOfTheWindFreeUpdate(c: DndContext): Partial<DndContext> {
  assert(
    !c.bonusActionUsed && !isIncapacitated(c) && m(c).level >= 2,
    "guard: canMonkFreeBA should have prevented this"
  )
  return { bonusActionUsed: true, movementRemaining: movementFeet(c.movementRemaining + c.effectiveSpeed) }
}

export function stepOfTheWindFocusUpdate(c: DndContext): Partial<DndContext> {
  assert(
    !c.bonusActionUsed && !isIncapacitated(c) && m(c).level >= 2,
    "guard: canMonkFocusBA should have prevented this"
  )
  const r = tsExpendFocus(toFocusPool(c), 1)
  assert(r.success, "guard: canMonkFocusBA should have checked focus points")
  return {
    bonusActionUsed: true,
    disengaged: true,
    movementRemaining: movementFeet(c.movementRemaining + c.effectiveSpeed),
    ...updateClass(c, "monk", { focusPoints: resourceCount(r.focusPoints) })
  }
}

export function stunningStrikeUpdate(c: DndContext): Partial<DndContext> {
  const ms = m(c)
  assert(
    !isIncapacitated(c) && ms.level >= 5 && !ms.stunningStrikeUsedThisTurn && ms.focusPoints >= 1,
    "guard: canStunningStrike should have prevented this"
  )
  return updateClass(c, "monk", { focusPoints: resourceCount(ms.focusPoints - 1), stunningStrikeUsedThisTurn: true })
}

export function wholenessOfBodyUpdate(c: DndContext, healRoll: number): Partial<DndContext> {
  const ms = m(c)
  assert(
    !isIncapacitated(c) && ms.level >= 6 && ms.wholenessCharges > 0 && !c.bonusActionUsed,
    "guard: canWholenessOfBody should have prevented this"
  )
  const healAmount = Math.max(1, healRoll)
  return {
    bonusActionUsed: true,
    hp: hp(Math.min(c.hp + healAmount, c.maxHp)),
    ...updateClass(c, "monk", { wholenessCharges: resourceCount(ms.wholenessCharges - 1) })
  }
}

export function uncannyMetabolismUpdate(c: DndContext, healRoll: number): Partial<DndContext> {
  const ms = m(c)
  assert(
    !isIncapacitated(c) && ms.level >= 2 && !ms.uncannyMetabolismUsed,
    "guard: canUncannyMetabolism should have prevented this"
  )
  const r = tsUncannyMetabolism(toFocusPool(c), ms.level, healRoll)
  if (!r.triggered) return {}
  return {
    hp: hp(Math.min(c.hp + r.hpHealed, c.maxHp)),
    ...updateClass(c, "monk", { focusPoints: resourceCount(r.focusPoints), uncannyMetabolismUsed: true })
  }
}

// -- Lifecycle --

export function monkStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const ms = c.classStates.monk
  if (!ms || ms.level === 0) return {}
  return updateClass(c, "monk", { stunningStrikeUsedThisTurn: false })
}

export function monkShortRestUpdate(c: DndContext): Partial<DndContext> {
  const ms = c.classStates.monk
  if (!ms || ms.level === 0) return {}
  const pool = pRestoreFocus(toFocusPool(c))
  return updateClass(c, "monk", { focusPoints: resourceCount(pool.focusPoints) })
}

export function monkLongRestUpdate(c: DndContext): Partial<DndContext> {
  const ms = c.classStates.monk
  if (!ms || ms.level === 0) return {}
  const pool = pRestoreFocusLongRest(toFocusPool(c))
  return updateClass(c, "monk", {
    focusPoints: resourceCount(pool.focusPoints),
    uncannyMetabolismUsed: false,
    wholenessCharges: ms.wholenessMax
  })
}

// -- Init --

export function initialMonkState(monkLevel: ClassLevel, wholenessMax?: ResourceCount): MonkClassState {
  const fm = resourceCount(pFocusMax(monkLevel))
  const wMax = resourceCount(monkLevel >= 6 ? wholenessOfBodyMaxCharges(wholenessMax ?? 0) : 0)
  return {
    level: monkLevel,
    focusPoints: fm,
    focusMax: fm,
    uncannyMetabolismUsed: false,
    stunningStrikeUsedThisTurn: false,
    wholenessCharges: wMax,
    wholenessMax: wMax
  }
}

export { standardExtraAttacks as monkExtraAttacks } from "#/machine-helpers.ts"
