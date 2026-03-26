import { describe, expect, it } from "vitest"

import type { FocusPoolState } from "#/features/class-monk.ts"
import {
  canFlurryOfBlows,
  canPatientDefenseFocus,
  canPatientDefenseFree,
  canStepOfTheWindFocus,
  canStepOfTheWindFree,
  canStunningStrike,
  flurryOfBlowsStrikes,
  pBonusUnarmedStrikeEligible,
  pDexterousAttacks,
  pExpendFocus,
  pFocusMax,
  pFocusSaveDC,
  pInitFocusPool,
  pMartialArtsDamage,
  pMartialArtsDie,
  pPerfectFocus,
  pRestoreFocus,
  pRestoreFocusLongRest,
  pRollInitiative,
  pUncannyMetabolism,
  useFlurryOfBlows,
  usePatientDefenseFocus,
  usePatientDefenseFree,
  useStepOfTheWindFocus,
  useStepOfTheWindFree,
  useStunningStrike
} from "#/features/class-monk.ts"
import {
  applySlowFall,
  canDeflectAttacks,
  canSelfRestore,
  canSlowFall,
  canThrowBack,
  canUseQuiveringPalm,
  canUseSuperiorDefense,
  canUseUnarmoredMovement,
  canUseWholenessOfBody,
  deflectAttacksReduction,
  deflectAttacksResult,
  disciplinedSurvivorReroll,
  hasDeflectEnergy,
  hasDisciplinedSurvivor,
  hasFleetStep,
  hasFocusEmpoweredStrikes,
  openHandTechniqueResult,
  selfRestorationConditions,
  slowFallReduction,
  throwBackDamage,
  triggerQuiveringPalm,
  unarmoredMovementBonus,
  useQuiveringPalm,
  useSuperiorDefense,
  useWholenessOfBody,
  wholenessOfBodyMaxCharges
} from "#/features/class-monk-features.ts"

// --- Helpers ---

function mkFocusPool(focusPoints: number, focusMax: number, uncannyMetabolismUsed = false): FocusPoolState {
  return { focusPoints, focusMax, uncannyMetabolismUsed }
}

// --- Focus Pool (T40) ---

