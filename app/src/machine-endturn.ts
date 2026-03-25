import { addDeathFailures, addIncapSource, computeTakeDamage, removeConditionUpdate } from "#/machine-helpers.ts"
import type { EndTurnDamage, EndTurnSave } from "#/machine-types.ts"
import type { ActiveEffect, Condition, DamageType, DeathSaves, ExpiryPhase, HP, IncapSource, TempHP } from "#/types.ts"
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

type ConditionFlag = Exclude<Condition, "incapacitated">

export interface EndTurnResult {
  readonly conditions: Readonly<Partial<Record<ConditionFlag, boolean>>>
  readonly activeEffects: ReadonlyArray<ActiveEffect>
  readonly concentrationSpellId: string
  readonly hp: HP
  readonly incapacitatedSources: ReadonlySet<IncapSource>
  readonly tempHp: TempHP
  readonly dead: boolean
  readonly stable: boolean
  readonly deathSaves: DeathSaves
}

interface EndTurnCtx {
  readonly hp: number
  readonly maxHp: number
  readonly tempHp: number
  readonly concentrationSpellId: string
  readonly activeEffects: ReadonlyArray<ActiveEffect>
  readonly incapacitatedSources: ReadonlySet<IncapSource>
  readonly dead: boolean
  readonly stable: boolean
  readonly deathSaves: DeathSaves
}

const EMPTY_DMG_SET: ReadonlySet<DamageType> = new Set()

export function computeEndTurn(
  ctx: EndTurnCtx,
  saves: ReadonlyArray<EndTurnSave>,
  damages: ReadonlyArray<EndTurnDamage>
): EndTurnResult {
  const conditions: Partial<Record<ConditionFlag, boolean>> = {}
  let incap = ctx.incapacitatedSources
  let conc = ctx.concentrationSpellId
  let h = ctx.hp
  let th = ctx.tempHp
  let dead = ctx.dead
  let stable = ctx.stable
  let deathFailures = ctx.deathSaves.failures
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

    if (r.dmgThrough > 0) {
      if (prevHp > 0 && h === 0) {
        // Dropping from alive to 0 HP
        if (r.overflow >= r.effMax) {
          dead = true
        } else {
          conditions.unconscious = true
          conditions.prone = true
          incap = addIncapSource(incap, "unconscious")
          stable = false
        }
      } else if (prevHp === 0) {
        // Already at 0 HP: death save failures or instant death
        if (r.dmgThrough >= r.effMax) {
          dead = true
        } else {
          const df = addDeathFailures(deathFailures, false)
          deathFailures = deathSaveCount(df.newFailures)
          stable = false
          if (df.isDead) dead = true
        }
      }
    }

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
    deathSaves: { successes: deathSuccesses, failures: deathFailures }
  }
}
