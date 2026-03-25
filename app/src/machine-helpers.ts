import type { Condition, DamageType, IncapSource } from "#/types.ts"
import { exhaustionLevel, hp } from "#/types.ts"

// --- Constants ---

export const DEATH_SAVE_THRESHOLD = 3
export const NAT_20 = 20
export const NAT_1 = 1
const DEATH_SAVE_SUCCESS_MIN = 10
const DOUBLE_FAILURE_COUNT = 2
const HALVE_DIVISOR = 2
const VULNERABILITY_MULTIPLIER = 2

// --- Pure functions ---

/** Immunity -> resistance -> vulnerability, applied sequentially. Matches Quint applyDamageModifiers. */
export function applyDamageModifiers(
  amount: number,
  damageType: DamageType,
  immunities: ReadonlySet<DamageType>,
  resistances: ReadonlySet<DamageType>,
  vulnerabilities: ReadonlySet<DamageType>
): number {
  if (immunities.has(damageType)) return 0
  const afterResist = resistances.has(damageType) ? Math.floor(amount / HALVE_DIVISOR) : amount
  return vulnerabilities.has(damageType) ? afterResist * VULNERABILITY_MULTIPLIER : afterResist
}

/** Effective max HP. SRD 5.2.1: exhaustion no longer halves max HP. Kept as abstraction point for future max-HP modifiers. */
export function effectiveMaxHp(maxHp: number): number {
  return maxHp
}

export const EMPTY_DMG_SET: ReadonlySet<DamageType> = new Set()

// --- Damage computation result ---

export interface TakeDamageResult {
  readonly effAmount: number
  readonly dmgThrough: number
  readonly newTempHp: number
  readonly newHp: number
  readonly overflow: number
  readonly effMax: number
}

/** Compute all damage values from context + event params. Used by guards and actions. */
export function computeTakeDamage(
  ctxHp: number,
  ctxMaxHp: number,
  ctxTempHp: number,
  amount: number,
  damageType: DamageType,
  immunities: ReadonlySet<DamageType>,
  resistances: ReadonlySet<DamageType>,
  vulnerabilities: ReadonlySet<DamageType>
): TakeDamageResult {
  const effAmount = applyDamageModifiers(amount, damageType, immunities, resistances, vulnerabilities)
  const tempAbsorb = Math.min(ctxTempHp, effAmount)
  const dmgThrough = effAmount - tempAbsorb
  const newTempHp = ctxTempHp - tempAbsorb
  const newHp = Math.max(0, ctxHp - dmgThrough)
  const overflow = dmgThrough > ctxHp ? dmgThrough - ctxHp : 0
  const effMax = effectiveMaxHp(ctxMaxHp)
  return { dmgThrough, effAmount, effMax, newHp, newTempHp, overflow }
}

// --- Death save logic ---

interface DeathSaveResult {
  readonly newSuccesses: number
  readonly newFailures: number
  readonly isDead: boolean
  readonly isStabilized: boolean
  readonly regainsConsciousness: boolean
}

export function resolveDeathSave(d20Roll: number, successes: number, failures: number): DeathSaveResult {
  if (d20Roll === NAT_20) {
    return { isDead: false, isStabilized: false, newFailures: 0, newSuccesses: 0, regainsConsciousness: true }
  }
  if (d20Roll === NAT_1) {
    const newFail = failures + DOUBLE_FAILURE_COUNT
    return {
      isDead: newFail >= DEATH_SAVE_THRESHOLD,
      isStabilized: false,
      newFailures: newFail,
      newSuccesses: successes,
      regainsConsciousness: false
    }
  }
  if (d20Roll >= DEATH_SAVE_SUCCESS_MIN) {
    const newSucc = successes + 1
    return {
      isDead: false,
      isStabilized: newSucc >= DEATH_SAVE_THRESHOLD,
      newFailures: failures,
      newSuccesses: newSucc,
      regainsConsciousness: false
    }
  }
  const newFail = failures + 1
  return {
    isDead: newFail >= DEATH_SAVE_THRESHOLD,
    isStabilized: false,
    newFailures: newFail,
    newSuccesses: successes,
    regainsConsciousness: false
  }
}

/** Add death save failures from damage at 0 HP. Returns new failure count and whether dead. */
export function addDeathFailures(
  currentFailures: number,
  isCritical: boolean
): { readonly newFailures: number; readonly isDead: boolean } {
  const count = isCritical ? DOUBLE_FAILURE_COUNT : 1
  const newFailures = currentFailures + count
  return { isDead: newFailures >= DEATH_SAVE_THRESHOLD, newFailures }
}

// --- Damage-at-zero-HP state transitions ---

