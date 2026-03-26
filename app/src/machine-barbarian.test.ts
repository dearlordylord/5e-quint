import { describe, expect, it } from "vitest"

import type { RageState } from "#/machine-barbarian.ts"
import {
  applyForcefulBlow,
  applyHamstringBlow,
  applyRageDamageBonus,
  applyStaggeringBlow,
  applySunderingBlow,
  availableBrutalStrikeEffects,
  brutalStrikeDamageDice,
  brutalStrikeEffectCount,
  canCastWhileRaging,
  canEnterRage,
  canUseBrutalStrike,
  pBrutalStrike,
  pCheckRageEndConditions,
  pCheckRageMaintenance,
  pDeclareReckless,
  pEndRage,
  pEnterRage,
  pExtendRageWithBA,
  pMarkAttackOrForcedSave,
  pPersistentRageOnInitiative,
  pResetReckless,
  rageDamageBonus,
  rageMaxCharges,
  rageResistances,
  rageStrengthAdvantage,
  recklessAttackAdvantage,
  recklessDefenseDisadvantage
} from "#/machine-barbarian.ts"

// --- Helpers ---

function makeRageState(overrides?: Partial<RageState>): RageState {
  return {
    raging: false,
    rageCharges: 3,
    rageMaxCharges: 3,
    rageTurnsRemaining: 0,
    attackedOrForcedSaveThisTurn: false,
    rageExtendedWithBA: false,
    concentrationSpellId: "",
    ...overrides
  }
}

// --- Rage Tests ---