describe("Focus Pool", () => {
  describe("pFocusMax", () => {
    it("returns 0 for level 1 (no focus at level 1)", () => {
      expect(pFocusMax(1)).toBe(0)
    })

    it("returns monk level for level 2+", () => {
      expect(pFocusMax(2)).toBe(2)
      expect(pFocusMax(5)).toBe(5)
      expect(pFocusMax(10)).toBe(10)
      expect(pFocusMax(20)).toBe(20)
    })
  })

  describe("pInitFocusPool", () => {
    it("initializes at full focus points", () => {
      const pool = pInitFocusPool(5)
      expect(pool.focusPoints).toBe(5)
      expect(pool.focusMax).toBe(5)
      expect(pool.uncannyMetabolismUsed).toBe(false)
    })

    it("level 1 has no focus", () => {
      const pool = pInitFocusPool(1)
      expect(pool.focusPoints).toBe(0)
      expect(pool.focusMax).toBe(0)
    })
  })

  describe("pExpendFocus", () => {
    it("decrements focus points on valid expenditure", () => {
      const state = mkFocusPool(5, 5)
      const result = pExpendFocus(state, 1)
      expect(result.focusPoints).toBe(4)
      expect(result.success).toBe(true)
    })

    it("can expend multiple points at once", () => {
      const state = mkFocusPool(5, 5)
      const result = pExpendFocus(state, 3)
      expect(result.focusPoints).toBe(2)
      expect(result.success).toBe(true)
    })

    it("can expend all remaining points", () => {
      const state = mkFocusPool(2, 5)
      const result = pExpendFocus(state, 2)
      expect(result.focusPoints).toBe(0)
      expect(result.success).toBe(true)
    })

    it("cannot expend below 0", () => {
      const state = mkFocusPool(1, 5)
      const result = pExpendFocus(state, 2)
      expect(result.focusPoints).toBe(1)
      expect(result.success).toBe(false)
    })

    it("cannot expend when at 0", () => {
      const state = mkFocusPool(0, 5)
      const result = pExpendFocus(state, 1)
      expect(result.focusPoints).toBe(0)
      expect(result.success).toBe(false)
    })

    it("rejects zero cost", () => {
      const state = mkFocusPool(5, 5)
      const result = pExpendFocus(state, 0)
      expect(result.success).toBe(false)
    })

    it("rejects negative cost", () => {
      const state = mkFocusPool(5, 5)
      const result = pExpendFocus(state, -1)
      expect(result.success).toBe(false)
    })
  })

  describe("pRestoreFocus (short rest)", () => {
    it("restores to max on short rest", () => {
      const state = mkFocusPool(2, 5)
      const result = pRestoreFocus(state)
      expect(result.focusPoints).toBe(5)
      expect(result.focusMax).toBe(5)
    })

    it("preserves uncannyMetabolismUsed on short rest", () => {
      const state = mkFocusPool(0, 5, true)
      const result = pRestoreFocus(state)
      expect(result.focusPoints).toBe(5)
      expect(result.uncannyMetabolismUsed).toBe(true)
    })
  })

  describe("pRestoreFocusLongRest", () => {
    it("restores to max and resets Uncanny Metabolism on long rest", () => {
      const state = mkFocusPool(0, 5, true)
      const result = pRestoreFocusLongRest(state)
      expect(result.focusPoints).toBe(5)
      expect(result.focusMax).toBe(5)
      expect(result.uncannyMetabolismUsed).toBe(false)
    })
  })

  describe("pUncannyMetabolism", () => {
    it("restores all FP and heals at initiative (1/LR)", () => {
      const state = mkFocusPool(1, 5)
      const dieRoll = 4
      const monkLevel = 5
      const result = pUncannyMetabolism(state, monkLevel, dieRoll)
      expect(result.focusPoints).toBe(5)
      expect(result.hpHealed).toBe(9) // monkLevel(5) + dieRoll(4)
      expect(result.uncannyMetabolismUsed).toBe(true)
      expect(result.triggered).toBe(true)
    })

    it("does not trigger if already used this long rest", () => {
      const state = mkFocusPool(1, 5, true)
      const result = pUncannyMetabolism(state, 5, 4)
      expect(result.focusPoints).toBe(1)
      expect(result.hpHealed).toBe(0)
      expect(result.triggered).toBe(false)
    })

    it("does not trigger below level 2", () => {
      const state = mkFocusPool(0, 0)
      const result = pUncannyMetabolism(state, 1, 4)
      expect(result.triggered).toBe(false)
    })

    it("healing = monk level + die roll", () => {
      const state = mkFocusPool(3, 10)
      const result = pUncannyMetabolism(state, 10, 6)
      expect(result.hpHealed).toBe(16) // 10 + 6
    })
  })

  describe("pPerfectFocus", () => {
    it("raises FP to 4 when below threshold at initiative (level 15+)", () => {
      const state = mkFocusPool(2, 15)
      const result = pPerfectFocus(state, 15)
      expect(result.focusPoints).toBe(4)
      expect(result.triggered).toBe(true)
    })

    it("raises FP to 4 when at 0", () => {
      const state = mkFocusPool(0, 15)
      const result = pPerfectFocus(state, 15)
      expect(result.focusPoints).toBe(4)
      expect(result.triggered).toBe(true)
    })

    it("raises FP to 4 when at exactly 3", () => {
      const state = mkFocusPool(3, 15)
      const result = pPerfectFocus(state, 15)
      expect(result.focusPoints).toBe(4)
      expect(result.triggered).toBe(true)
    })

    it("does not trigger when already at 4 or higher", () => {
      const state = mkFocusPool(4, 15)
      const result = pPerfectFocus(state, 15)
      expect(result.focusPoints).toBe(4)
      expect(result.triggered).toBe(false)
    })

    it("does not trigger below level 15", () => {
      const state = mkFocusPool(1, 14)
      const result = pPerfectFocus(state, 14)
      expect(result.focusPoints).toBe(1)
      expect(result.triggered).toBe(false)
    })
  })

  describe("pRollInitiative (combined)", () => {
    it("uses Uncanny Metabolism when available", () => {
      const state = mkFocusPool(1, 5)
      const result = pRollInitiative(state, 5, 4)
      expect(result.focusPoints).toBe(5)
      expect(result.hpHealed).toBe(9)
      expect(result.uncannyMetabolismUsed).toBe(true)
    })

    it("falls back to Perfect Focus when UM already used (level 15+)", () => {
      const state = mkFocusPool(2, 15, true)
      const result = pRollInitiative(state, 15, 4)
      expect(result.focusPoints).toBe(4)
      expect(result.hpHealed).toBe(0)
      expect(result.uncannyMetabolismUsed).toBe(true)
    })

    it("no effect when UM used and below Perfect Focus level", () => {
      const state = mkFocusPool(2, 5, true)
      const result = pRollInitiative(state, 5, 4)
      expect(result.focusPoints).toBe(2)
      expect(result.hpHealed).toBe(0)
    })

    it("Perfect Focus does not trigger when FP >= 4 even if UM used", () => {
      const state = mkFocusPool(5, 15, true)
      const result = pRollInitiative(state, 15, 4)
      expect(result.focusPoints).toBe(5)
      expect(result.hpHealed).toBe(0)
    })
  })

  describe("pFocusSaveDC", () => {
    it("computes 8 + WIS mod + proficiency bonus", () => {
      expect(pFocusSaveDC(3, 2)).toBe(13)
      expect(pFocusSaveDC(5, 4)).toBe(17)
      expect(pFocusSaveDC(0, 2)).toBe(10)
    })
  })
})

