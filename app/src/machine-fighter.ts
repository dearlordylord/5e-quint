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
import { effectiveMaxHp, updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext, FighterClassState } from "#/machine-types.ts"
import { hp } from "#/types.ts"

// -- Convenience accessor --

function f(c: DndContext) {
  return c.classStates.fighter!
}

// -- Action Updates --

export function secondWindUpdate(c: DndContext, d10Roll: number): Partial<DndContext> {
  const fs = f(c)
  const swState = {
    hp: c.hp,
    maxHp: effectiveMaxHp(c.maxHp),
    secondWindCharges: fs.secondWindCharges,
    bonusActionUsed: c.bonusActionUsed
  }
  if (!canUseSecondWind(swState) || isIncapacitated(c)) return {}
  const r = tsUseSecondWind(swState, { fighterLevel: fs.level, d10Roll }, c.effectiveSpeed)
  const bonusMove = fs.level >= 5 ? { bonusMovementRemaining: r.tacticalShiftDistance, bonusMovementOAFree: true } : {}
  return {
    hp: hp(r.hp),
    ...updateClass(c, "fighter", { secondWindCharges: r.secondWindCharges }),
    bonusActionUsed: r.bonusActionUsed,
    ...bonusMove
  }
}

export function actionSurgeUpdate(c: DndContext): Partial<DndContext> {
  const fs = f(c)
  const s = {
    actionSurgeCharges: fs.actionSurgeCharges,
    actionSurgeUsedThisTurn: fs.actionSurgeUsedThisTurn,
    actionsRemaining: c.actionsRemaining
  }
  if (!canUseActionSurge(s) || isIncapacitated(c)) return {}
  const r = tsUseActionSurge(s)
  return {
    actionsRemaining: r.actionsRemaining,
    actionSurgeActionPending: true,
    ...updateClass(c, "fighter", {
      actionSurgeCharges: r.actionSurgeCharges,
      actionSurgeUsedThisTurn: r.actionSurgeUsedThisTurn
    })
  }
}

export function indomitableUpdate(c: DndContext): Partial<DndContext> {
  const fs = f(c)
  if (!canUseIndomitable(fs.level, fs.indomitableCharges)) return {}
  return updateClass(c, "fighter", {
    indomitableCharges: tsUseIndomitable(fs.indomitableCharges, 0).indomitableCharges
  })
}

export function tacticalMindUpdate(c: DndContext, boostedCheckSucceeds: boolean): Partial<DndContext> {
  const fs = f(c)
  if (!canUseTacticalMind(fs.secondWindCharges, fs.level, true) || isIncapacitated(c)) return {}
  if (!boostedCheckSucceeds) return {}
  return updateClass(c, "fighter", {
    secondWindCharges: tsUseTacticalMind({
      secondWindCharges: fs.secondWindCharges,
      originalCheckTotal: 0,
      dc: 0,
      d10Roll: 0
    }).secondWindCharges
  })
}

// -- Lifecycle --

export function fighterStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const fs = c.classStates.fighter
  if (!fs || fs.level === 0) return {}
  return updateClass(c, "fighter", {
    actionSurgeUsedThisTurn: false,
    ...(heroicWarriorInspiration(fs.level, fs.heroicInspiration) ? { heroicInspiration: true } : {})
  })
}

export function fighterShortRestUpdate(c: DndContext): Partial<DndContext> {
  const fs = c.classStates.fighter
  if (!fs || fs.level === 0) return {}
  const r = tsFighterShortRest({
    secondWindCharges: fs.secondWindCharges,
    secondWindMax: fs.secondWindMax,
    actionSurgeCharges: fs.actionSurgeCharges,
    actionSurgeMax: fs.actionSurgeMax
  })
  return updateClass(c, "fighter", r)
}

export function fighterLongRestUpdate(c: DndContext): Partial<DndContext> {
  const fs = c.classStates.fighter
  if (!fs || fs.level === 0) return {}
  const r = tsFighterLongRest({
    secondWindCharges: fs.secondWindCharges,
    secondWindMax: fs.secondWindMax,
    actionSurgeCharges: fs.actionSurgeCharges,
    actionSurgeMax: fs.actionSurgeMax,
    indomitableMax: fs.indomitableMax
  })
  return updateClass(c, "fighter", r)
}

// -- Init --

export function initialFighterState(fighterLevel: number): FighterClassState {
  const swMax = secondWindMaxCharges(fighterLevel)
  const asMax = actionSurgeMaxCharges(fighterLevel)
  const indMax = indomitableMaxCharges(fighterLevel)
  return {
    level: fighterLevel,
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
