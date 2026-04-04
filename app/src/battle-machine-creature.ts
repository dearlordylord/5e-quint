/**
 * Battle machine creature-level pure functions — ports creature.qnt pure functions.
 * All functions are pure (no XState imports, no side effects).
 */
import { Match, Option } from "effect"

import type { BattleCreatureState, CreatureId } from "#/battle-machine-types.ts"
import { addIncapSource, ALL_DAMAGE_TYPES, removeIncapSource, resolveDeathSave } from "#/machine-helpers.ts"
import type { ActionType, ActiveEffect, Condition, CreatureKind, DamageType, ExpiryPhase, SpellId } from "#/types.ts"

function applyDamageModifiers(
  amount: number,
  damageType: DamageType,
  immunities: ReadonlySet<DamageType>,
  resistances: ReadonlySet<DamageType>,
  vulnerabilities: ReadonlySet<DamageType>,
  flatModifier: number
): number {
  if (immunities.has(damageType)) return 0
  const afterFlat = Math.max(0, amount - flatModifier)
  const afterResist = resistances.has(damageType) ? Math.trunc(afterFlat / 2) : afterFlat
  return vulnerabilities.has(damageType) ? afterResist * 2 : afterResist
}

export function isIncapacitated(c: BattleCreatureState): boolean {
  return c.incapacitatedSources.size > 0
}

export function applyCondition(c: BattleCreatureState, cond: Condition): BattleCreatureState {
  return Match.value(cond).pipe(
    Match.when("blinded", () => ({ ...c, blinded: true })),
    Match.when("charmed", () => ({ ...c, charmed: true })),
    Match.when("deafened", () => ({ ...c, deafened: true })),
    Match.when("frightened", () => ({ ...c, frightened: true })),
    Match.when("grappled", () => ({ ...c, grappled: true })),
    Match.when("incapacitated", () => ({
      ...c,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "direct")
    })),
    Match.when("invisible", () => ({ ...c, invisible: true })),
    Match.when("paralyzed", () => ({
      ...c,
      paralyzed: true,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "paralyzed")
    })),
    Match.when("petrified", () => ({
      ...c,
      petrified: true,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "petrified")
    })),
    Match.when("poisoned", () => (c.petrified ? c : { ...c, poisoned: true })),
    Match.when("prone", () => ({ ...c, prone: true })),
    Match.when("restrained", () => ({ ...c, restrained: true })),
    Match.when("stunned", () => ({
      ...c,
      stunned: true,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "stunned")
    })),
    Match.when("unconscious", () => ({
      ...c,
      unconscious: true,
      prone: true,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "unconscious")
    })),
    Match.exhaustive
  )
}

function removeCondition(c: BattleCreatureState, cond: Condition): BattleCreatureState {
  return Match.value(cond).pipe(
    Match.when("blinded", () => ({ ...c, blinded: false })),
    Match.when("charmed", () => ({ ...c, charmed: false })),
    Match.when("deafened", () => ({ ...c, deafened: false })),
    Match.when("frightened", () => ({ ...c, frightened: false })),
    Match.when("grappled", () => ({ ...c, grappled: false })),
    Match.when("incapacitated", () => ({
      ...c,
      incapacitatedSources: removeIncapSource(c.incapacitatedSources, "direct")
    })),
    Match.when("invisible", () => ({ ...c, invisible: false })),
    Match.when("paralyzed", () => ({
      ...c,
      paralyzed: false,
      incapacitatedSources: removeIncapSource(c.incapacitatedSources, "paralyzed")
    })),
    Match.when("petrified", () => ({
      ...c,
      petrified: false,
      incapacitatedSources: removeIncapSource(c.incapacitatedSources, "petrified")
    })),
    Match.when("poisoned", () => ({ ...c, poisoned: false })),
    Match.when("prone", () => ({ ...c, prone: false })),
    Match.when("restrained", () => ({ ...c, restrained: false })),
    Match.when("stunned", () => ({
      ...c,
      stunned: false,
      incapacitatedSources: removeIncapSource(c.incapacitatedSources, "stunned")
    })),
    Match.when("unconscious", () => ({
      ...c,
      unconscious: false,
      incapacitatedSources: removeIncapSource(c.incapacitatedSources, "unconscious")
    })),
    Match.exhaustive
  )
}

function addDeathFailures(c: BattleCreatureState, count: number): BattleCreatureState {
  const newFails = Math.min(c.deathSaves.failures + count, 3)
  const c1 = { ...c, deathSaves: { successes: c.deathSaves.successes, failures: newFails } }
  return newFails >= 3 ? { ...c1, dead: true } : c1
}