// --- Martial Arts (T41) ---

describe("Martial Arts", () => {
  describe("pMartialArtsDie", () => {
    it("d6 at level 1", () => {
      expect(pMartialArtsDie(1)).toBe(6)
    })

    it("d6 at level 4", () => {
      expect(pMartialArtsDie(4)).toBe(6)
    })

    it("d8 at level 5", () => {
      expect(pMartialArtsDie(5)).toBe(8)
    })

    it("d8 at level 10", () => {
      expect(pMartialArtsDie(10)).toBe(8)
    })

    it("d10 at level 11", () => {
      expect(pMartialArtsDie(11)).toBe(10)
    })

    it("d10 at level 16", () => {
      expect(pMartialArtsDie(16)).toBe(10)
    })

    it("d12 at level 17", () => {
      expect(pMartialArtsDie(17)).toBe(12)
    })

    it("d12 at level 20", () => {
      expect(pMartialArtsDie(20)).toBe(12)
    })
  })

  describe("pDexterousAttacks", () => {
    it("uses DEX when DEX mod is higher for unarmed", () => {
      expect(pDexterousAttacks(2, 4, "unarmed")).toBe("dex")
    })

    it("uses STR when STR mod is higher for unarmed", () => {
      expect(pDexterousAttacks(4, 2, "unarmed")).toBe("str")
    })

    it("uses DEX when equal for unarmed", () => {
      expect(pDexterousAttacks(3, 3, "unarmed")).toBe("dex")
    })

    it("uses DEX when DEX mod is higher for monk weapon", () => {
      expect(pDexterousAttacks(1, 3, "monkWeapon")).toBe("dex")
    })

    it("always uses STR for non-monk weapons", () => {
      expect(pDexterousAttacks(1, 5, "other")).toBe("str")
    })
  })

  describe("pMartialArtsDamage", () => {
    it("uses MA die when larger than weapon die", () => {
      // Level 5 monk (d8) with d6 weapon
      expect(pMartialArtsDamage(5, 6)).toBe(8)
    })

    it("uses weapon die when larger than MA die", () => {
      // Level 1 monk (d6) with d8 weapon
      expect(pMartialArtsDamage(1, 8)).toBe(8)
    })

    it("uses MA die when equal to weapon die", () => {
      expect(pMartialArtsDamage(5, 8)).toBe(8)
    })

    it("unarmed strike (d1) always uses MA die", () => {
      expect(pMartialArtsDamage(1, 1)).toBe(6)
    })
  })

  describe("pBonusUnarmedStrikeEligible", () => {
    it("eligible after Attack action with unarmed strike, no armor/shield", () => {
      expect(pBonusUnarmedStrikeEligible(true, "unarmed", false, false)).toBe(true)
    })

    it("eligible after Attack action with monk weapon, no armor/shield", () => {
      expect(pBonusUnarmedStrikeEligible(true, "monkWeapon", false, false)).toBe(true)
    })

    it("not eligible with non-monk weapon", () => {
      expect(pBonusUnarmedStrikeEligible(true, "other", false, false)).toBe(false)
    })

    it("not eligible without Attack action", () => {
      expect(pBonusUnarmedStrikeEligible(false, "unarmed", false, false)).toBe(false)
    })

    it("not eligible when wearing armor", () => {
      expect(pBonusUnarmedStrikeEligible(true, "unarmed", true, false)).toBe(false)
    })

    it("not eligible when wielding shield", () => {
      expect(pBonusUnarmedStrikeEligible(true, "unarmed", false, true)).toBe(false)
    })
  })
})