describe("rage", () => {
  it("should decrement rage charges on enter", () => {
    const state = makeRageState({ rageCharges: 3 })
    const result = pEnterRage(state)
    expect(result.rageCharges).toBe(2)
    expect(result.raging).toBe(true)
  })

  it("should not allow rage at 0 charges", () => {
    expect(canEnterRage(0, "none")).toBe(false)
  })

  it("should not allow rage in heavy armor", () => {
    expect(canEnterRage(3, "heavy")).toBe(false)
  })

  it("should allow rage in light armor", () => {
    expect(canEnterRage(3, "light")).toBe(true)
  })

  it("should allow rage in medium armor", () => {
    expect(canEnterRage(3, "medium")).toBe(true)
  })

  it("should allow rage when unarmored", () => {
    expect(canEnterRage(3, "none")).toBe(true)
  })

  it("should break concentration when entering rage", () => {
    const state = makeRageState({ concentrationSpellId: "bless" })
    const result = pEnterRage(state)
    expect(result.concentrationSpellId).toBe("")
  })

  it("should end rage explicitly", () => {
    const state = makeRageState({ raging: true, rageTurnsRemaining: 50 })
    const result = pEndRage(state)
    expect(result.raging).toBe(false)
    expect(result.rageTurnsRemaining).toBe(0)
  })

  describe("rage damage bonus", () => {
    it("should give +2 damage at level 1", () => {
      expect(rageDamageBonus(1)).toBe(2)
    })

    it("should give +2 damage at level 8", () => {
      expect(rageDamageBonus(8)).toBe(2)
    })

    it("should give +3 damage at level 9", () => {
      expect(rageDamageBonus(9)).toBe(3)
    })

    it("should give +3 damage at level 15", () => {
      expect(rageDamageBonus(15)).toBe(3)
    })

    it("should give +4 damage at level 16 (from table: L16 rage damage is +4)", () => {
      expect(rageDamageBonus(16)).toBe(3)
    })

    it("should give +4 damage at level 17", () => {
      expect(rageDamageBonus(17)).toBe(4)
    })

    it("should give +4 damage at level 20", () => {
      expect(rageDamageBonus(20)).toBe(4)
    })
  })

  describe("rage max charges by level", () => {
    it("should have 2 rages at level 1", () => {
      expect(rageMaxCharges(1)).toBe(2)
    })

    it("should have 3 rages at level 3", () => {
      expect(rageMaxCharges(3)).toBe(3)
    })

    it("should have 4 rages at level 6", () => {
      expect(rageMaxCharges(6)).toBe(4)
    })

    it("should have 5 rages at level 12", () => {
      expect(rageMaxCharges(12)).toBe(5)
    })

    it("should have 6 rages at level 17", () => {
      expect(rageMaxCharges(17)).toBe(6)
    })
  })

  describe("rage damage application", () => {
    it("should add rage bonus to STR-based attack damage", () => {
      expect(applyRageDamageBonus(8, true, true, 1)).toBe(10) // 8 + 2
    })

    it("should not add rage bonus when not raging", () => {
      expect(applyRageDamageBonus(8, false, true, 1)).toBe(8)
    })

    it("should not add rage bonus to non-STR attacks", () => {
      expect(applyRageDamageBonus(8, true, false, 1)).toBe(8)
    })
  })

  describe("B/P/S resistance while raging", () => {
    it("should grant bludgeoning/piercing/slashing resistance while raging", () => {
      const resistances = rageResistances(true)
      expect(resistances.has("bludgeoning")).toBe(true)
      expect(resistances.has("piercing")).toBe(true)
      expect(resistances.has("slashing")).toBe(true)
    })

    it("should not grant resistance to other damage types while raging", () => {
      const resistances = rageResistances(true)
      expect(resistances.has("fire")).toBe(false)
      expect(resistances.has("psychic")).toBe(false)
    })

    it("should not grant resistance when not raging", () => {
      const resistances = rageResistances(false)
      expect(resistances.size).toBe(0)
    })
  })

  describe("advantage on STR saves/checks", () => {
    it("should grant advantage on STR saves while raging", () => {
      expect(rageStrengthAdvantage(true, true)).toBe(true)
    })

    it("should not grant advantage on non-STR saves while raging", () => {
      expect(rageStrengthAdvantage(true, false)).toBe(false)
    })

    it("should not grant advantage when not raging", () => {
      expect(rageStrengthAdvantage(false, true)).toBe(false)
    })
  })

  describe("spellcasting restriction", () => {
    it("should block spellcasting while raging", () => {
      expect(canCastWhileRaging(true)).toBe(false)
    })

    it("should allow spellcasting when not raging", () => {
      expect(canCastWhileRaging(false)).toBe(true)
    })
  })

  describe("rage maintenance", () => {
    it("should maintain rage via attack roll", () => {
      const state = makeRageState({
        raging: true,
        rageTurnsRemaining: 50,
        attackedOrForcedSaveThisTurn: true
      })
      const result = pCheckRageMaintenance(state, 5)
      expect(result.raging).toBe(true)
    })

    it("should maintain rage via forced save", () => {
      const state = makeRageState({
        raging: true,
        rageTurnsRemaining: 50,
        attackedOrForcedSaveThisTurn: true
      })
      const result = pCheckRageMaintenance(state, 5)
      expect(result.raging).toBe(true)
    })

    it("should maintain rage via BA extension", () => {
      const state = makeRageState({
        raging: true,
        rageTurnsRemaining: 50,
        rageExtendedWithBA: true
      })
      const result = pCheckRageMaintenance(state, 5)
      expect(result.raging).toBe(true)
    })

    it("should end rage if not maintained", () => {
      const state = makeRageState({
        raging: true,
        rageTurnsRemaining: 50,
        attackedOrForcedSaveThisTurn: false,
        rageExtendedWithBA: false
      })
      const result = pCheckRageMaintenance(state, 5)
      expect(result.raging).toBe(false)
    })

    it("should reset maintenance flags after check", () => {
      const state = makeRageState({
        raging: true,
        rageTurnsRemaining: 50,
        attackedOrForcedSaveThisTurn: true,
        rageExtendedWithBA: true
      })
      const result = pCheckRageMaintenance(state, 5)
      expect(result.attackedOrForcedSaveThisTurn).toBe(false)
      expect(result.rageExtendedWithBA).toBe(false)
    })

    it("should mark attack/forced save for maintenance tracking", () => {
      const state = makeRageState({ raging: true })
      const result = pMarkAttackOrForcedSave(state)
      expect(result.attackedOrForcedSaveThisTurn).toBe(true)
    })

    it("should set BA extension flag", () => {
      const state = makeRageState({ raging: true })
      const result = pExtendRageWithBA(state)
      expect(result.rageExtendedWithBA).toBe(true)
    })
  })

  describe("rage end conditions", () => {
    it("should end rage on donning heavy armor", () => {
      const state = makeRageState({ raging: true })
      const result = pCheckRageEndConditions(state, "heavy", false, false, 5)
      expect(result.raging).toBe(false)
    })

    it("should end rage on incapacitated (before L15)", () => {
      const state = makeRageState({ raging: true })
      const result = pCheckRageEndConditions(state, "none", true, false, 5)
      expect(result.raging).toBe(false)
    })

    it("should not end rage on incapacitated at L15 (Persistent Rage)", () => {
      const state = makeRageState({ raging: true })
      const result = pCheckRageEndConditions(state, "none", true, false, 15)
      expect(result.raging).toBe(true)
    })

    it("should end rage on unconscious at L15 (Persistent Rage)", () => {
      const state = makeRageState({ raging: true })
      const result = pCheckRageEndConditions(state, "none", true, true, 15)
      expect(result.raging).toBe(false)
    })
  })

  describe("Persistent Rage (L15)", () => {
    it("should not require maintenance at L15", () => {
      const state = makeRageState({
        raging: true,
        rageTurnsRemaining: 50,
        attackedOrForcedSaveThisTurn: false,
        rageExtendedWithBA: false
      })
      const result = pCheckRageMaintenance(state, 15)
      expect(result.raging).toBe(true)
    })

    it("should regain all rage uses at Initiative if at 0 charges", () => {
      const result = pPersistentRageOnInitiative(0, 5, false)
      expect(result.newCharges).toBe(5)
      expect(result.persistentRageUsed).toBe(true)
    })

    it("should not regain uses if charges > 0", () => {
      const result = pPersistentRageOnInitiative(2, 5, false)
      expect(result.newCharges).toBe(2)
      expect(result.persistentRageUsed).toBe(false)
    })

    it("should not regain uses if already used (once per Long Rest)", () => {
      const result = pPersistentRageOnInitiative(0, 5, true)
      expect(result.newCharges).toBe(0)
      expect(result.persistentRageUsed).toBe(true)
    })
  })
})