/** Death saving throw at start of turn. Delegates to resolveDeathSave for d20 logic. */
export function deathSave(c: BattleCreatureState, d20Roll: number): BattleCreatureState {
  if (c.dead || c.hp > 0 || c.stable) return c
  const r = resolveDeathSave(d20Roll, c.deathSaves.successes, c.deathSaves.failures)
  if (r.regainsConsciousness) {
    return removeCondition({ ...c, hp: 1, deathSaves: { successes: 0, failures: 0 } }, "unconscious")
  }
  const c1 = { ...c, deathSaves: { successes: r.newSuccesses, failures: r.newFailures } }
  if (r.isDead) return { ...c1, dead: true }
  if (r.isStabilized) return { ...c1, stable: true, deathSaves: { successes: 0, failures: 0 } }
  return c1
}

export function takeDamage(
  c: BattleCreatureState,
  amount: number,
  damageType: DamageType,
  isCritical: boolean
): BattleCreatureState {
  if (c.dead) return c
  const effResist = c.petrified ? ALL_DAMAGE_TYPES : new Set<DamageType>()
  // Merge active effect granted R/V/I
  const totalR = new Set(effResist)
  const totalV = new Set<DamageType>()
  const totalI = new Set<DamageType>()
  for (const e of c.activeEffects) {
    if (e.grantedResistances) for (const r of e.grantedResistances) totalR.add(r)
    if (e.grantedVulnerabilities) for (const v of e.grantedVulnerabilities) totalV.add(v)
    if (e.grantedImmunities) for (const i of e.grantedImmunities) totalI.add(i)
  }
  const effAmount = applyDamageModifiers(amount, damageType, totalI, totalR, totalV, 0)
  if (effAmount <= 0) return c
  const tempAbsorb = Math.min(c.tempHp, effAmount)
  const dmgThrough = effAmount - tempAbsorb
  const c1 = { ...c, tempHp: c.tempHp - tempAbsorb }
  if (dmgThrough === 0) return c1
  if (c1.hp === 0) {
    if (c.creatureKind === "Monster") return { ...c1, dead: true }
    if (dmgThrough >= c.maxHp) return { ...c1, dead: true }
    return addDeathFailures({ ...c1, stable: false }, isCritical ? 2 : 1)
  }
  const newHp = c1.hp - dmgThrough
  if (newHp <= 0) {
    const overflow = -newHp
    const c2 = { ...c1, hp: 0 }
    if (c.creatureKind === "Monster") return { ...c2, dead: true }
    if (overflow >= c.maxHp) return { ...c2, dead: true }
    return applyCondition(c2, "unconscious")
  }
  return { ...c1, hp: newHp }
}

export function heal(c: BattleCreatureState, amount: number): BattleCreatureState {
  if (c.dead || amount <= 0) return c
  const newHp = Math.min(c.hp + amount, c.maxHp)
  const c1 = { ...c, hp: newHp }
  if (c.hp === 0 && newHp > 0) {
    return { ...removeCondition(c1, "unconscious"), deathSaves: { successes: 0, failures: 0 }, stable: false }
  }
  return c1
}

export function spendAction(c: BattleCreatureState, actionType: ActionType): BattleCreatureState {
  if (c.actionsRemaining <= 0 || isIncapacitated(c)) return c
  if (c.actionSurgeActionPending && actionType === "magic") return c
  let c1 = { ...c, actionsRemaining: c.actionsRemaining - 1 }
  if (actionType === "attack") c1 = { ...c1, attackActionUsed: true }
  else if (actionType === "disengage") c1 = { ...c1, disengaged: true }
  else if (actionType === "dodge") c1 = { ...c1, dodging: true }
  else if (actionType === "dash") c1 = { ...c1, movementRemaining: c1.movementRemaining + c1.effectiveSpeed }
  else if (actionType === "ready") c1 = { ...c1, readiedAction: true }
  if (c.actionSurgeActionPending) c1 = { ...c1, actionSurgeActionPending: false }
  return c1
}

export function spendReaction(c: BattleCreatureState): BattleCreatureState {
  return c.reactionAvailable ? { ...c, reactionAvailable: false } : c
}

export function spendMovement(c: BattleCreatureState, feet: number, cost: number): BattleCreatureState {
  const totalCost = feet * cost
  if (totalCost > c.movementRemaining || totalCost < 0) return c
  return { ...c, movementRemaining: c.movementRemaining - totalCost }
}

export function spendExtraAttack(c: BattleCreatureState): BattleCreatureState {
  return c.extraAttacksRemaining > 0 ? { ...c, extraAttacksRemaining: c.extraAttacksRemaining - 1 } : c
}

export function expendSlot(c: BattleCreatureState, level: number): BattleCreatureState {
  const idx = level - 1
  if (idx < 0 || idx >= c.slotsCurrent.length) return c
  const current = c.slotsCurrent[idx]
  if (current <= 0) return c
  const newSlots = [...c.slotsCurrent]
  newSlots[idx] = current - 1
  return { ...c, slotsCurrent: newSlots }
}

