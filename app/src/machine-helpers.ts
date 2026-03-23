import type { CasterType, Condition, DamageType, IncapSource, SpellSlots } from "#/types.ts"
import { EMPTY_SLOTS, exhaustionLevel, hp, SPELL_SLOT_LEVELS } from "#/types.ts"

// --- Constants ---

const EXHAUSTION_HP_HALVE_THRESHOLD = 4
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

/** Exhaustion 4+ halves max HP. Matches Quint effectiveMaxHp. */
export function effectiveMaxHp(exhaustion: number, maxHp: number): number {
  return exhaustion >= EXHAUSTION_HP_HALVE_THRESHOLD ? Math.floor(maxHp / HALVE_DIVISOR) : maxHp
}

// --- Damage computation result ---

interface TakeDamageResult {
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
type ConditionFlag =
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
  let incapSources: ReadonlySet<IncapSource>
  if (incapSource && currentIncapSources.has(incapSource)) {
    const s = new Set(currentIncapSources)
    s.delete(incapSource)
    incapSources = s
  } else {
    incapSources = currentIncapSources
  }

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
  const effMax = effectiveMaxHp(newExhaustion, maxHp)
  return { newExhaustion, newHp: Math.min(currentHp, effMax) }
}

// --- Speed calculation ---

const EXHAUSTION_SPEED_HALVE_THRESHOLD = 2
const EXHAUSTION_SPEED_ZERO_THRESHOLD = 5

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
  const afterExhaustion =
    params.exhaustion >= EXHAUSTION_SPEED_ZERO_THRESHOLD
      ? 0
      : params.exhaustion >= EXHAUSTION_SPEED_HALVE_THRESHOLD
        ? Math.floor(afterArmor / HALVE_DIVISOR)
        : afterArmor
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
  readonly isSqueezing: boolean
}): number {
  const terrainExtra = params.isDifficultTerrain ? 1 : 0
  const crawlExtra = params.isCrawling ? 1 : 0
  const climbSwimExtra = params.isClimbingOrSwimming && !params.hasRelevantSpeed ? 1 : 0
  const squeezeExtra = params.isSqueezing ? 1 : 0
  return 1 + terrainExtra + crawlExtra + climbSwimExtra + squeezeExtra
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

// --- Spellcasting helpers ---

const CONCENTRATION_DC_MIN = 10
const THIRD_CASTER_DIVISOR = 3

/** Concentration save DC. Matches Quint pConcentrationDC. */
export function concentrationDC(damageTaken: number): number {
  return Math.max(CONCENTRATION_DC_MIN, Math.floor(damageTaken / HALVE_DIVISOR))
}

/** Expend a spell slot at the given level (1-9). Returns new slotsCurrent. */
export function expendSlot(slotsCurrent: SpellSlots, level: number): SpellSlots {
  const idx = level - 1
  if (idx < 0 || idx >= slotsCurrent.length || slotsCurrent[idx] <= 0) return slotsCurrent
  return slotsCurrent.map((v, i) => (i === idx ? v - 1 : v))
}

/** Multiclass spell slot table. Matches Quint pSlotsPerLevel. */
export function slotsPerLevel(casterLevel: number, spellLevel: number): number {
  /* eslint-disable no-magic-numbers */
  if (spellLevel === 1) return casterLevel >= 3 ? 4 : casterLevel === 2 ? 3 : casterLevel === 1 ? 2 : 0
  if (spellLevel === 2) return casterLevel >= 4 ? 3 : casterLevel === 3 ? 2 : 0
  if (spellLevel === 3) return casterLevel >= 6 ? 3 : casterLevel === 5 ? 2 : 0
  if (spellLevel === 4) return casterLevel >= 9 ? 3 : casterLevel === 8 ? 2 : casterLevel === 7 ? 1 : 0
  if (spellLevel === 5) return casterLevel >= 18 ? 3 : casterLevel >= 10 ? 2 : casterLevel === 9 ? 1 : 0
  if (spellLevel === 6) return casterLevel >= 19 ? 2 : casterLevel >= 11 ? 1 : 0
  if (spellLevel === 7) return casterLevel >= 20 ? 2 : casterLevel >= 13 ? 1 : 0
  if (spellLevel === 8) return casterLevel >= 15 ? 1 : 0
  if (spellLevel === 9) return casterLevel >= 17 ? 1 : 0
  /* eslint-enable no-magic-numbers */
  return 0
}

/** Calculate multiclass spell slots from class levels. */
export function calculateMulticlassSlots(
  classLevels: ReadonlyArray<{ readonly type: CasterType; readonly level: number }>
): SpellSlots {
  const casterLevel = classLevels.reduce((sum, cl) => {
    if (cl.type === "full") return sum + cl.level
    if (cl.type === "half") return sum + Math.floor(cl.level / HALVE_DIVISOR)
    return sum + Math.floor(cl.level / THIRD_CASTER_DIVISOR)
  }, 0)
  if (casterLevel === 0) return EMPTY_SLOTS
  return Array.from({ length: SPELL_SLOT_LEVELS }, (_, i) => slotsPerLevel(casterLevel, i + 1))
}

/** Hit dice recovery on long rest: max(1, floor(total/2)). */
export function hitDiceRecovery(totalHitDice: number, currentRemaining: number): number {
  const recovery = Math.max(1, Math.floor(totalHitDice / HALVE_DIVISOR))
  return Math.min(recovery, totalHitDice - currentRemaining)
}

/** Compute short rest results: spend hit dice, restore pact slots. */
export function computeShortRest(
  currentHp: number,
  maxHp: number,
  exhaustion: number,
  hitDiceRemaining: number,
  pactSlotsMax: number,
  conMod: number,
  hdRolls: ReadonlyArray<number>
): { readonly newHp: number; readonly newHitDice: number; readonly newPactSlots: number } {
  const effMax = effectiveMaxHp(exhaustion, maxHp)
  const cap = Math.min(hitDiceRemaining, hdRolls.length)
  let curHp = currentHp
  for (let i = 0; i < cap; i++) {
    curHp = Math.min(curHp + Math.max(0, hdRolls[i] + conMod), effMax)
  }
  return { newHitDice: hitDiceRemaining - cap, newHp: curHp, newPactSlots: pactSlotsMax }
}

/** Compute long rest results. */
export function computeLongRest(
  currentHp: number,
  maxHp: number,
  exhaustion: number,
  hitDiceRemaining: number,
  slotsMax: SpellSlots,
  pactSlotsMax: number,
  totalHitDice: number,
  hasEaten: boolean
): {
  readonly newExhaustion: number
  readonly newHp: number
  readonly newHitDice: number
  readonly newSlots: SpellSlots
  readonly newPactSlots: number
} | null {
  if (currentHp < 1) return null
  const newExhaustion = hasEaten ? Math.max(0, exhaustion - 1) : exhaustion
  const effMax = effectiveMaxHp(newExhaustion, maxHp)
  const recovery = hitDiceRecovery(totalHitDice, hitDiceRemaining)
  return {
    newExhaustion,
    newHitDice: hitDiceRemaining + recovery,
    newHp: effMax,
    newPactSlots: pactSlotsMax,
    newSlots: slotsMax
  }
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
  ctxExhaustion: number,
  immunities: ReadonlySet<DamageType>,
  resistances: ReadonlySet<DamageType>,
  vulnerabilities: ReadonlySet<DamageType>
): TakeDamageResult {
  return computeTakeDamage(
    ctxHp,
    ctxMaxHp,
    ctxTempHp,
    ctxExhaustion,
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
  const n = new Set(s)
  n.delete(v)
  return n
}
