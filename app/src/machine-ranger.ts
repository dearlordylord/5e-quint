import {
  canUseNaturesVeil,
  canUseTireless,
  favoredEnemyFreeUses,
  naturesVeilMaxCharges,
  tirelessMaxCharges,
  tirelessTempHp
} from "#/features/class-ranger.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"
import { tempHp } from "#/types.ts"

export function rangerExtraAttacks(rangerLevel: number): number {
  return rangerLevel >= 5 ? 1 : 0
}

// -- Action Updates --

export function useFreeHuntersMarkUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.rangerLevel < 1 || c.huntersMarkFreeUses <= 0) return {}
  return { huntersMarkFreeUses: c.huntersMarkFreeUses - 1 }
}

export function useTirelessUpdate(c: DndContext, d8Roll: number): Partial<DndContext> {
  if (isIncapacitated(c) || !canUseTireless(c.rangerLevel, c.tirelessCharges)) return {}
  if (c.actionsRemaining <= 0) return {}
  const thp = tirelessTempHp(d8Roll, c.tirelessMax)
  return {
    tirelessCharges: c.tirelessCharges - 1,
    actionsRemaining: c.actionsRemaining - 1,
    tempHp: tempHp(thp)
  }
}

export function useNaturesVeilUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || !canUseNaturesVeil(c.rangerLevel, c.naturesVeilCharges, !c.bonusActionUsed)) return {}
  return {
    naturesVeilCharges: c.naturesVeilCharges - 1,
    bonusActionUsed: true,
    invisible: true
  }
}

// -- Lifecycle --

export function rangerStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.rangerLevel === 0) return {}
  return {}
}

export function rangerShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.rangerLevel === 0) return {}
  return {}
}

export function rangerLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.rangerLevel === 0) return {}
  return {
    huntersMarkFreeUses: favoredEnemyFreeUses(c.rangerLevel),
    tirelessCharges: c.tirelessMax,
    naturesVeilCharges: c.naturesVeilMax
  }
}

// -- Init --

export function initialRangerState(rangerLevel: number, wisMod?: number) {
  const wm = wisMod ?? 0
  const tMax = rangerLevel >= 10 ? tirelessMaxCharges(wm) : 0
  const nvMax = rangerLevel >= 14 ? naturesVeilMaxCharges(wm) : 0
  return {
    rangerLevel,
    huntersMarkFreeUses: favoredEnemyFreeUses(rangerLevel),
    tirelessCharges: tMax,
    tirelessMax: tMax,
    naturesVeilCharges: nvMax,
    naturesVeilMax: nvMax
  }
}
