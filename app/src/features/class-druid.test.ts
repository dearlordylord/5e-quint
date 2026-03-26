import { describe, expect, it } from "vitest"

import {
  archdruidEvergreenWildShape,
  archdruidNatureMagician,
  canCastInWildShape,
  canEnterWildShape,
  canExitWildShape,
  canUsePrimalStrike,
  canUseWildCompanion,
  canUseWildResurgenceForCharge,
  canUseWildResurgenceForSlot,
  druidLongRest,
  druidShortRest,
  enterWildShape,
  exitWildShape,
  isFormEligible,
  isMagician,
  isWarden,
  potentSpellcastingBonus,
  usePrimalStrike,
  useWildCompanion,
  wildResurgenceGainCharge,
  wildResurgenceGainSlot,
  wildShapeCanFly,
  wildShapeCRCap,
  wildShapeDamage,
  type WildShapeForm,
  wildShapeMaxCharges,
  type WildShapeState
} from "#/features/class-druid.ts"

// --- Helpers ---

function baseWildShapeState(overrides: Partial<WildShapeState> = {}): WildShapeState {
  return {
    inWildShape: false,
    wildShapeCharges: 2,
    wildShapeHp: 0,
    wildShapeMaxHp: 0,
    wildShapeTempHp: 0,
    originalHp: 0,
    bonusActionUsed: false,
    ...overrides
  }
}

const wolfForm: WildShapeForm = { cr: 0.25, maxHp: 11, hasFlySpeed: false }
const bearForm: WildShapeForm = { cr: 0.5, maxHp: 34, hasFlySpeed: false }
const giantEagle: WildShapeForm = { cr: 1, maxHp: 26, hasFlySpeed: true }

// --- Wild Shape charges by level ---

describe("wildShapeMaxCharges", () => {
  it("should return 0 below level 2", () => {
    expect(wildShapeMaxCharges(0)).toBe(0)
    expect(wildShapeMaxCharges(1)).toBe(0)
  })

  it("should return 2 at levels 2-5", () => {
    expect(wildShapeMaxCharges(2)).toBe(2)
    expect(wildShapeMaxCharges(5)).toBe(2)
  })

  it("should return 3 at levels 6-16", () => {
    expect(wildShapeMaxCharges(6)).toBe(3)
    expect(wildShapeMaxCharges(16)).toBe(3)
  })

  it("should return 4 at level 17+", () => {
    expect(wildShapeMaxCharges(17)).toBe(4)
    expect(wildShapeMaxCharges(20)).toBe(4)
  })
})

// --- CR cap ---

describe("wildShapeCRCap", () => {
  it("should return 0 below level 2", () => {
    expect(wildShapeCRCap(1)).toBe(0)
  })

  it("should return 1/4 at levels 2-3", () => {
    expect(wildShapeCRCap(2)).toBe(0.25)
    expect(wildShapeCRCap(3)).toBe(0.25)
  })

  it("should return 1/2 at levels 4-7", () => {
    expect(wildShapeCRCap(4)).toBe(0.5)
    expect(wildShapeCRCap(7)).toBe(0.5)
  })

  it("should return 1 at level 8+", () => {
    expect(wildShapeCRCap(8)).toBe(1)
    expect(wildShapeCRCap(20)).toBe(1)
  })
})

// --- Fly speed ---

describe("wildShapeCanFly", () => {
  it("should not allow fly speed below level 8", () => {
    expect(wildShapeCanFly(2)).toBe(false)
    expect(wildShapeCanFly(7)).toBe(false)
  })

  it("should allow fly speed at level 8+", () => {
    expect(wildShapeCanFly(8)).toBe(true)
    expect(wildShapeCanFly(20)).toBe(true)
  })
})

// --- Form eligibility ---