export interface DamageAtZeroUpdate {
  readonly dead: boolean
  readonly stable: boolean
  readonly newDeathFailures: number
  readonly unconscious?: true
  readonly prone?: true
  readonly addIncap?: true
}

/** Shared logic for damage-at-zero transitions: drop-to-zero, instant death, death failures. */
export function damageAtZeroTransition(
  prevHp: number,
  newHp: number,
  dmgThrough: number,
  overflow: number,
  effMax: number,
  deathFailures: number,
  stable: boolean,
  dead: boolean
): DamageAtZeroUpdate {
  if (dmgThrough <= 0) return { dead, stable, newDeathFailures: deathFailures }
  if (prevHp > 0 && newHp === 0) {
    if (overflow >= effMax) return { dead: true, stable, newDeathFailures: deathFailures }
    return { dead, stable: false, newDeathFailures: deathFailures, unconscious: true, prone: true, addIncap: true }
  }
  if (prevHp === 0) {
    if (dmgThrough >= effMax) return { dead: true, stable, newDeathFailures: deathFailures }
    const df = addDeathFailures(deathFailures, false)
    return { dead: df.isDead, stable: false, newDeathFailures: df.newFailures }
  }
  return { dead, stable, newDeathFailures: deathFailures }
}

// --- Condition implication logic ---

/** Maps conditions to their incapacitated source. Only conditions that imply incapacitated are listed. */
const INCAP_SOURCE_MAP: Readonly<Partial<Record<Condition, IncapSource>>> = {
  incapacitated: "direct",
  paralyzed: "paralyzed",
  petrified: "petrified",
  stunned: "stunned",
  unconscious: "unconscious"
}

/** Condition boolean field names in context (excludes "incapacitated" which is derived). */
export type ConditionFlag = Exclude<Condition, "incapacitated">

/** Result of applying or removing a condition. */
interface ConditionUpdate {
  readonly conditionFlags: Readonly<Partial<Record<ConditionFlag, boolean>>>
  readonly incapSources: ReadonlySet<IncapSource>
}

/** Compute context updates for applying a condition. Matches Quint pApplyCondition. */
export function applyConditionUpdate(
  condition: Condition,
  currentIncapSources: ReadonlySet<IncapSource>,
  isPetrified: boolean
): ConditionUpdate {
  const incapSource = INCAP_SOURCE_MAP[condition]
  const incapSources = incapSource ? addIncapSource(currentIncapSources, incapSource) : currentIncapSources

  if (condition === "incapacitated") {
    return { conditionFlags: {}, incapSources }
  }
  if (condition === "poisoned" && isPetrified) {
    return { conditionFlags: {}, incapSources: currentIncapSources }
  }
  if (condition === "unconscious") {
    return { conditionFlags: { prone: true, unconscious: true }, incapSources }
  }

  const flag = condition as ConditionFlag
  return { conditionFlags: { [flag]: true }, incapSources }
}

/** Compute context updates for removing a condition. Matches Quint pRemoveCondition. */
export function removeConditionUpdate(
  condition: Condition,
  currentIncapSources: ReadonlySet<IncapSource>
): ConditionUpdate {
  const incapSource = INCAP_SOURCE_MAP[condition]
  const incapSources = incapSource ? removeIncapSource(currentIncapSources, incapSource) : currentIncapSources

  if (condition === "incapacitated") {
    return { conditionFlags: {}, incapSources }
  }

  const flag = condition as ConditionFlag
  return { conditionFlags: { [flag]: false }, incapSources }
}

// --- Exhaustion helpers ---

export const MAX_EXHAUSTION = 6

/** Compute new exhaustion level and HP after adding exhaustion. Matches Quint pAddExhaustion. */
export function computeAddExhaustion(
  currentExhaustion: number,
  levels: number,
  currentHp: number,
  maxHp: number
): { readonly newExhaustion: number; readonly newHp: number } {
  const newExhaustion = Math.min(currentExhaustion + levels, MAX_EXHAUSTION)
  if (newExhaustion >= MAX_EXHAUSTION) {
    return { newExhaustion, newHp: 0 }
  }
  const effMax = effectiveMaxHp(maxHp)
  return { newExhaustion, newHp: Math.min(currentHp, effMax) }
}

// --- Speed calculation ---

/** SRD 5.2.1 exhaustion speed penalty: -5 × exhaustion level ft. */
const EXHAUSTION_SPEED_PENALTY_PER_LEVEL = 5