// --- Focus Actions (T42) ---

describe("Flurry of Blows", () => {
  it("can't use without FP", () => {
    expect(canFlurryOfBlows(0, false)).toBe(false)
  })

  it("can't use if bonus action used", () => {
    expect(canFlurryOfBlows(3, true)).toBe(false)
  })

  it("costs 1 FP", () => {
    const result = useFlurryOfBlows(3, 5)
    expect(result.focusPoints).toBe(2)
    expect(result.bonusActionUsed).toBe(true)
  })

  it("2 strikes before L10", () => {
    expect(flurryOfBlowsStrikes(2)).toBe(2)
    expect(flurryOfBlowsStrikes(9)).toBe(2)
    const result = useFlurryOfBlows(3, 9)
    expect(result.unarmedStrikes).toBe(2)
  })

  it("3 strikes at L10+", () => {
    expect(flurryOfBlowsStrikes(10)).toBe(3)
    expect(flurryOfBlowsStrikes(20)).toBe(3)
    const result = useFlurryOfBlows(3, 10)
    expect(result.unarmedStrikes).toBe(3)
  })
})

describe("Patient Defense", () => {
  it("free version: no FP cost, only Disengage", () => {
    const result = usePatientDefenseFree(5)
    expect(result.focusPoints).toBe(5)
    expect(result.bonusActionUsed).toBe(true)
    expect(result.disengageGranted).toBe(true)
    expect(result.dodgeGranted).toBe(false)
    expect(result.tempHp).toBe(0)
  })

  it("focus version: costs 1 FP, Disengage + Dodge", () => {
    const result = usePatientDefenseFocus(5, 5, 4)
    expect(result.focusPoints).toBe(4)
    expect(result.bonusActionUsed).toBe(true)
    expect(result.disengageGranted).toBe(true)
    expect(result.dodgeGranted).toBe(true)
    expect(result.tempHp).toBe(0)
  })

  it("focus version at L10+: also grants temp HP", () => {
    const result = usePatientDefenseFocus(5, 10, 6)
    expect(result.focusPoints).toBe(4)
    expect(result.dodgeGranted).toBe(true)
    expect(result.tempHp).toBe(6)
  })

  it("can't use if bonus action already used (free)", () => {
    expect(canPatientDefenseFree(true)).toBe(false)
    expect(canPatientDefenseFree(false)).toBe(true)
  })

  it("can't use if bonus action already used (focus)", () => {
    expect(canPatientDefenseFocus(3, true)).toBe(false)
  })

  it("can't use focus without FP", () => {
    expect(canPatientDefenseFocus(0, false)).toBe(false)
  })
})

