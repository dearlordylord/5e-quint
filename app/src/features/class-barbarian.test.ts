import { describe, expect, it } from "vitest"

import type { RageState } from "#/features/class-barbarian.ts"
import {
  applyForcefulBlow,
  applyFrenzy,
  applyHamstringBlow,
  applyRageDamageBonus,
  applyStaggeringBlow,
  applySunderingBlow,
  availableBrutalStrikeEffects,
  brutalStrikeDamageDice,
  brutalStrikeEffectCount,
  canApplyFrenzy,
  canCastWhileRaging,
  canEnterRage,
  canRetaliate,
  canUseBrutalStrike,
  canUseDangerSense,
  canUseIntimidatingPresence,
  canUseRelentlessRage,
  dangerSenseAdvantage,
  fastMovementBonus,
  frenzyDamageDice,
  hasFeralInstinct,
  indomitableMight,
  instinctivePounceDistance,
  intimidatingPresenceDC,
  mindlessRageImmunities,
  mindlessRageOnEnterRage,
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
  primalChampionBonus,
  rageDamageBonus,
  rageMaxCharges,
  rageResistances,
  rageStrengthAdvantage,
  recklessAttackAdvantage,
  recklessDefenseDisadvantage,
  relentlessRageDC,
  relentlessRageResult,
  restoreIntimidatingPresenceWithRage,
  useIntimidatingPresence
} from "#/features/class-barbarian.ts"

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

    it("should give +4 damage at level 16 (SRD table: +4 starts at L16)", () => {
      expect(rageDamageBonus(16)).toBe(4)
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

    it("should regain all uses at Initiative even with charges remaining", () => {
      const result = pPersistentRageOnInitiative(2, 5, false)
      expect(result.newCharges).toBe(5)
      expect(result.persistentRageUsed).toBe(true)
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

  it("should grant advantage on own STR-based attacks (melee or ranged)", () => {
    expect(recklessAttackAdvantage(true, true)).toBe(true)
  })

  it("should not grant advantage on DEX-based attacks", () => {
    expect(recklessAttackAdvantage(true, false)).toBe(false)
  })

  it("should not grant advantage if not reckless", () => {
    expect(recklessAttackAdvantage(false, true)).toBe(false)
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
    expect(canUseBrutalStrike(true, 8, true)).toBe(false)
  })

  it("should be available at level 9 with reckless STR attack", () => {
    expect(canUseBrutalStrike(true, 9, true)).toBe(true)
  })

  it("should not be available without reckless attack", () => {
    expect(canUseBrutalStrike(false, 9, true)).toBe(false)
  })

  it("should not be available for non-STR attacks", () => {
    expect(canUseBrutalStrike(true, 9, false)).toBe(false)
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
      expect(result.cantMakeOpportunityAttacks).toBe(true)
    })
  })

  describe("Sundering Blow (L13)", () => {
    it("should grant +5 to next attack against target", () => {
      const result = applySunderingBlow()
      expect(result.nextAttackBonus).toBe(5)
    })
  })
})

// --- Berserker Subclass Tests ---

describe("frenzy (L3 Berserker)", () => {
  it("should allow frenzy when raging, reckless, STR-based, and not used this turn", () => {
    expect(canApplyFrenzy(true, true, true, false)).toBe(true)
  })

  it("should not allow frenzy when not raging", () => {
    expect(canApplyFrenzy(false, true, true, false)).toBe(false)
  })

  it("should not allow frenzy when not reckless", () => {
    expect(canApplyFrenzy(true, false, true, false)).toBe(false)
  })

  it("should not allow frenzy when not STR-based", () => {
    expect(canApplyFrenzy(true, true, false, false)).toBe(false)
  })

  it("should not allow frenzy if already used this turn", () => {
    expect(canApplyFrenzy(true, true, true, true)).toBe(false)
  })

  it("should return 2d6 when rage damage bonus is +2", () => {
    expect(frenzyDamageDice(2)).toBe(2)
  })

  it("should return 3d6 when rage damage bonus is +3", () => {
    expect(frenzyDamageDice(3)).toBe(3)
  })

  it("should return 4d6 when rage damage bonus is +4", () => {
    expect(frenzyDamageDice(4)).toBe(4)
  })

  it("should apply frenzy damage and mark as used", () => {
    const result = applyFrenzy(9)
    expect(result.extraDamage).toBe(9)
    expect(result.frenzyUsedThisTurn).toBe(true)
  })
})

