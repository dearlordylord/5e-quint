import { describe, expect, it } from "vitest"

import {
  canTakeGrapplerFeat,
  grapplerAttackAdvantage,
  grapplerMovementCost,
  resolvePunchAndGrab
} from "#/features/feats.ts"

// --- Prerequisite ---

describe("canTakeGrapplerFeat", () => {
  it("returns true when STR >= 13", () => {
    expect(canTakeGrapplerFeat(13, 8)).toBe(true)
    expect(canTakeGrapplerFeat(18, 8)).toBe(true)
  })

  it("returns true when DEX >= 13", () => {
    expect(canTakeGrapplerFeat(8, 13)).toBe(true)
    expect(canTakeGrapplerFeat(8, 16)).toBe(true)
  })

  it("returns true when both >= 13", () => {
    expect(canTakeGrapplerFeat(14, 14)).toBe(true)
  })

  it("returns false when both < 13", () => {
    expect(canTakeGrapplerFeat(12, 12)).toBe(false)
    expect(canTakeGrapplerFeat(8, 10)).toBe(false)
  })
})

// --- Attack Advantage ---

describe("grapplerAttackAdvantage", () => {
  it("grants advantage when grappling target with feat", () => {
    const result = grapplerAttackAdvantage({ hasAdvantage: false, hasDisadvantage: false }, true, true)
    expect(result.hasAdvantage).toBe(true)
    expect(result.hasDisadvantage).toBe(false)
  })

  it("does not grant advantage without the feat", () => {
    const result = grapplerAttackAdvantage({ hasAdvantage: false, hasDisadvantage: false }, false, true)
    expect(result.hasAdvantage).toBe(false)
  })

  it("does not grant advantage when not grappling target", () => {
    const result = grapplerAttackAdvantage({ hasAdvantage: false, hasDisadvantage: false }, true, false)
    expect(result.hasAdvantage).toBe(false)
  })

  it("preserves existing advantage state", () => {
    const result = grapplerAttackAdvantage({ hasAdvantage: true, hasDisadvantage: false }, true, true)
    expect(result.hasAdvantage).toBe(true)
  })

  it("preserves existing disadvantage when adding advantage", () => {
    const result = grapplerAttackAdvantage({ hasAdvantage: false, hasDisadvantage: true }, true, true)
    expect(result.hasAdvantage).toBe(true)
    expect(result.hasDisadvantage).toBe(true)
  })
})

// --- Fast Wrestler ---

describe("grapplerMovementCost", () => {
  it("returns 1 (no extra cost) when target is smaller", () => {
    expect(grapplerMovementCost(true, "medium", "small")).toBe(1)
    expect(grapplerMovementCost(true, "large", "medium")).toBe(1)
  })

  it("returns 1 when target is same size", () => {
    expect(grapplerMovementCost(true, "medium", "medium")).toBe(1)
  })

  it("returns 2 when target is larger (standard drag cost)", () => {
    expect(grapplerMovementCost(true, "medium", "large")).toBe(2)
  })

  it("returns 2 (standard drag cost) without the feat", () => {
    expect(grapplerMovementCost(false, "medium", "small")).toBe(2)
    expect(grapplerMovementCost(false, "medium", "medium")).toBe(2)
  })
})

// --- Punch and Grab ---

const basePunchAndGrab = {
  hasGrapplerFeat: true,
  unarmedStrikeHit: true,
  usedPunchAndGrabThisTurn: false,
  attackerSize: "medium" as const,
  targetSize: "medium" as const,
  attackerHasFreeHand: true,
  targetSaveFailed: true,
  targetIncapacitated: false
}

describe("resolvePunchAndGrab", () => {
  it("deals damage and grapples on successful hit with feat", () => {
    const result = resolvePunchAndGrab(basePunchAndGrab)
    expect(result.dealsDamage).toBe(true)
    expect(result.grapplesTarget).toBe(true)
    expect(result.usedPunchAndGrabThisTurn).toBe(true)
  })

  it("only deals damage when unarmed strike misses", () => {
    const result = resolvePunchAndGrab({ ...basePunchAndGrab, unarmedStrikeHit: false })
    expect(result.dealsDamage).toBe(false)
    expect(result.grapplesTarget).toBe(false)
  })

  it("cannot be used more than once per turn", () => {
    const result = resolvePunchAndGrab({ ...basePunchAndGrab, usedPunchAndGrabThisTurn: true })
    expect(result.dealsDamage).toBe(true) // still deals damage from the hit
    expect(result.grapplesTarget).toBe(false) // but no grapple
  })

  it("does not grapple without the feat", () => {
    const result = resolvePunchAndGrab({ ...basePunchAndGrab, hasGrapplerFeat: false })
    expect(result.dealsDamage).toBe(true)
    expect(result.grapplesTarget).toBe(false)
  })

  it("does not grapple without a free hand", () => {
    const result = resolvePunchAndGrab({ ...basePunchAndGrab, attackerHasFreeHand: false })
    expect(result.dealsDamage).toBe(true)
    expect(result.grapplesTarget).toBe(false)
  })

  it("does not grapple if target save succeeds and not incapacitated", () => {
    const result = resolvePunchAndGrab({ ...basePunchAndGrab, targetSaveFailed: false })
    expect(result.dealsDamage).toBe(true)
    expect(result.grapplesTarget).toBe(false)
  })

  it("grapples incapacitated target even if save succeeds", () => {
    const result = resolvePunchAndGrab({ ...basePunchAndGrab, targetSaveFailed: false, targetIncapacitated: true })
    expect(result.grapplesTarget).toBe(true)
  })

  it("does not grapple if target is more than one size larger", () => {
    const result = resolvePunchAndGrab({ ...basePunchAndGrab, targetSize: "huge" })
    expect(result.dealsDamage).toBe(true)
    expect(result.grapplesTarget).toBe(false)
  })

  it("grapples target one size larger", () => {
    const result = resolvePunchAndGrab({ ...basePunchAndGrab, targetSize: "large" })
    expect(result.grapplesTarget).toBe(true)
  })
})
