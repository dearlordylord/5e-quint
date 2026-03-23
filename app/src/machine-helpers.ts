import type {
  AdvState,
  ArmorState,
  AttackContext,
  AttackResult,
  Condition,
  ContestResult,
  CoverType,
  DamageType,
  FullAttackMods,
  IncapSource,
  Size,
  UnarmoredDefense
} from "#/types.ts"

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

// --- Speed calculation ---

const EXHAUSTION_SPEED_HALVE_THRESHOLD = 2
const EXHAUSTION_SPEED_ZERO_THRESHOLD = 5
const SPEED_HALVE_DIVISOR = 2

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
        ? Math.floor(afterArmor / SPEED_HALVE_DIVISOR)
        : afterArmor
  const afterGrappling =
    params.isGrappling && !params.grappledTargetTwoSizesSmaller
      ? Math.floor(afterExhaustion / SPEED_HALVE_DIVISOR)
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
  const cost = Math.floor(effectiveSpeed / SPEED_HALVE_DIVISOR)
  if (effectiveSpeed === 0 || cost > movementRemaining) {
    return { newMovementRemaining: movementRemaining, success: false }
  }
  return { newMovementRemaining: movementRemaining - cost, success: true }
}

// --- Attack resolution ---

const NAT_20_ATTACK = 20
const NAT_1_ATTACK = 1
const BASE_AC = 10
const SHIELD_BONUS = 2
const MEDIUM_DEX_CAP = 2
const HALF_COVER_BONUS = 2
const THREE_QUARTERS_COVER_BONUS = 5
const EXHAUSTION_ATTACK_DISADV = 3

/** Advantage/disadvantage cancel. Matches Quint resolveAdvantage. */
export function resolveAdvantage(sources: AdvState): AdvState {
  if (sources.hasAdvantage && sources.hasDisadvantage) return { hasAdvantage: false, hasDisadvantage: false }
  return sources
}

/** Attack roll resolution. Matches Quint resolveAttackRoll. */
export function resolveAttackRoll(
  d20Roll: number,
  attackBonus: number,
  targetAC: number,
  targetCoverBonus: number
): AttackResult {
  if (d20Roll === NAT_20_ATTACK) return { hits: true, isCritical: true }
  if (d20Roll === NAT_1_ATTACK) return { hits: false, isCritical: false }
  return { hits: d20Roll + attackBonus >= targetAC + targetCoverBonus, isCritical: false }
}

/** Normal damage: dice + modifier. */
export function normalDamage(diceResult: number, modifier: number): number {
  return diceResult + modifier
}

/** Critical hit damage: normal dice + bonus dice + modifier (modifier NOT doubled). */
export function criticalDamage(normalDice: number, bonusDice: number, modifier: number): number {
  return normalDice + bonusDice + modifier
}

/** Cover bonus for AC and DEX saves. Matches Quint coverBonus. */
export function coverBonus(cover: CoverType): number {
  if (cover === "half") return HALF_COVER_BONUS
  if (cover === "threeQuarters") return THREE_QUARTERS_COVER_BONUS
  return 0
}

/** AC calculation for all armor types. Matches Quint calculateAC. */
export function calculateAC(params: {
  readonly armorState: ArmorState
  readonly dexMod: number
  readonly hasShield: boolean
  readonly unarmoredDef: UnarmoredDefense
  readonly conMod: number
  readonly wisMod: number
}): number {
  const shieldBonus = params.hasShield ? SHIELD_BONUS : 0
  let baseAC: number
  if (params.armorState.type === "wearingArmor") {
    const { armor } = params.armorState
    if (armor.category === "light") baseAC = armor.baseAC + params.dexMod
    else if (armor.category === "medium") baseAC = armor.baseAC + Math.min(params.dexMod, MEDIUM_DEX_CAP)
    else baseAC = armor.baseAC
  } else if (params.unarmoredDef === "barbarian") {
    baseAC = BASE_AC + params.dexMod + params.conMod
  } else if (params.unarmoredDef === "monk") {
    baseAC = BASE_AC + params.dexMod + params.wisMod
  } else {
    baseAC = BASE_AC + params.dexMod
  }
  return baseAC + shieldBonus
}