describe("Step of the Wind", () => {
  it("free version: no FP cost, only Dash", () => {
    const result = useStepOfTheWindFree(5)
    expect(result.focusPoints).toBe(5)
    expect(result.bonusActionUsed).toBe(true)
    expect(result.dashGranted).toBe(true)
    expect(result.disengageGranted).toBe(false)
    expect(result.jumpDistanceDoubled).toBe(false)
    expect(result.canCarryAlly).toBe(false)
  })

  it("focus version: costs 1 FP, Dash + Disengage + double jump", () => {
    const result = useStepOfTheWindFocus(5, 5)
    expect(result.focusPoints).toBe(4)
    expect(result.bonusActionUsed).toBe(true)
    expect(result.dashGranted).toBe(true)
    expect(result.disengageGranted).toBe(true)
    expect(result.jumpDistanceDoubled).toBe(true)
    expect(result.canCarryAlly).toBe(false)
  })

  it("focus version at L10+: can carry ally", () => {
    const result = useStepOfTheWindFocus(5, 10)
    expect(result.focusPoints).toBe(4)
    expect(result.disengageGranted).toBe(true)
    expect(result.jumpDistanceDoubled).toBe(true)
    expect(result.canCarryAlly).toBe(true)
  })

  it("can't use if bonus action already used (free)", () => {
    expect(canStepOfTheWindFree(true)).toBe(false)
    expect(canStepOfTheWindFree(false)).toBe(true)
  })

  it("can't use if bonus action already used (focus)", () => {
    expect(canStepOfTheWindFocus(3, true)).toBe(false)
  })

  it("can't use focus without FP", () => {
    expect(canStepOfTheWindFocus(0, false)).toBe(false)
  })
})

// --- Stunning Strike (T43) ---

describe("Stunning Strike", () => {
  it("can't use below L5", () => {
    expect(canStunningStrike(4, 5, false, "unarmed")).toBe(false)
  })

  it("costs 1 FP", () => {
    const result = useStunningStrike(5, false)
    expect(result.focusPoints).toBe(4)
  })

  it("once per turn only", () => {
    expect(canStunningStrike(5, 5, true, "unarmed")).toBe(false)
  })

  it("must be unarmed or monk weapon, not other", () => {
    expect(canStunningStrike(5, 5, false, "unarmed")).toBe(true)
    expect(canStunningStrike(5, 5, false, "monkWeapon")).toBe(true)
    expect(canStunningStrike(5, 5, false, "other")).toBe(false)
  })

  it("can't use without FP", () => {
    expect(canStunningStrike(5, 0, false, "unarmed")).toBe(false)
  })

  it("failed save: target stunned", () => {
    const result = useStunningStrike(5, false)
    expect(result.stunningStrikeUsedThisTurn).toBe(true)
    expect(result.targetStunned).toBe(true)
    expect(result.targetSpeedHalved).toBe(false)
    expect(result.advantageOnNextAttackVsTarget).toBe(false)
  })

  it("successful save: speed halved + advantage on next attack vs target", () => {
    const result = useStunningStrike(5, true)
    expect(result.stunningStrikeUsedThisTurn).toBe(true)
    expect(result.targetStunned).toBe(false)
    expect(result.targetSpeedHalved).toBe(true)
    expect(result.advantageOnNextAttackVsTarget).toBe(true)
  })
})

// --- Monk Passives (T44) ---

