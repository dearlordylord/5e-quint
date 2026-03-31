import {
  canUseNaturesVeil,
  canUseTireless,
  favoredEnemyFreeUses,
  naturesVeilMaxCharges,
  tirelessMaxCharges,
  tirelessTempHp
} from "#/features/class-ranger.ts"
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext, RangerClassState } from "#/machine-types.ts"
import { tempHp } from "#/types.ts"

export { standardExtraAttacks as rangerExtraAttacks } from "#/machine-helpers.ts"

function r(c: DndContext) {
  return c.classStates.ranger!
}

// -- Action Updates --

export function useFreeHuntersMarkUpdate(c: DndContext): Partial<DndContext> {
  const rs = r(c)
  if (isIncapacitated(c) || rs.level < 1 || rs.huntersMarkFreeUses <= 0) return {}
  return updateClass(c, "ranger", { huntersMarkFreeUses: rs.huntersMarkFreeUses - 1 })
}

export function useTirelessUpdate(c: DndContext, d8Roll: number): Partial<DndContext> {
  const rs = r(c)
  if (isIncapacitated(c) || !canUseTireless(rs.level, rs.tirelessCharges)) return {}
  if (c.actionsRemaining <= 0) return {}
  const thp = tirelessTempHp(d8Roll, rs.tirelessMax)
  return {
    actionsRemaining: c.actionsRemaining - 1,
    tempHp: tempHp(thp),
    ...updateClass(c, "ranger", { tirelessCharges: rs.tirelessCharges - 1 })
  }
}

export function useNaturesVeilUpdate(c: DndContext): Partial<DndContext> {
  const rs = r(c)
  if (isIncapacitated(c) || !canUseNaturesVeil(rs.level, rs.naturesVeilCharges, !c.bonusActionUsed)) return {}
  return {
    bonusActionUsed: true,
    invisible: true,
    ...updateClass(c, "ranger", { naturesVeilCharges: rs.naturesVeilCharges - 1 })
  }
}

// -- Lifecycle --

export function rangerStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const rs = c.classStates.ranger
  if (!rs || rs.level === 0) return {}
  return {}
}

export function rangerShortRestUpdate(c: DndContext): Partial<DndContext> {
  const rs = c.classStates.ranger
  if (!rs || rs.level === 0) return {}
  return {}
}

export function rangerLongRestUpdate(c: DndContext): Partial<DndContext> {
  const rs = c.classStates.ranger
  if (!rs || rs.level === 0) return {}
  return updateClass(c, "ranger", {
    huntersMarkFreeUses: favoredEnemyFreeUses(rs.level),
    tirelessCharges: rs.tirelessMax,
    naturesVeilCharges: rs.naturesVeilMax
  })
}

// -- Init --

export function initialRangerState(rangerLevel: number, wisMod?: number): RangerClassState {
  const wm = wisMod ?? 0
  const tMax = rangerLevel >= 10 ? tirelessMaxCharges(wm) : 0
  const nvMax = rangerLevel >= 14 ? naturesVeilMaxCharges(wm) : 0
  return {
    level: rangerLevel,
    huntersMarkFreeUses: favoredEnemyFreeUses(rangerLevel),
    tirelessCharges: tMax,
    tirelessMax: tMax,
    naturesVeilCharges: nvMax,
    naturesVeilMax: nvMax
  }
}