describe("isFormEligible", () => {
  it("should allow CR 1/4 form at level 2", () => {
    expect(isFormEligible(2, wolfForm)).toBe(true)
  })

  it("should reject CR 1/2 form at level 2", () => {
    expect(isFormEligible(2, bearForm)).toBe(false)
  })

  it("should allow CR 1/2 form at level 4", () => {
    expect(isFormEligible(4, bearForm)).toBe(true)
  })

  it("should reject fly speed form below level 8", () => {
    expect(isFormEligible(7, giantEagle)).toBe(false)
  })

  it("should allow fly speed form at level 8+", () => {
    expect(isFormEligible(8, giantEagle)).toBe(true)
  })
})

// --- Enter Wild Shape ---

describe("canEnterWildShape", () => {
  it("should allow when not shifted, has charges, bonus action free, form eligible", () => {
    const state = baseWildShapeState()
    expect(canEnterWildShape(state, { druidLevel: 2, form: wolfForm })).toBe(true)
  })

  it("should reject when already in wild shape", () => {
    const state = baseWildShapeState({ inWildShape: true })
    expect(canEnterWildShape(state, { druidLevel: 2, form: wolfForm })).toBe(false)
  })

  it("should reject when no charges", () => {
    const state = baseWildShapeState({ wildShapeCharges: 0 })
    expect(canEnterWildShape(state, { druidLevel: 2, form: wolfForm })).toBe(false)
  })

  it("should reject when bonus action used", () => {
    const state = baseWildShapeState({ bonusActionUsed: true })
    expect(canEnterWildShape(state, { druidLevel: 2, form: wolfForm })).toBe(false)
  })

  it("should reject when form CR exceeds cap", () => {
    const state = baseWildShapeState()
    expect(canEnterWildShape(state, { druidLevel: 2, form: bearForm })).toBe(false)
  })

  it("should reject below druid level 2", () => {
    const state = baseWildShapeState()
    expect(canEnterWildShape(state, { druidLevel: 1, form: wolfForm })).toBe(false)
  })
})

describe("enterWildShape", () => {
  it("should store original HP and set beast HP", () => {
    const state = baseWildShapeState()
    const result = enterWildShape(state, { druidLevel: 4, form: wolfForm }, 30)

    expect(result.inWildShape).toBe(true)
    expect(result.originalHp).toBe(30)
    expect(result.wildShapeHp).toBe(11)
    expect(result.wildShapeMaxHp).toBe(11)
    expect(result.bonusActionUsed).toBe(true)
  })

  it("should decrement charges", () => {
    const state = baseWildShapeState({ wildShapeCharges: 2 })
    const result = enterWildShape(state, { druidLevel: 2, form: wolfForm }, 20)
    expect(result.wildShapeCharges).toBe(1)
  })

  it("should grant temp HP equal to druid level", () => {
    const state = baseWildShapeState()
    const result = enterWildShape(state, { druidLevel: 6, form: wolfForm }, 30)
    expect(result.wildShapeTempHp).toBe(6)
  })

  it("should grant temp HP equal to druid level at higher levels", () => {
    const state = baseWildShapeState()
    const result = enterWildShape(state, { druidLevel: 12, form: bearForm }, 50)
    expect(result.wildShapeTempHp).toBe(12)
  })
})

// --- Exit Wild Shape ---

describe("canExitWildShape", () => {
  it("should allow when in wild shape and bonus action free", () => {
    const state = baseWildShapeState({ inWildShape: true })
    expect(canExitWildShape(state)).toBe(true)
  })

  it("should reject when not in wild shape", () => {
    const state = baseWildShapeState({ inWildShape: false })
    expect(canExitWildShape(state)).toBe(false)
  })

  it("should reject when bonus action used", () => {
    const state = baseWildShapeState({ inWildShape: true, bonusActionUsed: true })
    expect(canExitWildShape(state)).toBe(false)
  })
})

