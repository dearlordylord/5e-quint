import { computeTakeDamage, removeConditionUpdate } from "#/machine-helpers.ts"
import type { EndTurnDamage, EndTurnSave } from "#/machine-types.ts"
import type { ActiveEffect, Condition, DamageType, ExpiryPhase, HP, IncapSource, TempHP } from "#/types.ts"
import { hp, tempHp } from "#/types.ts"

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
}

interface EndTurnCtx {
  readonly hp: number
  readonly maxHp: number
  readonly tempHp: number
  readonly exhaustion: number
  readonly concentrationSpellId: string
  readonly activeEffects: ReadonlyArray<ActiveEffect>
  readonly incapacitatedSources: ReadonlySet<IncapSource>
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
    const prevHp = h
    const r = computeTakeDamage(
      h,
      ctx.maxHp,
      th,
      ctx.exhaustion,
      dmg.damage,
      dmg.damageType,
      EMPTY_DMG_SET,
      EMPTY_DMG_SET,
      EMPTY_DMG_SET
    )
    h = r.newHp
    th = r.newTempHp
    if (conc) {
      if ((h === 0 && prevHp > 0) || !dmg.conSaveSucceeded) {
        removeIds.add(conc)
        conc = ""
      }
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
    tempHp: tempHp(th)
  }
}
