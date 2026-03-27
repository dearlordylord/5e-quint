import { removeAe } from "#/machine-endturn.ts"
import {
  addIncapSource,
  computeTakeDamage,
  type ConditionFlag,
  damageAtZeroTransition,
  effectiveMaxHp,
  EMPTY_DMG_SET,
  removeIncapSource,
  resolveDeathSave
} from "#/machine-helpers.ts"
import type { StartTurnEffect, TurnPhaseCtx, TurnPhaseResult } from "#/machine-types.ts"
import type { ActiveEffect } from "#/types.ts"
import { deathSaveCount, hp, tempHp } from "#/types.ts"

function decrementDurations(aes: ReadonlyArray<ActiveEffect>): ReadonlyArray<ActiveEffect> {
  return aes.map((ae) => ({ ...ae, turnsRemaining: ae.turnsRemaining - 1 }))
}

function clearExpiredStart(aes: ReadonlyArray<ActiveEffect>): ReadonlyArray<ActiveEffect> {
  return aes.filter((a) => !(a.expiresAt === "start" && a.turnsRemaining <= 0))
}

function hasEffect(aes: ReadonlyArray<ActiveEffect>, spellId: string): boolean {
  return aes.some((a) => a.spellId === spellId && a.turnsRemaining > 0)
}

export function computeStartTurn(
  ctx: TurnPhaseCtx,
  deathSaveRoll: number | undefined,
  effects: ReadonlyArray<StartTurnEffect>,
  deathSaveRoll2?: number,
  fighterLevel?: number
): TurnPhaseResult {
  const conditions: Partial<Record<ConditionFlag, boolean>> = {}
  let incap = ctx.incapacitatedSources
  let conc = ctx.concentrationSpellId
  let h = ctx.hp
  let th = ctx.tempHp
  let dead = ctx.dead
  let stable = ctx.stable
  let dsSucc = ctx.deathSaves.successes as number
  let dsFail = ctx.deathSaves.failures as number

  // 1. Decrement durations + clear expired AtStartOfTurn
  let ae = clearExpiredStart(decrementDurations(ctx.activeEffects))

  // 2. Death save (if applicable) — Defy Death (Champion L18) applied
  if (h === 0 && !stable && !dead && deathSaveRoll != null) {
    let effectiveRoll = deathSaveRoll
    if ((fighterLevel ?? 0) >= 18 && deathSaveRoll2 != null) {
      effectiveRoll = Math.max(effectiveRoll, deathSaveRoll2)
    }
    if ((fighterLevel ?? 0) >= 18 && effectiveRoll >= 18) {
      effectiveRoll = 20
    }
    const ds = resolveDeathSave(effectiveRoll, dsSucc, dsFail)
    if (ds.regainsConsciousness) {
      h = 1
      conditions.unconscious = false
      incap = removeIncapSource(incap, "unconscious")
      dsSucc = 0
      dsFail = 0
      stable = false
    } else if (ds.isDead) {
      dead = true
      dsFail = ds.newFailures
      dsSucc = ds.newSuccesses
    } else if (ds.isStabilized) {
      stable = true
      dsSucc = 0
      dsFail = 0
    } else {
      dsSucc = ds.newSuccesses
      dsFail = ds.newFailures
    }
    if (dead && conc) {
      ae = removeAe(ae, conc)
      conc = ""
    }
  }

  // 3. Process start-of-turn effects (surviving effects only)
  for (const eff of effects) {
    if (dead) break
    if (!hasEffect(ae, eff.spellId)) continue

    if (eff.saveResult) {
      ae = removeAe(ae, eff.spellId)
    }

    if (eff.healAmount > 0) {
      const prevHp = h
      h = Math.min(h + eff.healAmount, effectiveMaxHp(ctx.maxHp))
      if (prevHp === 0 && h > 0) {
        conditions.unconscious = false
        incap = removeIncapSource(incap, "unconscious")
        dsSucc = 0
        dsFail = 0
        stable = false
      }
    }

    if (eff.tempHpAmount > 0) {
      th = eff.tempHpAmount
    }

    if (eff.damageAmount > 0) {
      const prevHp = h
      const r = computeTakeDamage(
        h,
        ctx.maxHp,
        th,
        eff.damageAmount,
        eff.damageType,
        EMPTY_DMG_SET,
        EMPTY_DMG_SET,
        EMPTY_DMG_SET
      )
      h = r.newHp
      th = r.newTempHp

      const dz = damageAtZeroTransition(prevHp, h, r.dmgThrough, r.overflow, r.effMax, dsFail, stable, dead)
      dead = dz.dead
      stable = dz.stable
      dsFail = dz.newDeathFailures
      if (dz.unconscious) {
        conditions.unconscious = true
        conditions.prone = true
      }
      if (dz.addIncap) incap = addIncapSource(incap, "unconscious")

      if (conc && (dead || (h === 0 && prevHp > 0) || !eff.conSaveSucceeded)) {
        ae = removeAe(ae, conc)
        conc = ""
      }
    }
  }

  return {
    conditions,
    activeEffects: ae,
    concentrationSpellId: conc,
    hp: hp(h),
    incapacitatedSources: incap,
    tempHp: tempHp(th),
    dead,
    stable,
    deathSaves: { successes: deathSaveCount(dsSucc), failures: deathSaveCount(dsFail) }
  }
}
