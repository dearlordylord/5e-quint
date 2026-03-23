import type { Condition, DamageType, IncapSource } from "#/types.ts"

// --- Constants ---

const EXHAUSTION_HP_HALVE_THRESHOLD = 4
const DEATH_SAVE_THRESHOLD = 3
const NAT_20 = 20
const NAT_1 = 1
const DEATH_SAVE_SUCCESS_MIN = 10
const NAT_1_FAILURE_COUNT = 2
const RESISTANCE_DIVISOR = 2
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
  const afterResist = resistances.has(damageType) ? Math.floor(amount / RESISTANCE_DIVISOR) : amount
  return vulnerabilities.has(damageType) ? afterResist * VULNERABILITY_MULTIPLIER : afterResist
}

/** Exhaustion 4+ halves max HP. Matches Quint effectiveMaxHp. */
export function effectiveMaxHp(exhaustion: number, maxHp: number): number {
  return exhaustion >= EXHAUSTION_HP_HALVE_THRESHOLD ? Math.floor(maxHp / RESISTANCE_DIVISOR) : maxHp
}

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
  ctxExhaustion: number,
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
  const effMax = effectiveMaxHp(ctxExhaustion, ctxMaxHp)
  return { dmgThrough, effAmount, effMax, newHp, newTempHp, overflow }
}

// --- Death save logic ---

export interface DeathSaveResult {
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
    const newFail = failures + NAT_1_FAILURE_COUNT
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
  const count = isCritical ? NAT_1_FAILURE_COUNT : 1
  const newFailures = currentFailures + count
  return { isDead: newFailures >= DEATH_SAVE_THRESHOLD, newFailures }
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
export type ConditionFlag =
  | "blinded"
  | "charmed"
  | "deafened"
  | "frightened"
  | "grappled"
  | "invisible"
  | "paralyzed"
  | "petrified"
  | "poisoned"
  | "prone"
  | "restrained"
  | "stunned"
  | "unconscious"

/** Result of applying or removing a condition. */
export interface ConditionUpdate {
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
  const incapSources = incapSource ? new Set([...currentIncapSources, incapSource]) : currentIncapSources

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
  const incapSources = incapSource
    ? new Set([...currentIncapSources].filter((s) => s !== incapSource))
    : currentIncapSources

  if (condition === "incapacitated") {
    return { conditionFlags: {}, incapSources }
  }

  const flag = condition as ConditionFlag
  return { conditionFlags: { [flag]: false }, incapSources }
}

// --- Exhaustion helpers ---

const EXHAUSTION_DEATH_THRESHOLD = 6
const MAX_EXHAUSTION = 6

/** Compute new exhaustion level and HP after adding exhaustion. Matches Quint pAddExhaustion. */
export function computeAddExhaustion(
  currentExhaustion: number,
  levels: number,
  currentHp: number,
  maxHp: number
): { readonly newExhaustion: number; readonly newHp: number } {
  const newExhaustion = Math.min(currentExhaustion + levels, MAX_EXHAUSTION)
  if (newExhaustion >= EXHAUSTION_DEATH_THRESHOLD) {
    return { newExhaustion, newHp: 0 }
  }
  const effMax = effectiveMaxHp(newExhaustion, maxHp)
  return { newExhaustion, newHp: Math.min(currentHp, effMax) }
}

// --- State path constants (for stateIn guards) ---

export const CONSCIOUS_STATE = { damageTrack: "conscious" as const }
export const DYING_STATE = { damageTrack: "dying" as const }
export const DEAD_STATE = { damageTrack: "dead" as const }
export const UNSTABLE_STATE = { damageTrack: { dying: "unstable" as const } }
export const STABLE_STATE = { damageTrack: { dying: "stable" as const } }