describe("mindless rage (L6 Berserker)", () => {
  it("should grant charmed and frightened immunity while raging at L6+", () => {
    const immunities = mindlessRageImmunities(true, 6)
    expect(immunities.has("charmed")).toBe(true)
    expect(immunities.has("frightened")).toBe(true)
    expect(immunities.size).toBe(2)
  })

  it("should grant immunities at higher berserker levels", () => {
    const immunities = mindlessRageImmunities(true, 10)
    expect(immunities.has("charmed")).toBe(true)
    expect(immunities.has("frightened")).toBe(true)
  })

  it("should not grant immunities when not raging", () => {
    const immunities = mindlessRageImmunities(false, 6)
    expect(immunities.size).toBe(0)
  })

  it("should not grant immunities below L6", () => {
    const immunities = mindlessRageImmunities(true, 5)
    expect(immunities.size).toBe(0)
  })

  it("should remove charmed and frightened when entering rage at L6+", () => {
    const toRemove = mindlessRageOnEnterRage(["charmed", "frightened", "poisoned"], 6)
    expect(toRemove).toContain("charmed")
    expect(toRemove).toContain("frightened")
    expect(toRemove).not.toContain("poisoned")
    expect(toRemove).toHaveLength(2)
  })

  it("should not remove conditions when entering rage below L6", () => {
    const toRemove = mindlessRageOnEnterRage(["charmed", "frightened"], 5)
    expect(toRemove).toHaveLength(0)
  })

  it("should return empty array if no charmed/frightened conditions present", () => {
    const toRemove = mindlessRageOnEnterRage(["poisoned", "prone"], 6)
    expect(toRemove).toHaveLength(0)
  })
})

describe("retaliation (L10 Berserker)", () => {
  it("should allow retaliation at L10+ with reaction and creature within 5ft", () => {
    expect(canRetaliate(10, true, true)).toBe(true)
  })

  it("should allow retaliation at higher levels", () => {
    expect(canRetaliate(14, true, true)).toBe(true)
  })

  it("should not allow retaliation below L10", () => {
    expect(canRetaliate(9, true, true)).toBe(false)
  })

  it("should not allow retaliation without reaction available", () => {
    expect(canRetaliate(10, false, true)).toBe(false)
  })

  it("should not allow retaliation if creature not within 5ft", () => {
    expect(canRetaliate(10, true, false)).toBe(false)
  })
})

describe("intimidating presence (L14 Berserker)", () => {
  it("should compute DC as 8 + STR mod + proficiency bonus", () => {
    expect(intimidatingPresenceDC(4, 5)).toBe(17) // 8 + 4 + 5
    expect(intimidatingPresenceDC(3, 2)).toBe(13) // 8 + 3 + 2
    expect(intimidatingPresenceDC(5, 5)).toBe(18) // 8 + 5 + 5
  })

  it("should allow use at L14+ with bonus action and not yet used", () => {
    expect(canUseIntimidatingPresence(14, false, false)).toBe(true)
  })

  it("should not allow use below L14", () => {
    expect(canUseIntimidatingPresence(13, false, false)).toBe(false)
  })

  it("should not allow use if bonus action already used", () => {
    expect(canUseIntimidatingPresence(14, true, false)).toBe(false)
  })

  it("should not allow use if already used (once per Long Rest)", () => {
    expect(canUseIntimidatingPresence(14, false, true)).toBe(false)
  })

  it("should mark bonus action and presence as used", () => {
    const result = useIntimidatingPresence()
    expect(result.intimidatingPresenceUsed).toBe(true)
    expect(result.bonusActionUsed).toBe(true)
  })

  it("should restore presence by expending a rage charge", () => {
    const result = restoreIntimidatingPresenceWithRage(3, true)
    expect(result).toEqual({ rageCharges: 2, intimidatingPresenceUsed: false })
  })

  it("should not restore if no rage charges", () => {
    const result = restoreIntimidatingPresenceWithRage(0, true)
    expect(result).toBeNull()
  })

  it("should not restore if not yet used", () => {
    const result = restoreIntimidatingPresenceWithRage(3, false)
    expect(result).toBeNull()
  })
})

// --- Danger Sense Tests ---

describe("danger sense (L2)", () => {
  it("should be usable at L2+", () => {
    expect(canUseDangerSense(2, false)).toBe(true)
  })

  it("should be usable at higher levels", () => {
    expect(canUseDangerSense(10, false)).toBe(true)
  })

  it("should not be usable below L2", () => {
    expect(canUseDangerSense(1, false)).toBe(false)
  })

  it("should not be usable when incapacitated", () => {
    expect(canUseDangerSense(2, true)).toBe(false)
  })

  it("should grant advantage on DEX saves when active", () => {
    expect(dangerSenseAdvantage(true)).toBe(true)
  })

  it("should not grant advantage when inactive", () => {
    expect(dangerSenseAdvantage(false)).toBe(false)
  })
})