describe("Unarmored Movement", () => {
  it("returns 0 at L1", () => {
    expect(unarmoredMovementBonus(1)).toBe(0)
  })

  it("+10ft at L2-5", () => {
    expect(unarmoredMovementBonus(2)).toBe(10)
    expect(unarmoredMovementBonus(5)).toBe(10)
  })

  it("+15ft at L6-9", () => {
    expect(unarmoredMovementBonus(6)).toBe(15)
    expect(unarmoredMovementBonus(9)).toBe(15)
  })

  it("+20ft at L10-13", () => {
    expect(unarmoredMovementBonus(10)).toBe(20)
    expect(unarmoredMovementBonus(13)).toBe(20)
  })

  it("+25ft at L14-17", () => {
    expect(unarmoredMovementBonus(14)).toBe(25)
    expect(unarmoredMovementBonus(17)).toBe(25)
  })

  it("+30ft at L18-20", () => {
    expect(unarmoredMovementBonus(18)).toBe(30)
    expect(unarmoredMovementBonus(20)).toBe(30)
  })

  it("denied with armor", () => {
    expect(canUseUnarmoredMovement(true, false)).toBe(false)
  })

  it("denied with shield", () => {
    expect(canUseUnarmoredMovement(false, true)).toBe(false)
  })

  it("allowed without armor or shield", () => {
    expect(canUseUnarmoredMovement(false, false)).toBe(true)
  })
})

describe("Focus-Empowered Strikes", () => {
  it("not available below L6", () => {
    expect(hasFocusEmpoweredStrikes(5)).toBe(false)
  })

  it("available at L6+", () => {
    expect(hasFocusEmpoweredStrikes(6)).toBe(true)
    expect(hasFocusEmpoweredStrikes(20)).toBe(true)
  })
})

describe("Self-Restoration", () => {
  it("not available below L10", () => {
    expect(canSelfRestore(9)).toBe(false)
  })

  it("available at L10+", () => {
    expect(canSelfRestore(10)).toBe(true)
    expect(canSelfRestore(20)).toBe(true)
  })

  it("removes charmed, frightened, poisoned", () => {
    const conditions = selfRestorationConditions()
    expect(conditions).toEqual(["charmed", "frightened", "poisoned"])
  })
})

describe("Deflect Energy", () => {
  it("not available below L13", () => {
    expect(hasDeflectEnergy(12)).toBe(false)
  })

  it("available at L13+", () => {
    expect(hasDeflectEnergy(13)).toBe(true)
  })
})

describe("Disciplined Survivor", () => {
  it("not available below L14", () => {
    expect(hasDisciplinedSurvivor(13)).toBe(false)
  })

  it("available at L14+", () => {
    expect(hasDisciplinedSurvivor(14)).toBe(true)
  })

  it("reroll expends 1 FP and returns new roll", () => {
    const result = disciplinedSurvivorReroll(5, 18)
    expect(result.focusPoints).toBe(4)
    expect(result.newSaveResult).toBe(18)
  })
})

describe("Superior Defense", () => {
  it("can't use below L18", () => {
    expect(canUseSuperiorDefense(17, 10, 1)).toBe(false)
  })

  it("can't use without 3 FP", () => {
    expect(canUseSuperiorDefense(18, 2, 1)).toBe(false)
  })

  it("can't use if action used", () => {
    expect(canUseSuperiorDefense(18, 10, 0)).toBe(false)
  })

  it("can use at L18+ with 3 FP and action available", () => {
    expect(canUseSuperiorDefense(18, 3, 1)).toBe(true)
  })

  it("costs 3 FP and grants resistance for 1 minute", () => {
    const result = useSuperiorDefense(10)
    expect(result.focusPoints).toBe(7)
    expect(result.resistancesGranted).toBe(true)
    expect(result.durationMinutes).toBe(1)
  })
})

// --- Monk Reactions (T45) ---

