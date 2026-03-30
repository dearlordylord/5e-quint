import type { FocusPoolState } from "#/features/class-monk.ts"
import {
  pExpendFocus as tsExpendFocus,
  pFocusMax,
  pRestoreFocus,
  pRestoreFocusLongRest,
  pUncannyMetabolism as tsUncannyMetabolism
} from "#/features/class-monk.ts"
import { wholenessOfBodyMaxCharges } from "#/features/class-monk-features.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"
import { hp, movementFeet } from "#/types.ts"

function toFocusPool(c: DndContext): FocusPoolState {
  return {
    focusPoints: c.focusPoints,
    focusMax: c.focusMax,
    uncannyMetabolismUsed: c.uncannyMetabolismUsed
  }
}

// -- Action Updates --

export function flurryOfBlowsUpdate(c: DndContext): Partial<DndContext> {
  if (c.bonusActionUsed || isIncapacitated(c) || c.monkLevel < 2) return {}
  const r = tsExpendFocus(toFocusPool(c), 1)
  if (!r.success) return {}
  return { bonusActionUsed: true, focusPoints: r.focusPoints }
}

export function patientDefenseFreeUpdate(c: DndContext): Partial<DndContext> {
  if (c.bonusActionUsed || isIncapacitated(c) || c.monkLevel < 2) return {}
  return { bonusActionUsed: true, disengaged: true }
}

export function patientDefenseFocusUpdate(c: DndContext): Partial<DndContext> {
  if (c.bonusActionUsed || isIncapacitated(c) || c.monkLevel < 2) return {}
  const r = tsExpendFocus(toFocusPool(c), 1)
  if (!r.success) return {}
  return { bonusActionUsed: true, dodging: true, disengaged: true, focusPoints: r.focusPoints }
}

export function stepOfTheWindFreeUpdate(c: DndContext): Partial<DndContext> {
  if (c.bonusActionUsed || isIncapacitated(c) || c.monkLevel < 2) return {}
  return { bonusActionUsed: true, movementRemaining: movementFeet(c.movementRemaining + c.effectiveSpeed) }
}

export function stepOfTheWindFocusUpdate(c: DndContext): Partial<DndContext> {
  if (c.bonusActionUsed || isIncapacitated(c) || c.monkLevel < 2) return {}
  const r = tsExpendFocus(toFocusPool(c), 1)
  if (!r.success) return {}
  return {
    bonusActionUsed: true,
    disengaged: true,
    movementRemaining: movementFeet(c.movementRemaining + c.effectiveSpeed),
    focusPoints: r.focusPoints
  }
}

export function stunningStrikeUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.monkLevel < 5 || c.stunningStrikeUsedThisTurn || c.focusPoints < 1) return {}
  return { focusPoints: c.focusPoints - 1, stunningStrikeUsedThisTurn: true }
}

export function wholenessOfBodyUpdate(c: DndContext, healRoll: number): Partial<DndContext> {
  if (isIncapacitated(c) || c.monkLevel < 6 || c.wholenessCharges <= 0 || c.bonusActionUsed) return {}
  const healAmount = Math.max(1, healRoll)
  return {
    bonusActionUsed: true,
    hp: hp(Math.min(c.hp + healAmount, c.maxHp)),
    wholenessCharges: c.wholenessCharges - 1
  }
}

export function uncannyMetabolismUpdate(c: DndContext, healRoll: number): Partial<DndContext> {
  if (isIncapacitated(c) || c.monkLevel < 2 || c.uncannyMetabolismUsed) return {}
  const r = tsUncannyMetabolism(toFocusPool(c), c.monkLevel, healRoll)
  if (!r.triggered) return {}
  return {
    focusPoints: r.focusPoints,
    uncannyMetabolismUsed: true,
    hp: hp(Math.min(c.hp + r.hpHealed, c.maxHp))
  }
}

// -- Lifecycle --

export function monkStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.monkLevel === 0) return {}
  return { stunningStrikeUsedThisTurn: false }
}

export function monkShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.monkLevel === 0) return {}
  const pool = pRestoreFocus(toFocusPool(c))
  return { focusPoints: pool.focusPoints }
}

export function monkLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.monkLevel === 0) return {}
  const pool = pRestoreFocusLongRest(toFocusPool(c))
  return {
    focusPoints: pool.focusPoints,
    uncannyMetabolismUsed: false,
    wholenessCharges: c.wholenessMax
  }
}

// -- Init --

export function initialMonkState(monkLevel: number, wholenessMax?: number) {
  const fm = pFocusMax(monkLevel)
  const wMax = monkLevel >= 6 ? wholenessOfBodyMaxCharges(wholenessMax ?? 0) : 0
  return {
    monkLevel,
    focusPoints: fm,
    focusMax: fm,
    uncannyMetabolismUsed: false,
    stunningStrikeUsedThisTurn: false,
    wholenessCharges: wMax,
    wholenessMax: wMax
  }
}

export function monkExtraAttacks(monkLevel: number): number {
  return monkLevel >= 5 ? 1 : 0
}