// --- Fast Movement Tests ---

describe("fast movement (L5)", () => {
  it("should grant +10ft at L5+", () => {
    expect(fastMovementBonus(5, "none")).toBe(10)
  })

  it("should grant +10ft at higher levels", () => {
    expect(fastMovementBonus(10, "light")).toBe(10)
  })

  it("should grant +10ft in medium armor", () => {
    expect(fastMovementBonus(5, "medium")).toBe(10)
  })

  it("should not grant bonus with heavy armor", () => {
    expect(fastMovementBonus(5, "heavy")).toBe(0)
  })

  it("should not grant bonus below L5", () => {
    expect(fastMovementBonus(4, "none")).toBe(0)
  })
})

// --- Feral Instinct Tests ---

describe("feral instinct (L7)", () => {
  it("should grant initiative advantage at L7+", () => {
    expect(hasFeralInstinct(7)).toBe(true)
  })

  it("should grant initiative advantage at higher levels", () => {
    expect(hasFeralInstinct(15)).toBe(true)
  })

  it("should not grant initiative advantage below L7", () => {
    expect(hasFeralInstinct(6)).toBe(false)
  })

})

// --- Instinctive Pounce Tests ---

describe("instinctive pounce (L7)", () => {
  it("should grant half speed at L7+", () => {
    expect(instinctivePounceDistance(7, 30)).toBe(15)
  })

  it("should floor odd speeds", () => {
    expect(instinctivePounceDistance(7, 25)).toBe(12)
  })

  it("should return 0 below L7", () => {
    expect(instinctivePounceDistance(6, 30)).toBe(0)
  })

  it("should handle 0 speed", () => {
    expect(instinctivePounceDistance(7, 0)).toBe(0)
  })

  it("should work at higher levels", () => {
    expect(instinctivePounceDistance(20, 40)).toBe(20)
  })
})

// --- Relentless Rage Tests ---

describe("relentless rage (L11)", () => {
  it("should start DC at 10", () => {
    expect(relentlessRageDC(0)).toBe(10)
  })

  it("should increment DC by 5 per use", () => {
    expect(relentlessRageDC(1)).toBe(15)
    expect(relentlessRageDC(2)).toBe(20)
    expect(relentlessRageDC(3)).toBe(25)
  })

  it("should require L11+ and raging", () => {
    expect(canUseRelentlessRage(11, true)).toBe(true)
  })

  it("should not be usable below L11", () => {
    expect(canUseRelentlessRage(10, true)).toBe(false)
  })

  it("should not be usable when not raging", () => {
    expect(canUseRelentlessRage(11, false)).toBe(false)
  })

  it("should set HP to 2x barbarian level on successful save", () => {
    expect(relentlessRageResult(true, 11)).toEqual({ survived: true, newHp: 22 })
    expect(relentlessRageResult(true, 15)).toEqual({ survived: true, newHp: 30 })
  })

  it("should drop to 0 HP on failed save", () => {
    expect(relentlessRageResult(false, 11)).toEqual({ survived: false, newHp: 0 })
  })
})

// --- Indomitable Might Tests ---

describe("indomitable might (L18)", () => {
  it("should use STR score when higher at L18+", () => {
    expect(indomitableMight(18, 5, 20)).toBe(20)
  })

  it("should use d20 roll when higher at L18+", () => {
    expect(indomitableMight(18, 18, 15)).toBe(18)
  })

  it("should use d20 roll when equal at L18+", () => {
    expect(indomitableMight(18, 15, 15)).toBe(15)
  })

  it("should not apply below L18", () => {
    expect(indomitableMight(17, 5, 20)).toBe(5)
  })

  it("should work at L20", () => {
    expect(indomitableMight(20, 3, 24)).toBe(24)
  })
})

// --- Primal Champion Tests ---

describe("primal champion (L20)", () => {
  it("should grant +4 STR, +4 CON, max 24 at L20", () => {
    expect(primalChampionBonus(20)).toEqual({ strBonus: 4, conBonus: 4, maxScore: 25 })
  })

  it("should grant no bonus below L20", () => {
    expect(primalChampionBonus(19)).toEqual({ strBonus: 0, conBonus: 0, maxScore: 20 })
  })

  it("should grant no bonus at L1", () => {
    expect(primalChampionBonus(1)).toEqual({ strBonus: 0, conBonus: 0, maxScore: 20 })
  })
})