describe("Deflect Attacks", () => {
  it("reduction = d10 + DEX mod + monk level", () => {
    // d10=7, DEX=4, level=5 => 16
    expect(deflectAttacksReduction(7, 4, 5)).toBe(16)
  })

  it("reduction at higher levels", () => {
    // d10=10, DEX=5, level=20 => 35
    expect(deflectAttacksReduction(10, 5, 20)).toBe(35)
  })

  it("can't use below L3", () => {
    expect(canDeflectAttacks(2, true, true, false)).toBe(false)
  })

  it("can't use without reaction", () => {
    expect(canDeflectAttacks(5, false, true, false)).toBe(false)
  })

  it("requires weapon attack before L13", () => {
    expect(canDeflectAttacks(5, true, false, false)).toBe(false)
    expect(canDeflectAttacks(5, true, true, false)).toBe(true)
  })

  it("any damage type at L13+ (Deflect Energy)", () => {
    expect(canDeflectAttacks(13, true, false, true)).toBe(true)
  })

  it("result: damage reduced correctly", () => {
    const result = deflectAttacksResult(20, 16)
    expect(result.damageTaken).toBe(4)
    expect(result.reducedToZero).toBe(false)
  })

  it("result: reduced to zero", () => {
    const result = deflectAttacksResult(15, 20)
    expect(result.damageTaken).toBe(0)
    expect(result.reducedToZero).toBe(true)
  })

  it("result: exact reduction to zero", () => {
    const result = deflectAttacksResult(16, 16)
    expect(result.damageTaken).toBe(0)
    expect(result.reducedToZero).toBe(true)
  })

  it("can throw back when reduced to 0 and has 1 FP", () => {
    expect(canThrowBack(true, 1)).toBe(true)
  })

  it("can't throw back when not reduced to 0", () => {
    expect(canThrowBack(false, 5)).toBe(false)
  })

  it("can't throw back without FP", () => {
    expect(canThrowBack(true, 0)).toBe(false)
  })

  it("throw-back uses two rolls of Martial Arts die + DEX mod", () => {
    const result = throwBackDamage(5, 4)
    expect(result.dieCount).toBe(2)
    expect(result.dieSize).toBe(8) // L5 = d8
    expect(result.modifier).toBe(4)
  })

  it("throw-back die scales with level", () => {
    expect(throwBackDamage(1, 3).dieCount).toBe(2)
    expect(throwBackDamage(1, 3).dieSize).toBe(6)
    expect(throwBackDamage(11, 3).dieCount).toBe(2)
    expect(throwBackDamage(11, 3).dieSize).toBe(10)
    expect(throwBackDamage(17, 3).dieCount).toBe(2)
    expect(throwBackDamage(17, 3).dieSize).toBe(12)
  })
})

describe("Slow Fall", () => {
  it("reduction = 5 * monk level", () => {
    expect(slowFallReduction(4)).toBe(20)
    expect(slowFallReduction(10)).toBe(50)
    expect(slowFallReduction(20)).toBe(100)
  })

  it("can't use below L4", () => {
    expect(canSlowFall(3, true)).toBe(false)
  })

  it("can't use without reaction", () => {
    expect(canSlowFall(4, false)).toBe(false)
  })

  it("can use at L4+ with reaction", () => {
    expect(canSlowFall(4, true)).toBe(true)
  })

  it("reduces fall damage, minimum 0", () => {
    expect(applySlowFall(30, 4)).toBe(10) // 30 - 20 = 10
    expect(applySlowFall(15, 4)).toBe(0) // 15 - 20 = -5 -> 0
    expect(applySlowFall(20, 4)).toBe(0) // 20 - 20 = 0
  })
})

// --- Warrior of the Open Hand (T46) ---

