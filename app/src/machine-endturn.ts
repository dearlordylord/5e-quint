import {
  addIncapSource,
  computeTakeDamage,
  type ConditionFlag,
  damageAtZeroTransition,
  EMPTY_DMG_SET,
  removeConditionUpdate
} from "#/machine-helpers.ts"
import type { EndTurnDamage, EndTurnSave, TurnPhaseCtx, TurnPhaseResult } from "#/machine-types.ts"
import type { ActiveEffect, ExpiryPhase } from "#/types.ts"
import { deathSaveCount, hp, tempHp } from "#/types.ts"

// --- Active effect helpers ---

export function addAe(
  aes: ReadonlyArray<ActiveEffect>,
  spellId: string,
  turnsRemaining: number,
  expiresAt: ExpiryPhase
): ReadonlyArray<ActiveEffect> {
  return [...aes.filter((ae) => ae.spellId !== spellId), { spellId, turnsRemaining, expiresAt }]
}

export function removeAe(aes: ReadonlyArray<ActiveEffect>, spellId: string): ReadonlyArray<ActiveEffect> {
  return aes.filter((ae) => ae.spellId !== spellId)
}

// --- END_TURN processing ---

export function computeEndTurn(
  ctx: TurnPhaseCtx,
  saves: ReadonlyArray<EndTurnSave>,
  damages: ReadonlyArray<EndTurnDamage>
): TurnPhaseResult {
  const conditions: Partial<Record<ConditionFlag, boolean>> = {}
  let incap = ctx.incapacitatedSources
  let conc = ctx.concentrationSpellId
  let h = ctx.hp
  let th = ctx.tempHp
  let dead = ctx.dead
  let stable = ctx.stable
  let deathFailures = ctx.deathSaves.failures as number
  const deathSuccesses = ctx.deathSaves.successes

  // Collect effect IDs to remove (saves + concentration break)
  const removeIds = new Set<string>()

  for (const save of saves) {
    if (save.saveSucceeded) {
      removeIds.add(save.spellId)
      for (const cond of save.conditionsToRemove) {
        const u = removeConditionUpdate(cond, incap)
        Object.assign(conditions, u.conditionFlags)
        incap = u.incapSources
      }
    }
  }

  for (const dmg of damages) {
    if (dead) break
    const prevHp = h
    const r = computeTakeDamage(
      h,
      ctx.maxHp,
      th,
      dmg.damage,
      dmg.damageType,
      EMPTY_DMG_SET,
      EMPTY_DMG_SET,
      EMPTY_DMG_SET
    )
    h = r.newHp
    th = r.newTempHp

    const dz = damageAtZeroTransition(prevHp, h, r.dmgThrough, r.overflow, r.effMax, deathFailures, stable, dead)
    dead = dz.dead
    stable = dz.stable
    deathFailures = dz.newDeathFailures
    if (dz.unconscious) {
      conditions.unconscious = true
      conditions.prone = true
    }
    if (dz.addIncap) incap = addIncapSource(incap, "unconscious")

    // Concentration handling
    if (conc && (dead || (h === 0 && prevHp > 0) || !dmg.conSaveSucceeded)) {
      removeIds.add(conc)
      conc = ""
    }
  }

  // Single pass: remove by ID + clear expired AtEndOfTurn
  const ae = ctx.activeEffects.filter(
    (a) => !removeIds.has(a.spellId) && !(a.expiresAt === "end" && a.turnsRemaining <= 0)
  )

  return {
    conditions,
    activeEffects: ae,
    concentrationSpellId: conc,
    hp: hp(h),
    incapacitatedSources: incap,
    tempHp: tempHp(th),
    dead,
    stable,
    deathSaves: { successes: deathSuccesses, failures: deathSaveCount(deathFailures) }
  }
}
