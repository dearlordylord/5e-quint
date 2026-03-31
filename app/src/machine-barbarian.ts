import type { RageState } from "#/features/class-barbarian.ts"
import {
  canEnterRage as tsCanEnterRage,
  canUseBrutalStrike,
  canUseIntimidatingPresence as tsCanUseIP,
  canUseRelentlessRage,
  pCheckRageMaintenance as tsCheckMaintenance,
  pEndRage as tsPEndRage,
  pEnterRage as tsPEnterRage,
  pExtendRageWithBA as tsPExtendRageBA,
  pMarkAttackOrForcedSave as tsPMarkAttack,
  rageMaxCharges,
  relentlessRageResult,
  restoreIntimidatingPresenceWithRage as tsRestoreIP,
  useIntimidatingPresence as tsUseIP
} from "#/features/class-barbarian.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"
import { hp } from "#/types.ts"

function toRageState(c: DndContext): RageState {
  return {
    raging: c.raging,
    rageCharges: c.rageCharges,
    rageMaxCharges: c.rageMaxCharges,
    rageTurnsRemaining: c.rageTurnsRemaining,
    attackedOrForcedSaveThisTurn: c.attackedOrForcedSaveThisTurn,
    rageExtendedWithBA: c.rageExtendedWithBA,
    concentrationSpellId: c.concentrationSpellId
  }
}

function fromRageState(rs: RageState): Partial<DndContext> {
  return {
    raging: rs.raging,
    rageCharges: rs.rageCharges,
    rageTurnsRemaining: rs.rageTurnsRemaining,
    attackedOrForcedSaveThisTurn: rs.attackedOrForcedSaveThisTurn,
    rageExtendedWithBA: rs.rageExtendedWithBA
  }
}

export function enterRageUpdate(c: DndContext): Partial<DndContext> {
  // Quint parity: canEnterRage checks charges > 0 AND not already raging
  if (c.bonusActionUsed || isIncapacitated(c) || c.raging || !tsCanEnterRage(c.rageCharges, "none")) return {}
  return { bonusActionUsed: true, ...fromRageState(tsPEnterRage(toRageState(c))) }
}

export function endRageUpdate(c: DndContext): Partial<DndContext> {
  if (!c.raging) return {}
  return { ...fromRageState(tsPEndRage(toRageState(c))), recklessThisTurn: false }
}

export function extendRageBAUpdate(c: DndContext): Partial<DndContext> {
  if (!c.raging || c.bonusActionUsed) return {}
  return { bonusActionUsed: true, ...fromRageState(tsPExtendRageBA(toRageState(c))) }
}

export function markAttackOrForcedSaveUpdate(c: DndContext): Partial<DndContext> {
  if (!c.raging) return {}
  return fromRageState(tsPMarkAttack(toRageState(c)))
}

export function declareRecklessUpdate(c: DndContext): Partial<DndContext> {
  if (c.recklessThisTurn || c.barbarianLevel < 2) return {}
  return { recklessThisTurn: true }
}

export function useIntimidatingPresenceUpdate(c: DndContext): Partial<DndContext> {
  if (!tsCanUseIP(c.barbarianLevel, c.bonusActionUsed, c.intimidatingPresenceUsed)) return {}
  return tsUseIP()
}

export function restoreIntimidatingPresenceUpdate(c: DndContext): Partial<DndContext> {
  return tsRestoreIP(c.rageCharges, c.intimidatingPresenceUsed) ?? {}
}

export function brutalStrikeUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || !canUseBrutalStrike(c.recklessThisTurn, c.barbarianLevel, true)) return {}
  if (c.brutalStrikeUsedThisTurn) return {}
  return { brutalStrikeUsedThisTurn: true }
}

export function relentlessRageUpdate(c: DndContext, conSaveSucceeded: boolean): Partial<DndContext> {
  if (isIncapacitated(c) || !canUseRelentlessRage(c.barbarianLevel, c.raging)) return {}
  const result = relentlessRageResult(conSaveSucceeded, c.barbarianLevel)
  return {
    relentlessRageTimesUsed: c.relentlessRageTimesUsed + 1,
    ...(result.survived ? { hp: hp(result.newHp) } : {})
  }
}

/** Start-of-turn: check maintenance (uses LAST turn's flags), reset per-turn flags, decrement turns. */
export function barbarianStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.barbarianLevel === 0) return {}
  const rs = tsCheckMaintenance(toRageState(c), c.barbarianLevel)
  const turns = rs.raging && rs.rageTurnsRemaining > 0 ? rs.rageTurnsRemaining - 1 : rs.rageTurnsRemaining
  return {
    ...fromRageState(rs),
    rageTurnsRemaining: turns,
    recklessThisTurn: false,
    frenzyUsedThisTurn: false,
    brutalStrikeUsedThisTurn: false
  }
}

export function barbarianShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.barbarianLevel === 0) return {}
  return { rageCharges: Math.min(c.rageCharges + 1, c.rageMaxCharges), relentlessRageTimesUsed: 0 }
}

export function barbarianLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.barbarianLevel === 0) return {}
  return {
    ...fromRageState(tsPEndRage(toRageState(c))),
    rageCharges: c.rageMaxCharges,
    relentlessRageTimesUsed: 0,
    intimidatingPresenceUsed: false,
    recklessThisTurn: false,
    frenzyUsedThisTurn: false,
    brutalStrikeUsedThisTurn: false
  }
}

export function initialBarbarianState(barbarianLevel: number) {
  const maxCharges = rageMaxCharges(barbarianLevel)
  return {
    barbarianLevel,
    raging: false,
    rageCharges: maxCharges,
    rageMaxCharges: maxCharges,
    rageTurnsRemaining: 0,
    attackedOrForcedSaveThisTurn: false,
    rageExtendedWithBA: false,
    recklessThisTurn: false,
    frenzyUsedThisTurn: false,
    intimidatingPresenceUsed: false,
    relentlessRageTimesUsed: 0,
    brutalStrikeUsedThisTurn: false
  }
}

export { standardExtraAttacks as barbarianExtraAttacks } from "#/machine-helpers.ts"