/** Battle-level expendSlot: also marks "slot expended this turn" (SRD 5.2.1). */
export function battleExpendSlot(c: BattleCreatureState, level: number): BattleCreatureState {
  return { ...expendSlot(c, level), slotExpendedThisTurn: true }
}

export function breakConcentration(c: BattleCreatureState): BattleCreatureState {
  if (Option.isNone(c.concentrationSpellId)) return c
  const sid = c.concentrationSpellId.value
  return { ...c, concentrationSpellId: Option.none(), activeEffects: c.activeEffects.filter((e) => e.spellId !== sid) }
}

export function startConcentration(c: BattleCreatureState, spellId: SpellId): BattleCreatureState {
  return { ...c, concentrationSpellId: Option.some(spellId) }
}

export function addEffect(
  c: BattleCreatureState,
  spellId: SpellId,
  duration: number,
  expiresAt: ExpiryPhase,
  casterId: CreatureId
): BattleCreatureState {
  const newEffect: ActiveEffect = { spellId, turnsRemaining: duration, expiresAt, casterId }
  return { ...c, activeEffects: [...c.activeEffects, newEffect] }
}

export function removeEffect(c: BattleCreatureState, spellId: SpellId): BattleCreatureState {
  return { ...c, activeEffects: c.activeEffects.filter((e) => e.spellId !== spellId) }
}

export function removeEffectsByCaster(c: BattleCreatureState, casterId: CreatureId): BattleCreatureState {
  const filtered = c.activeEffects.filter((e) => e.casterId !== casterId)
  return filtered.length === c.activeEffects.length ? c : { ...c, activeEffects: filtered }
}

export function decrementDurations(effects: ReadonlyArray<ActiveEffect>): ReadonlyArray<ActiveEffect> {
  return effects.map((e) => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
}

export function clearExpiredAtPhase(
  effects: ReadonlyArray<ActiveEffect>,
  phase: ExpiryPhase
): ReadonlyArray<ActiveEffect> {
  return effects.filter((e) => !(e.turnsRemaining <= 0 && e.expiresAt === phase))
}

// --- Constants & factories (moved from battle-machine-types.ts) ---

export const FRESH_TURN_STATE = {
  movementRemaining: 30,
  effectiveSpeed: 30,
  actionsRemaining: 1,
  attackActionUsed: false,
  bonusActionUsed: false,
  reactionAvailable: true,
  freeInteractionUsed: false,
  extraAttacksRemaining: 1,
  disengaged: false,
  dodging: false,
  readiedAction: false,
  bonusActionSpellCast: false,
  nonCantripActionSpellCast: false,
  bonusMovementRemaining: 0,
  bonusMovementOAFree: false,
  actionSurgeActionPending: false,
  slotExpendedThisTurn: false
} as const

const EMPTY_SLOTS: ReadonlyArray<number> = [0, 0, 0, 0, 0, 0, 0, 0, 0]

const CASTER_SLOTS: ReadonlyArray<number> = [4, 3, 2, 0, 0, 0, 0, 0, 0]

const CASTER_PREPARED_SPELLS: ReadonlySet<string> = new Set([
  "hold_person",
  "bless",
  "haste",
  "spirit_guardians",
  "fireball",
  "burning_hands",
  "guiding_bolt",
  "inflict_wounds",
  "counterspell"
])

export function freshCreature(maxHp: number, kind: CreatureKind): BattleCreatureState {
  return {
    hp: maxHp,
    maxHp,
    tempHp: 0,
    deathSaves: { successes: 0, failures: 0 },
    stable: false,
    dead: false,
    blinded: false,
    charmed: false,
    deafened: false,
    exhaustion: 0,
    frightened: false,
    grappled: false,
    invisible: false,
    paralyzed: false,
    petrified: false,
    poisoned: false,
    prone: false,
    restrained: false,
    stunned: false,
    unconscious: false,
    incapacitatedSources: new Set(),
    activeEffects: [],
    ...FRESH_TURN_STATE,
    slotsMax: EMPTY_SLOTS,
    slotsCurrent: EMPTY_SLOTS,
    pactSlotsMax: 0,
    pactSlotsCurrent: 0,
    pactSlotLevel: 0,
    concentrationSpellId: Option.none(),
    legendaryActionsRemaining: 0,
    legendaryResistancesRemaining: 0,
    rechargeAvailable: {},
    dailyUsesRemaining: {},
    creatureKind: kind,
    rogueLevel: 0,
    monkLevel: 0,
    preparedSpells: new Set()
  }
}

export function freshCaster(maxHp: number, kind: CreatureKind): BattleCreatureState {
  return {
    ...freshCreature(maxHp, kind),
    slotsMax: CASTER_SLOTS,
    slotsCurrent: CASTER_SLOTS,
    preparedSpells: CASTER_PREPARED_SPELLS
  }
}