describe("exitWildShape", () => {
  it("should restore original HP", () => {
    const state = baseWildShapeState({
      inWildShape: true,
      wildShapeHp: 5,
      wildShapeMaxHp: 11,
      wildShapeTempHp: 0,
      originalHp: 30
    })
    const result = exitWildShape(state)

    expect(result.inWildShape).toBe(false)
    expect(result.restoredHp).toBe(30)
    expect(result.wildShapeHp).toBe(0)
    expect(result.wildShapeMaxHp).toBe(0)
    expect(result.wildShapeTempHp).toBe(0)
    expect(result.bonusActionUsed).toBe(true)
  })
})

// --- Wild Shape Damage ---

describe("wildShapeDamage", () => {
  it("should reduce temp HP first", () => {
    const state = baseWildShapeState({
      inWildShape: true,
      wildShapeHp: 11,
      wildShapeTempHp: 4,
      originalHp: 30
    })
    const result = wildShapeDamage(state, 3)

    expect(result.wildShapeTempHp).toBe(1)
    expect(result.wildShapeHp).toBe(11)
    expect(result.inWildShape).toBe(true)
    expect(result.overflowDamage).toBe(0)
  })

  it("should carry damage from temp HP into beast HP", () => {
    const state = baseWildShapeState({
      inWildShape: true,
      wildShapeHp: 11,
      wildShapeTempHp: 3,
      originalHp: 30
    })
    const result = wildShapeDamage(state, 5)

    expect(result.wildShapeTempHp).toBe(0)
    expect(result.wildShapeHp).toBe(9) // 11 - (5-3)
    expect(result.inWildShape).toBe(true)
    expect(result.overflowDamage).toBe(0)
  })

  it("should reduce beast HP when no temp HP", () => {
    const state = baseWildShapeState({
      inWildShape: true,
      wildShapeHp: 11,
      wildShapeTempHp: 0,
      originalHp: 30
    })
    const result = wildShapeDamage(state, 4)

    expect(result.wildShapeHp).toBe(7)
    expect(result.inWildShape).toBe(true)
    expect(result.overflowDamage).toBe(0)
  })

  it("should revert when beast HP drops to 0", () => {
    const state = baseWildShapeState({
      inWildShape: true,
      wildShapeHp: 5,
      wildShapeTempHp: 0,
      originalHp: 30
    })
    const result = wildShapeDamage(state, 5)

    expect(result.inWildShape).toBe(false)
    expect(result.restoredHp).toBe(30)
    expect(result.overflowDamage).toBe(0)
  })

  it("should carry overflow damage when beast HP is exceeded", () => {
    const state = baseWildShapeState({
      inWildShape: true,
      wildShapeHp: 5,
      wildShapeTempHp: 0,
      originalHp: 30
    })
    const result = wildShapeDamage(state, 8)

    expect(result.inWildShape).toBe(false)
    expect(result.restoredHp).toBe(30)
    expect(result.overflowDamage).toBe(3)
  })

  it("should handle overflow through temp HP and beast HP combined", () => {
    const state = baseWildShapeState({
      inWildShape: true,
      wildShapeHp: 5,
      wildShapeTempHp: 3,
      originalHp: 30
    })
    // 15 damage: 3 absorbed by temp, 5 absorbed by beast, 7 overflow
    const result = wildShapeDamage(state, 15)

    expect(result.inWildShape).toBe(false)
    expect(result.restoredHp).toBe(30)
    expect(result.overflowDamage).toBe(7)
  })
})

// --- Wild Companion ---

describe("wild companion", () => {
  it("should allow when charges > 0", () => {
    expect(canUseWildCompanion(2)).toBe(true)
    expect(canUseWildCompanion(1)).toBe(true)
  })

  it("should reject when no charges", () => {
    expect(canUseWildCompanion(0)).toBe(false)
  })

  it("should decrement charge", () => {
    const result = useWildCompanion({ wildShapeCharges: 2 })
    expect(result.wildShapeCharges).toBe(1)
  })
})

// --- Wild Resurgence ---

