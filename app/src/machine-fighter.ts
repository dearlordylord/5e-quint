import {
  actionSurgeMaxCharges,
  canUseActionSurge,
  canUseIndomitable,
  canUseSecondWind,
  canUseTacticalMind,
  fighterLongRest as tsFighterLongRest,
  fighterShortRest as tsFighterShortRest,
  heroicWarriorInspiration,
  indomitableMaxCharges,
  secondWindMaxCharges,
  useActionSurge as tsUseActionSurge,
  useIndomitable as tsUseIndomitable,
  useSecondWind as tsUseSecondWind,
  useTacticalMind as tsUseTacticalMind
} from "#/features/class-fighter.ts"
import { effectiveMaxHp } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"
import { hp } from "#/types.ts"

// -- Action Updates --

export function secondWindUpdate(c: DndContext, d10Roll: number): Partial<DndContext> {
  const swState = {
    hp: c.hp,
    maxHp: effectiveMaxHp(c.maxHp),
    secondWindCharges: c.secondWindCharges,
    bonusActionUsed: c.bonusActionUsed
  }
  if (!canUseSecondWind(swState) || isIncapacitated(c)) return {}
  const r = tsUseSecondWind(swState, { fighterLevel: c.fighterLevel, d10Roll }, c.effectiveSpeed)
  const bonusMove =
    c.fighterLevel >= 5 ? { bonusMovementRemaining: r.tacticalShiftDistance, bonusMovementOAFree: true } : {}
  return { hp: hp(r.hp), secondWindCharges: r.secondWindCharges, bonusActionUsed: r.bonusActionUsed, ...bonusMove }
}

export function actionSurgeUpdate(c: DndContext): Partial<DndContext> {
  const s = {
    actionSurgeCharges: c.actionSurgeCharges,
    actionSurgeUsedThisTurn: c.actionSurgeUsedThisTurn,
    actionsRemaining: c.actionsRemaining
  }
  if (!canUseActionSurge(s) || isIncapacitated(c)) return {}
  return { ...tsUseActionSurge(s) }
}

export function indomitableUpdate(c: DndContext): Partial<DndContext> {
  if (!canUseIndomitable(c.fighterLevel, c.indomitableCharges)) return {}
  return { indomitableCharges: tsUseIndomitable(c.indomitableCharges, 0).indomitableCharges }
}

export function tacticalMindUpdate(c: DndContext, boostedCheckSucceeds: boolean): Partial<DndContext> {
  if (!canUseTacticalMind(c.secondWindCharges, c.fighterLevel, true) || isIncapacitated(c)) return {}
  if (!boostedCheckSucceeds) return {}
  return {
    secondWindCharges: tsUseTacticalMind({
      secondWindCharges: c.secondWindCharges,
      originalCheckTotal: 0,
      dc: 0,
      d10Roll: 0
    }).secondWindCharges
  }
}

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

// -- Init --

export function initialFighterState(fighterLevel: number) {
  const swMax = secondWindMaxCharges(fighterLevel)
  const asMax = actionSurgeMaxCharges(fighterLevel)
  const indMax = indomitableMaxCharges(fighterLevel)
  return {
    secondWindCharges: swMax,
    secondWindMax: swMax,
    actionSurgeCharges: asMax,
    actionSurgeMax: asMax,
    actionSurgeUsedThisTurn: false,
    indomitableCharges: indMax,
    indomitableMax: indMax,
    heroicInspiration: false
  }
}
