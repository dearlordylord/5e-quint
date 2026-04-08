import { Option } from "effect"

import {
  addIncapSource,
  ALL_DAMAGE_TYPES,
  computeTakeDamage,
  type ConditionFlag,
  damageAtZeroTransition,
  removeConditionUpdate
} from "#/machine-helpers.ts"
import type { TurnHookResolution, TurnPhaseCtx, TurnPhaseResult } from "#/machine-types.ts"
import type { ActiveEffect, Condition, CreatureId, DamageType, ExpiryPhase, SpellId } from "#/types.ts"
import { deathSaveCount, hp, tempHp } from "#/types.ts"

// --- Active effect helpers ---

export function addAe(
  aes: ReadonlyArray<ActiveEffect>,
  spellId: SpellId,
  turnsRemaining: number,
  expiresAt: ExpiryPhase,
  casterId: CreatureId,
  options: Partial<Omit<ActiveEffect, "spellId" | "turnsRemaining" | "expiresAt" | "casterId">> = {}
): ReadonlyArray<ActiveEffect> {
  return [
    ...aes.filter((ae) => ae.spellId !== spellId),
    { spellId, turnsRemaining, expiresAt, casterId, ...options }
  ]
}

export function removeAe(aes: ReadonlyArray<ActiveEffect>, spellId: SpellId): ReadonlyArray<ActiveEffect> {
  return aes.filter((ae) => ae.spellId !== spellId)
}

function aggregateDamageModifiers(
  aes: ReadonlyArray<ActiveEffect>,
  petrified: boolean,
): {
  readonly resistances: ReadonlySet<DamageType>
  readonly vulnerabilities: ReadonlySet<DamageType>
  readonly immunities: ReadonlySet<DamageType>
} {
  const resistances = new Set<DamageType>(petrified ? ALL_DAMAGE_TYPES : [])
  const vulnerabilities = new Set<DamageType>()
  const immunities = new Set<DamageType>()
  for (const effect of aes) {
    if (effect.grantedResistances) for (const damageType of effect.grantedResistances) resistances.add(damageType)
    if (effect.grantedVulnerabilities) for (const damageType of effect.grantedVulnerabilities) vulnerabilities.add(damageType)
    if (effect.grantedImmunities) for (const damageType of effect.grantedImmunities) immunities.add(damageType)
  }
  return { resistances, vulnerabilities, immunities }
}

function deriveEndTurnEffects(
  selfId: CreatureId,
  aes: ReadonlyArray<ActiveEffect>,
  runtimeResolutions: ReadonlyArray<TurnHookResolution> | undefined,
  petrified: boolean,
): ReadonlyArray<{
  readonly spellId: SpellId
  readonly saveSucceeded: boolean
  readonly conditionsToRemove: ReadonlyArray<Condition>
  readonly damageAmount: number
  readonly damageType: DamageType
  readonly conSaveSucceeded: boolean
  readonly resistances: ReadonlySet<DamageType>
  readonly vulnerabilities: ReadonlySet<DamageType>
  readonly immunities: ReadonlySet<DamageType>
}> {
  const overrides = new Map((runtimeResolutions ?? []).map((effect) => [effect.spellId, effect]))
  const damageMods = aggregateDamageModifiers(aes, petrified)
  return aes.flatMap((effect) => {
    if (effect.expiryOwnerId != null && effect.expiryOwnerId !== selfId) return []
    const hook = effect.endOfTurnHook
    if (hook == null) return []
    const override = overrides.get(effect.spellId)
    return [{
      spellId: effect.spellId,
      saveSucceeded: hook.removeOnSaveSuccess ? (override?.saveSucceeded ?? false) : false,
      conditionsToRemove: hook.conditionsToRemove ?? [],
      damageAmount: hook.damageAmount ?? 0,
      damageType: hook.damageType ?? "bludgeoning",
      conSaveSucceeded: hook.requiresConcentrationCheck ? (override?.conSaveSucceeded ?? true) : true,
      resistances: damageMods.resistances,
      vulnerabilities: damageMods.vulnerabilities,
      immunities: damageMods.immunities,
    }]
  })
}

// --- END_TURN processing ---

export function computeEndTurn(
  ctx: TurnPhaseCtx,
  runtimeResolutions: ReadonlyArray<TurnHookResolution> | undefined
): TurnPhaseResult {
  const selfId = ctx.selfId ?? ("" as CreatureId)
  const conditions: Partial<Record<ConditionFlag, boolean>> = {}
  let incap = ctx.incapacitatedSources
  let conc = ctx.concentrationSpellId
  let h = ctx.hp
  let th = ctx.tempHp
  let dead = ctx.dead
  let stable = ctx.stable
  let deathFailures = ctx.deathSaves.failures as number
  const deathSuccesses = ctx.deathSaves.successes

  const removeIds = new Set<SpellId>()
  const effects = deriveEndTurnEffects(selfId, ctx.activeEffects, runtimeResolutions, ctx.petrified)

  let unconscious = ctx.unconscious
  for (const effect of effects) {
    if (effect.saveSucceeded) {
      removeIds.add(effect.spellId)
      for (const cond of effect.conditionsToRemove) {
        const u = removeConditionUpdate(cond, incap, unconscious)
        Object.assign(conditions, u.conditionFlags)
        incap = u.incapSources
        if (cond === "unconscious") unconscious = false
      }
    }
  }

  // See ASSUMPTIONS.md A16: damage is no-op on dead creatures
  for (const effect of effects) {
    if (effect.damageAmount <= 0 || removeIds.has(effect.spellId)) continue
    if (dead) continue
    const prevHp = h
    const effResist = ctx.petrified ? ALL_DAMAGE_TYPES : effect.resistances
    const r = computeTakeDamage(
      h,
      ctx.maxHp,
      th,
      effect.damageAmount,
      effect.damageType,
      effect.immunities,
      effResist,
      effect.vulnerabilities
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
    if (Option.isSome(conc) && (dead || (h === 0 && prevHp > 0) || !effect.conSaveSucceeded)) {
      removeIds.add(conc.value)
      conc = Option.none()
    }
  }

  // Single pass: remove by ID + clear expired AtEndOfTurn
  const ae = ctx.activeEffects.filter(
    (a) =>
      !removeIds.has(a.spellId) &&
      !((a.expiryOwnerId == null || a.expiryOwnerId === selfId) && a.expiresAt === "end" && a.turnsRemaining <= 0)
  )

  // Auto-break concentration if the concentrated spell's effect expired
  if (Option.isSome(conc)) {
    const cid = conc.value
    if (!ae.some((a) => a.spellId === cid)) conc = Option.none()
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
    deathSaves: { successes: deathSuccesses, failures: deathSaveCount(deathFailures) }
  }
}