describe("wild resurgence: gain charge", () => {
  it("should allow when no charges, level 5+, has spell slot", () => {
    expect(canUseWildResurgenceForCharge(0, 5, true)).toBe(true)
  })

  it("should reject when still have charges", () => {
    expect(canUseWildResurgenceForCharge(1, 5, true)).toBe(false)
  })

  it("should reject below level 5", () => {
    expect(canUseWildResurgenceForCharge(0, 4, true)).toBe(false)
  })

  it("should reject when no spell slot", () => {
    expect(canUseWildResurgenceForCharge(0, 5, false)).toBe(false)
  })

  it("should add 1 charge", () => {
    const result = wildResurgenceGainCharge({ wildShapeCharges: 0, wildResurgenceSlotUsedThisLR: false })
    expect(result.wildShapeCharges).toBe(1)
  })
})

describe("wild resurgence: gain slot", () => {
  it("should allow when has charges, level 5+, not used this LR", () => {
    expect(canUseWildResurgenceForSlot(1, 5, false)).toBe(true)
  })

  it("should reject when already used this LR", () => {
    expect(canUseWildResurgenceForSlot(1, 5, true)).toBe(false)
  })

  it("should reject when no charges", () => {
    expect(canUseWildResurgenceForSlot(0, 5, false)).toBe(false)
  })

  it("should decrement charge and set used flag", () => {
    const result = wildResurgenceGainSlot({ wildShapeCharges: 2, wildResurgenceSlotUsedThisLR: false })
    expect(result.wildShapeCharges).toBe(1)
    expect(result.wildResurgenceSlotUsedThisLR).toBe(true)
  })
})

// --- Spellcasting in Wild Shape ---

describe("canCastInWildShape", () => {
  it("should not allow casting below level 18", () => {
    expect(canCastInWildShape(2, false)).toBe(false)
    expect(canCastInWildShape(17, false)).toBe(false)
  })

  it("should allow at level 18+ without costly material", () => {
    expect(canCastInWildShape(18, false)).toBe(true)
    expect(canCastInWildShape(20, false)).toBe(true)
  })

  it("should reject costly material spells even at level 18+", () => {
    expect(canCastInWildShape(18, true)).toBe(false)
  })
})

// --- Elemental Fury: Primal Strike ---

describe("primal strike", () => {
  it("should not be available below level 7", () => {
    expect(canUsePrimalStrike(6, "primalStrike")).toBe(false)
  })

  it("should not be available with potentSpellcasting choice", () => {
    expect(canUsePrimalStrike(7, "potentSpellcasting")).toBe(false)
  })

  it("should not be available with null choice", () => {
    expect(canUsePrimalStrike(7, null)).toBe(false)
  })

  it("should be available at level 7+ with primalStrike choice", () => {
    expect(canUsePrimalStrike(7, "primalStrike")).toBe(true)
    expect(canUsePrimalStrike(15, "primalStrike")).toBe(true)
  })

  it("should deal 1d8 at level 7-14", () => {
    const result = usePrimalStrike({ druidLevel: 7, chosenElement: "fire", d8Roll: 5 })
    expect(result.extraDamage).toBe(5)
    expect(result.damageType).toBe("fire")
  })

  it("should deal 2d8 at level 15+ (Improved Elemental Fury)", () => {
    const result = usePrimalStrike({
      druidLevel: 15,
      chosenElement: "cold",
      d8Roll: 5,
      secondD8Roll: 3
    })
    expect(result.extraDamage).toBe(8)
    expect(result.damageType).toBe("cold")
  })

  it("should allow any of the four elemental types", () => {
    for (const element of ["cold", "fire", "lightning", "thunder"] as const) {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- not a React hook
      const result = usePrimalStrike({ druidLevel: 7, chosenElement: element, d8Roll: 4 })
      expect(result.damageType).toBe(element)
    }
  })
})

// --- Potent Spellcasting ---