/** Calculate effective speed from base speed, conditions, and external factors. Matches Quint pStartTurn speed logic. */
export function calculateEffectiveSpeed(params: {
  readonly baseSpeed: number
  readonly armorPenalty: number
  readonly grappled: boolean
  readonly restrained: boolean
  readonly exhaustion: number
  readonly callerSpeedModifier: number
  readonly isGrappling: boolean
  readonly grappledTargetTwoSizesSmaller: boolean
}): number {
  if (params.grappled || params.restrained) return 0
  const afterArmor = Math.max(0, params.baseSpeed - params.armorPenalty)
  const afterExhaustion = Math.max(0, afterArmor - EXHAUSTION_SPEED_PENALTY_PER_LEVEL * params.exhaustion)
  const afterGrappling =
    params.isGrappling && !params.grappledTargetTwoSizesSmaller
      ? Math.floor(afterExhaustion / HALVE_DIVISOR)
      : afterExhaustion
  return Math.max(0, afterGrappling + params.callerSpeedModifier)
}

/** Movement cost multiplier. Matches Quint pMovementCost. */
export function movementCostMultiplier(params: {
  readonly isDifficultTerrain: boolean
  readonly isCrawling: boolean
  readonly isClimbingOrSwimming: boolean
  readonly hasRelevantSpeed: boolean
}): number {
  const terrainExtra = params.isDifficultTerrain ? 1 : 0
  const crawlExtra = params.isCrawling ? 1 : 0
  const climbSwimExtra = params.isClimbingOrSwimming && !params.hasRelevantSpeed ? 1 : 0
  return 1 + terrainExtra + crawlExtra + climbSwimExtra
}

/** Spend half effective speed (for standing from prone). Matches Quint pSpendHalfSpeed. */
export function spendHalfSpeed(
  movementRemaining: number,
  effectiveSpeed: number
): { readonly success: boolean; readonly newMovementRemaining: number } {
  const cost = Math.floor(effectiveSpeed / HALVE_DIVISOR)
  if (effectiveSpeed === 0 || cost > movementRemaining) {
    return { newMovementRemaining: movementRemaining, success: false }
  }
  return { newMovementRemaining: movementRemaining - cost, success: true }
}

// --- Environmental helpers ---

const FALL_DAMAGE_DIVISOR = 10
const FALL_DAMAGE_MAX_DICE = 20
const ARMOR_SPEED_PENALTY = 10

/** Fall damage d6 count. Matches Quint: min(floor(height/10), 20). */
export function fallDamageDice(heightFeet: number): number {
  return Math.min(Math.floor(heightFeet / FALL_DAMAGE_DIVISOR), FALL_DAMAGE_MAX_DICE)
}

/** Armor speed penalty: 10ft if heavy armor STR requirement not met. Matches Quint armorSpeedPenalty. */
export function armorSpeedPenalty(armorStrRequirement: number, strScore: number): number {
  if (armorStrRequirement > 0 && strScore < armorStrRequirement) return ARMOR_SPEED_PENALTY
  return 0
}

/** Dehydration exhaustion levels: 2 if already exhausted, else 1. Matches Quint pApplyDehydration. */
export function dehydrationLevels(currentExhaustion: number, halfWater: boolean, conSaveSucceeded: boolean): number {
  if (halfWater && conSaveSucceeded) return 0
  return currentExhaustion >= 1 ? 2 : 1
}

/** All D&D 5e damage types. Used for petrified resistance. */
export const ALL_DAMAGE_TYPES: ReadonlySet<DamageType> = new Set([
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder"
] as const)

/** Compute fall damage as TakeDamageResult. Used by guards and actions. */
export function computeFallResult(
  damageRoll: number,
  ctxHp: number,
  ctxMaxHp: number,
  ctxTempHp: number,
  immunities: ReadonlySet<DamageType>,
  resistances: ReadonlySet<DamageType>,
  vulnerabilities: ReadonlySet<DamageType>
): TakeDamageResult {
  return computeTakeDamage(
    ctxHp,
    ctxMaxHp,
    ctxTempHp,
    damageRoll,
    "bludgeoning",
    immunities,
    resistances,
    vulnerabilities
  )
}

// --- Shared context update helpers ---

export const exhUpdate = (r: { newExhaustion: number; newHp: number }) => ({
  exhaustion: exhaustionLevel(r.newExhaustion),
  hp: hp(r.newHp)
})

// --- IncapSource set helpers ---

export const addIncapSource = (s: ReadonlySet<IncapSource>, v: IncapSource): ReadonlySet<IncapSource> =>
  s.has(v) ? s : new Set(s).add(v)
export function removeIncapSource(s: ReadonlySet<IncapSource>, v: IncapSource): ReadonlySet<IncapSource> {
  if (!s.has(v)) return s
  const n = new Set(s)
  n.delete(v)
  return n
}