describe("Open Hand Technique", () => {
  it("Addle: no save, can't make Opportunity Attacks", () => {
    const result = openHandTechniqueResult("addle", false, "medium")
    expect(result.effectApplied).toBe(true)
    expect(result.cantMakeOpportunityAttacks).toBe(true)
    expect(result.pushedFeet).toBe(0)
    expect(result.prone).toBe(false)
  })

  it("Addle: works regardless of save result", () => {
    const result = openHandTechniqueResult("addle", true, "huge")
    expect(result.effectApplied).toBe(true)
    expect(result.cantMakeOpportunityAttacks).toBe(true)
  })

  it("Push: failed save, Large or smaller, pushed 15ft", () => {
    const result = openHandTechniqueResult("push", false, "large")
    expect(result.effectApplied).toBe(true)
    expect(result.pushedFeet).toBe(15)
  })

  it("Push: successful save, not pushed", () => {
    const result = openHandTechniqueResult("push", true, "medium")
    expect(result.effectApplied).toBe(false)
    expect(result.pushedFeet).toBe(0)
  })

  it("Push: Huge target, not pushed", () => {
    const result = openHandTechniqueResult("push", false, "huge")
    expect(result.effectApplied).toBe(false)
    expect(result.pushedFeet).toBe(0)
  })

  it("Push: Gargantuan target, not pushed", () => {
    const result = openHandTechniqueResult("push", false, "gargantuan")
    expect(result.effectApplied).toBe(false)
    expect(result.pushedFeet).toBe(0)
  })

  it("Push: Small target, failed save, pushed", () => {
    const result = openHandTechniqueResult("push", false, "small")
    expect(result.effectApplied).toBe(true)
    expect(result.pushedFeet).toBe(15)
  })

  it("Topple: failed save, target Prone", () => {
    const result = openHandTechniqueResult("topple", false, "medium")
    expect(result.effectApplied).toBe(true)
    expect(result.prone).toBe(true)
  })

  it("Topple: successful save, not Prone", () => {
    const result = openHandTechniqueResult("topple", true, "medium")
    expect(result.effectApplied).toBe(false)
    expect(result.prone).toBe(false)
  })
})

describe("Wholeness of Body", () => {
  it("can't use without charges", () => {
    expect(canUseWholenessOfBody(0, false)).toBe(false)
  })

  it("can't use if bonus action used", () => {
    expect(canUseWholenessOfBody(2, true)).toBe(false)
  })

  it("can use with charges and bonus action available", () => {
    expect(canUseWholenessOfBody(1, false)).toBe(true)
  })

  it("max charges = WIS mod (min 1)", () => {
    expect(wholenessOfBodyMaxCharges(3)).toBe(3)
    expect(wholenessOfBodyMaxCharges(5)).toBe(5)
    expect(wholenessOfBodyMaxCharges(0)).toBe(1)
    expect(wholenessOfBodyMaxCharges(-1)).toBe(1)
  })

  it("heal = Martial Arts die + WIS mod, decrements charges", () => {
    const result = useWholenessOfBody(3, 5, 3)
    expect(result.healAmount).toBe(8)
    expect(result.wholenessCharges).toBe(2)
    expect(result.bonusActionUsed).toBe(true)
  })

  it("heal minimum 1 HP", () => {
    const result = useWholenessOfBody(2, 1, -1)
    expect(result.healAmount).toBe(1) // max(1, 1 + (-1)) = max(1, 0) = 1
    expect(result.wholenessCharges).toBe(1)
  })
})

describe("Fleet Step", () => {
  it("not available below L11", () => {
    expect(hasFleetStep(10)).toBe(false)
  })

  it("available at L11+", () => {
    expect(hasFleetStep(11)).toBe(true)
    expect(hasFleetStep(20)).toBe(true)
  })
})

describe("Quivering Palm", () => {
  it("can't use below L17", () => {
    expect(canUseQuiveringPalm(16, 10)).toBe(false)
  })

  it("can't use without 4 FP", () => {
    expect(canUseQuiveringPalm(17, 3)).toBe(false)
  })

  it("can use at L17+ with 4 FP", () => {
    expect(canUseQuiveringPalm(17, 4)).toBe(true)
  })

  it("costs 4 FP and activates", () => {
    const result = useQuiveringPalm(10)
    expect(result.focusPoints).toBe(6)
    expect(result.quiveringPalmActive).toBe(true)
  })

  it("trigger: failed save = full 10d12 Force damage", () => {
    const result = triggerQuiveringPalm(false, 55)
    expect(result.forceDamage).toBe(55)
  })

  it("trigger: successful save = half damage (floored)", () => {
    const result = triggerQuiveringPalm(true, 55)
    expect(result.forceDamage).toBe(27)
  })

  it("trigger: successful save with even damage", () => {
    const result = triggerQuiveringPalm(true, 60)
    expect(result.forceDamage).toBe(30)
  })
})
