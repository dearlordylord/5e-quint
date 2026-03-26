import { NAT_1, NAT_20 } from "#/machine-helpers.ts"
import { EXHAUSTION_DISADV_THRESHOLD } from "#/machine-queries.ts"
import { SIZE_ORDER } from "#/srd-constants.ts"
import type {
  AdvState,
  ArmorState,
  AttackContext,
  AttackResult,
  CoverType,
  FullAttackMods,
  Size,
  UnarmoredDefense
} from "#/types.ts"

// --- Constants ---

const BASE_AC = 10
const SHIELD_BONUS = 2
const MEDIUM_DEX_CAP = 2
const HALF_COVER_BONUS = 2
const THREE_QUARTERS_COVER_BONUS = 5

// --- Attack resolution ---

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
  if (d20Roll === NAT_20) return { hits: true, isCritical: true }
  if (d20Roll === NAT_1) return { hits: false, isCritical: false }
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

// --- Size and contest resolution ---

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
    ctx.attackerExhaustion >= EXHAUSTION_DISADV_THRESHOLD ||
    (ctx.targetProne && !ctx.attackerWithin5ft) ||
    (ctx.isRangedAttack && ctx.beyondNormalRange) ||
    (ctx.isRangedAttack && ctx.hostileWithin5ft) ||
    !ctx.attackerCanSeeTarget ||
    (ctx.isHeavyWeapon && ctx.wielderSizeSmallOrTiny) ||
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

/** Grapple resolution. Matches Quint pGrapple (SRD 5.2.1 save-based). */
export function resolveGrapple(
  attackerSize: Size,
  targetSize: Size,
  targetSaveFailed: boolean,
  attackerHasFreeHand: boolean,
  targetIncapacitated: boolean
): boolean {
  if (!withinOneSize(attackerSize, targetSize) || !attackerHasFreeHand) return false
  return targetIncapacitated || targetSaveFailed
}

/** Shove resolution. Matches Quint pShove (SRD 5.2.1 save-based). */
export function resolveShove(
  attackerSize: Size,
  targetSize: Size,
  targetSaveFailed: boolean,
  targetIncapacitated: boolean
): boolean {
  if (!withinOneSize(attackerSize, targetSize)) return false
  return targetIncapacitated || targetSaveFailed
}