describe("potentSpellcastingBonus", () => {
  it("should return 0 below level 7", () => {
    expect(potentSpellcastingBonus(6, "potentSpellcasting", 3)).toBe(0)
  })

  it("should return 0 with primalStrike choice", () => {
    expect(potentSpellcastingBonus(7, "primalStrike", 3)).toBe(0)
  })

  it("should return wisdom modifier at level 7+", () => {
    expect(potentSpellcastingBonus(7, "potentSpellcasting", 3)).toBe(3)
    expect(potentSpellcastingBonus(7, "potentSpellcasting", 5)).toBe(5)
  })

  it("should return 0 with null choice", () => {
    expect(potentSpellcastingBonus(7, null, 3)).toBe(0)
  })
})

// --- Primal Order ---

describe("primal order", () => {
  it("should identify warden", () => {
    expect(isWarden("warden")).toBe(true)
    expect(isWarden("magician")).toBe(false)
    expect(isWarden(null)).toBe(false)
  })

  it("should identify magician", () => {
    expect(isMagician("magician")).toBe(true)
    expect(isMagician("warden")).toBe(false)
    expect(isMagician(null)).toBe(false)
  })
})

// --- Rest recovery ---

describe("druidShortRest", () => {
  it("should regain 1 Wild Shape charge", () => {
    const result = druidShortRest(0, 4)
    expect(result.wildShapeCharges).toBe(1)
  })

  it("should not exceed max charges", () => {
    const result = druidShortRest(2, 4) // max is 2 at level 4
    expect(result.wildShapeCharges).toBe(2)
  })

  it("should respect higher max at level 6+", () => {
    const result = druidShortRest(2, 6) // max is 3 at level 6
    expect(result.wildShapeCharges).toBe(3)
  })
})

describe("druidLongRest", () => {
  it("should restore all charges and reset state", () => {
    const result = druidLongRest(4)
    expect(result.wildShapeCharges).toBe(2)
    expect(result.wildResurgenceSlotUsedThisLR).toBe(false)
    expect(result.inWildShape).toBe(false)
    expect(result.wildShapeHp).toBe(0)
    expect(result.wildShapeMaxHp).toBe(0)
    expect(result.wildShapeTempHp).toBe(0)
  })

  it("should restore correct max at higher levels", () => {
    expect(druidLongRest(6).wildShapeCharges).toBe(3)
    expect(druidLongRest(17).wildShapeCharges).toBe(4)
  })
})

// --- Archdruid ---

describe("archdruidEvergreenWildShape", () => {
  it("should do nothing below level 20", () => {
    const result = archdruidEvergreenWildShape(0, 19)
    expect(result.wildShapeCharges).toBe(0)
  })

  it("should do nothing if already have charges", () => {
    const result = archdruidEvergreenWildShape(1, 20)
    expect(result.wildShapeCharges).toBe(1)
  })

  it("should regain 1 charge at level 20 with 0 charges", () => {
    const result = archdruidEvergreenWildShape(0, 20)
    expect(result.wildShapeCharges).toBe(1)
  })
})

describe("archdruidNatureMagician", () => {
  it("should convert uses to spell slot level (2 per use)", () => {
    const result = archdruidNatureMagician(4, 2)
    expect(result).not.toBeNull()
    expect(result!.wildShapeCharges).toBe(2)
    expect(result!.spellSlotLevel).toBe(4)
  })

  it("should convert 1 use to level 2 slot", () => {
    const result = archdruidNatureMagician(3, 1)
    expect(result).not.toBeNull()
    expect(result!.wildShapeCharges).toBe(2)
    expect(result!.spellSlotLevel).toBe(2)
  })

  it("should return null if not enough charges", () => {
    expect(archdruidNatureMagician(1, 2)).toBeNull()
  })

  it("should return null if 0 uses requested", () => {
    expect(archdruidNatureMagician(4, 0)).toBeNull()
  })
})
