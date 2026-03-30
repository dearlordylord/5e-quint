import { survivorHeroicRally } from "#/features/class-fighter.ts"
import { removeAe } from "#/machine-endturn.ts"
import {
  addIncapSource,
  ALL_DAMAGE_TYPES,
  applyDefyDeath,
  calculateEffectiveSpeed,
  computeTakeDamage,
  type ConditionFlag,
  damageAtZeroTransition,
  effectiveMaxHp,
  removeIncapSource,
  resolveDeathSave
} from "#/machine-helpers.ts"
import { monsterStartTurnUpdate } from "#/machine-monster.ts"
import {
  asStartTurn,
  type DndContext,
  type DndEvent,
  INITIAL_TURN_STATE,
  type StartTurnEffect,
  type TurnPhaseCtx,
  type TurnPhaseResult
} from "#/machine-types.ts"
import type { ActiveEffect } from "#/types.ts"
import { deathSaveCount, hp, movementFeet, tempHp } from "#/types.ts"

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
  effects: ReadonlyArray<StartTurnEffect>
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

  // 2. Death save (if applicable)
  if (h === 0 && !stable && !dead && deathSaveRoll != null) {
    const ds = resolveDeathSave(deathSaveRoll, dsSucc, dsFail)
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
  // See ASSUMPTIONS.md A16: no early exit on death. Saves still remove effects,
  // tempHp grants still apply, but heal/damage are no-ops on dead creatures.
  for (const eff of effects) {
    if (!hasEffect(ae, eff.spellId)) continue

    if (eff.saveResult) {
      ae = removeAe(ae, eff.spellId)
    }

    // Quint pHeal: if (s.dead) s — no-op
    if (!dead && eff.healAmount > 0) {
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

    // Quint pGrantTempHp: no dead check — tempHp set unconditionally (if !keepOld)
    if (eff.tempHpAmount > 0) {
      th = eff.tempHpAmount
    }

    // Quint pTakeDamage: if (s.dead) s — no-op
    if (!dead && eff.damageAmount > 0) {
      const prevHp = h
      const effResist = ctx.petrified ? ALL_DAMAGE_TYPES : eff.resistances
      const r = computeTakeDamage(
        h,
        ctx.maxHp,
        th,
        eff.damageAmount,
        eff.damageType,
        eff.immunities,
        effResist,
        eff.vulnerabilities
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

/** Full initTurn computation: death save, start-of-turn effects, speed, rally, monster resources. */
export function computeInitTurn(c: DndContext, e: DndEvent): Record<string, unknown> {
  const ev = asStartTurn(e)
  const effectiveDsRoll =
    ev.deathSaveRoll != null ? applyDefyDeath(c.fighterLevel, ev.deathSaveRoll, ev.deathSaveRoll2) : undefined
  const { conditions: conds, ...cr } = computeStartTurn(c, effectiveDsRoll, ev.startOfTurnEffects)
  const speed = calculateEffectiveSpeed({
    armorPenalty: ev.armorPenalty,
    baseSpeed: ev.baseSpeed,
    callerSpeedModifier: ev.callerSpeedModifier,
    exhaustion: c.exhaustion,
    grappled: conds.grappled ?? c.grappled,
    grappledTargetTwoSizesSmaller: ev.grappledTargetTwoSizesSmaller,
    isGrappling: ev.isGrappling,
    restrained: conds.restrained ?? c.restrained
  })
  const rallyHeal = survivorHeroicRally(c.fighterLevel, cr.hp as number, c.maxHp, ev.conMod ?? 0)
  const resultHp = rallyHeal > 0 ? Math.min((cr.hp as number) + rallyHeal, effectiveMaxHp(c.maxHp)) : cr.hp
  const mrsUpdates =
    c.creatureKind === "Monster"
      ? monsterStartTurnUpdate(c.legendaryActionsMax, c.rechargeAvailable, ev.rechargedAbilities)
      : {}
  return {
    ...conds,
    ...cr,
    ...INITIAL_TURN_STATE,
    hp: hp(resultHp),
    effectiveSpeed: movementFeet(speed),
    extraAttacksRemaining: ev.extraAttacks,
    movementRemaining: movementFeet(speed),
    ...mrsUpdates
  }
}