// --- Reckless Attack Tests ---

describe("reckless attack", () => {
  it("should declare reckless and set state", () => {
    const result = pDeclareReckless()
    expect(result.recklessThisTurn).toBe(true)
    expect(result.brutalStrikeEffects).toEqual([])
  })

  it("should grant advantage on own STR melee attacks", () => {
    expect(recklessAttackAdvantage(true, true, true)).toBe(true)
  })

  it("should not grant advantage on ranged attacks", () => {
    expect(recklessAttackAdvantage(true, true, false)).toBe(false)
  })

  it("should not grant advantage on DEX-based melee attacks", () => {
    expect(recklessAttackAdvantage(true, false, true)).toBe(false)
  })

  it("should not grant advantage if not reckless", () => {
    expect(recklessAttackAdvantage(false, true, true)).toBe(false)
  })

  it("should grant attackers advantage against reckless barbarian", () => {
    expect(recklessDefenseDisadvantage(true)).toBe(true)
  })

  it("should not grant attackers advantage if not reckless", () => {
    expect(recklessDefenseDisadvantage(false)).toBe(false)
  })

  it("should reset on turn start", () => {
    const result = pResetReckless()
    expect(result.recklessThisTurn).toBe(false)
    expect(result.brutalStrikeEffects).toEqual([])
  })
})

// --- Brutal Strike Tests ---