/** Size ordering for grapple/shove constraints. */
const SIZE_ORDER: ReadonlyArray<Size> = ["tiny", "small", "medium", "large", "huge", "gargantuan"]

/** Check if attacker is within one size category of target. */
export function withinOneSize(attackerSize: Size, targetSize: Size): boolean {
  const aIdx = SIZE_ORDER.indexOf(attackerSize)
  const tIdx = SIZE_ORDER.indexOf(targetSize)
  return tIdx - aIdx <= 1
}

/** Aggregate all attack modifiers. Matches Quint pAggregateAttackMods. */
export function aggregateAttackMods(ctx: AttackContext): FullAttackMods {
  const anyAdvantage =
    ctx.targetBlinded ||
    ctx.targetParalyzed ||
    ctx.targetPetrified ||
    ctx.targetStunned ||
    ctx.targetUnconscious ||
    (ctx.targetProne && ctx.attackerWithin5ft) ||
    ctx.targetRestrained ||
    !ctx.targetCanSeeAttacker

  const anyDisadvantage =
    ctx.attackerBlinded ||
    ctx.attackerProne ||
    ctx.attackerRestrained ||
    ctx.attackerPoisoned ||
    (ctx.attackerFrightened && ctx.attackerFrightSourceInLOS) ||
    ctx.attackerExhaustion >= EXHAUSTION_ATTACK_DISADV ||
    (ctx.targetProne && !ctx.attackerWithin5ft) ||
    (ctx.isRangedAttack && ctx.beyondNormalRange) ||
    (ctx.isRangedAttack && ctx.hostileWithin5ft) ||
    !ctx.attackerCanSeeTarget ||
    (ctx.isHeavyWeapon && ctx.wielderSizeSmallOrTiny) ||
    ctx.squeezing ||
    (ctx.underwater && !ctx.isRangedAttack && !ctx.attackerHasSwimSpeed && !ctx.isUnderwaterMeleeException) ||
    (ctx.underwater && ctx.isRangedAttack && !ctx.beyondNormalRange && !ctx.isUnderwaterRangedException) ||
    (ctx.targetDodging && ctx.targetCanSeeAttacker)

  const resolved = resolveAdvantage({ hasAdvantage: anyAdvantage, hasDisadvantage: anyDisadvantage })
  return {
    ...resolved,
    autoCrit: (ctx.targetParalyzed || ctx.targetUnconscious) && ctx.attackerWithin5ft,
    autoMiss: ctx.underwater && ctx.isRangedAttack && ctx.beyondNormalRange
  }
}

/** Grapple resolution. Matches Quint pGrapple. */
export function resolveGrapple(
  attackerSize: Size,
  targetSize: Size,
  contestResult: ContestResult,
  attackerHasFreeHand: boolean,
  targetIncapacitated: boolean
): boolean {
  if (!withinOneSize(attackerSize, targetSize) || !attackerHasFreeHand) return false
  return targetIncapacitated || contestResult === "aWins"
}

/** Shove resolution. Matches Quint pShove. */
export function resolveShove(
  attackerSize: Size,
  targetSize: Size,
  contestResult: ContestResult,
  targetIncapacitated: boolean
): boolean {
  if (!withinOneSize(attackerSize, targetSize)) return false
  return targetIncapacitated || contestResult === "aWins"
}

// --- State path constants (for stateIn guards) ---

export const CONSCIOUS_STATE = { damageTrack: "conscious" as const }
export const DYING_STATE = { damageTrack: "dying" as const }
export const DEAD_STATE = { damageTrack: "dead" as const }
export const UNSTABLE_STATE = { damageTrack: { dying: "unstable" as const } }
export const STABLE_STATE = { damageTrack: { dying: "stable" as const } }
