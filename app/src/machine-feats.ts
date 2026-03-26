// Grappler feat (SRD 5.2.1)
// General Feat (Prerequisite: Level 4+, Strength or Dexterity 13+)

import { withinOneSize } from "#/machine-combat.ts"
import type { AdvState, Size } from "#/types.ts"

// --- Constants ---

const GRAPPLER_ABILITY_PREREQ = 13
const STANDARD_DRAG_COST = 2
const SIZE_ORDER: ReadonlyArray<Size> = ["tiny", "small", "medium", "large", "huge", "gargantuan"]

export function canTakeGrapplerFeat(strScore: number, dexScore: number): boolean {
  return strScore >= GRAPPLER_ABILITY_PREREQ || dexScore >= GRAPPLER_ABILITY_PREREQ
}

// --- Attack Advantage ---

/**
 * "You have Advantage on attack rolls against a creature Grappled by you."
 */
export function grapplerAttackAdvantage(
  base: AdvState,
  hasGrapplerFeat: boolean,
  isGrapplingTarget: boolean
): AdvState {
  if (!hasGrapplerFeat || !isGrapplingTarget) return base
  return { ...base, hasAdvantage: true }
}

// --- Fast Wrestler ---

/**
 * "You don't have to spend extra movement to move a creature Grappled by you
 *  if the creature is your size or smaller."
 */
export function grapplerMovementCost(hasGrapplerFeat: boolean, grapplerSize: Size, grappledTargetSize: Size): number {
  if (!hasGrapplerFeat) return STANDARD_DRAG_COST
  // Fast Wrestler: no extra cost if target is your size or smaller
  return SIZE_ORDER.indexOf(grappledTargetSize) <= SIZE_ORDER.indexOf(grapplerSize) ? 1 : STANDARD_DRAG_COST
}

// --- Punch and Grab ---

export interface PunchAndGrabInput {
  readonly hasGrapplerFeat: boolean
  readonly unarmedStrikeHit: boolean
  readonly usedPunchAndGrabThisTurn: boolean
  readonly attackerSize: Size
  readonly targetSize: Size
  readonly attackerHasFreeHand: boolean
  readonly targetSaveFailed: boolean
  readonly targetIncapacitated: boolean
}

export interface PunchAndGrabResult {
  readonly dealsDamage: boolean
  readonly grapplesTarget: boolean
  readonly usedPunchAndGrabThisTurn: boolean
}

/**
 * Punch and Grab: on Unarmed Strike hit, combine Damage and Grapple options (1/turn).
 * Standard grapple prereqs (within-one-size, free hand) still apply.
 */
export function resolvePunchAndGrab(input: PunchAndGrabInput): PunchAndGrabResult {
  if (!input.hasGrapplerFeat || !input.unarmedStrikeHit || input.usedPunchAndGrabThisTurn) {
    return {
      dealsDamage: input.unarmedStrikeHit,
      grapplesTarget: false,
      usedPunchAndGrabThisTurn: input.usedPunchAndGrabThisTurn
    }
  }

  const grappleSucceeds =
    withinOneSize(input.attackerSize, input.targetSize) &&
    input.attackerHasFreeHand &&
    (input.targetIncapacitated || input.targetSaveFailed)

  return {
    dealsDamage: true,
    grapplesTarget: grappleSucceeds,
    usedPunchAndGrabThisTurn: true
  }
}