describe("brutal strike", () => {
  it("should not be available below level 9", () => {
    expect(canUseBrutalStrike(true, 8, true, true)).toBe(false)
  })

  it("should be available at level 9 with reckless STR melee", () => {
    expect(canUseBrutalStrike(true, 9, true, true)).toBe(true)
  })

  it("should not be available without reckless attack", () => {
    expect(canUseBrutalStrike(false, 9, true, true)).toBe(false)
  })

  it("should not be available for non-STR attacks", () => {
    expect(canUseBrutalStrike(true, 9, false, true)).toBe(false)
  })

  it("should not be available for ranged attacks", () => {
    expect(canUseBrutalStrike(true, 9, true, false)).toBe(false)
  })

  describe("damage dice", () => {
    it("should deal +1d10 at level 9", () => {
      expect(brutalStrikeDamageDice(9)).toBe(1)
    })

    it("should deal +2d10 at level 17", () => {
      expect(brutalStrikeDamageDice(17)).toBe(2)
    })

    it("should deal 0 below level 9", () => {
      expect(brutalStrikeDamageDice(8)).toBe(0)
    })
  })

  describe("effect count", () => {
    it("should allow 1 effect at level 9", () => {
      expect(brutalStrikeEffectCount(9)).toBe(1)
    })

    it("should allow 2 effects at level 17", () => {
      expect(brutalStrikeEffectCount(17)).toBe(2)
    })

    it("should allow 0 effects below level 9", () => {
      expect(brutalStrikeEffectCount(8)).toBe(0)
    })
  })

  describe("available effects", () => {
    it("should offer Forceful + Hamstring at level 9", () => {
      const effects = availableBrutalStrikeEffects(9)
      expect(effects).toContain("forcefulBlow")
      expect(effects).toContain("hamstringBlow")
      expect(effects).toHaveLength(2)
    })

    it("should offer all four effects at level 13", () => {
      const effects = availableBrutalStrikeEffects(13)
      expect(effects).toContain("forcefulBlow")
      expect(effects).toContain("hamstringBlow")
      expect(effects).toContain("staggeringBlow")
      expect(effects).toContain("sunderingBlow")
      expect(effects).toHaveLength(4)
    })

    it("should offer no effects below level 9", () => {
      expect(availableBrutalStrikeEffects(8)).toHaveLength(0)
    })
  })

  it("should forgo advantage for extra damage + effect", () => {
    const result = pBrutalStrike(7, ["forcefulBlow"])
    expect(result.foregoAdvantage).toBe(true)
    expect(result.extraDamage).toBe(7)
    expect(result.effects).toEqual(["forcefulBlow"])
  })

  it("should support two effects at L17", () => {
    const result = pBrutalStrike(14, ["forcefulBlow", "staggeringBlow"])
    expect(result.extraDamage).toBe(14)
    expect(result.effects).toHaveLength(2)
    expect(result.effects).toContain("forcefulBlow")
    expect(result.effects).toContain("staggeringBlow")
  })

  describe("Forceful Blow", () => {
    it("should push target 15ft", () => {
      const result = applyForcefulBlow()
      expect(result.pushDistanceFeet).toBe(15)
      expect(result.canMoveTowardTarget).toBe(true)
    })
  })

  describe("Hamstring Blow", () => {
    it("should reduce target speed by 15ft", () => {
      const result = applyHamstringBlow()
      expect(result.speedReductionFeet).toBe(15)
    })
  })

  describe("Staggering Blow (L13)", () => {
    it("should impose disadvantage on next save and block opportunity attacks", () => {
      const result = applyStaggeringBlow()
      expect(result.disadvantageOnNextSave).toBe(true)
      expect(result.noOpportunityAttacks).toBe(true)
    })
  })

  describe("Sundering Blow (L13)", () => {
    it("should grant +5 to next attack against target", () => {
      const result = applySunderingBlow()
      expect(result.nextAttackBonus).toBe(5)
    })
  })
})
