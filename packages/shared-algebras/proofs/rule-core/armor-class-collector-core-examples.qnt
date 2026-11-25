// -*- mode: Bluespec; -*-

module armorClassCollectorCoreExamples {
  import coverDefenseCore.* from "./cover-defense-core"
  import armorClassCollectorCore.* from "./armor-class-collector-core"

  // An unarmored creature with Dexterity +3 (base 13) and Wisdom +4: a class
  // feature's calculation 10 + Dex + Wis gives 17; Mage Armor's gives 16.
  pure val unarmoredClassFeature: ArmorClassCircumstances = {
    ownBaseCalculation: 17,
    wearingArmor: false,
    spellBaseCalculations: [],
    modifiers: [],
    floors: [],
    cover: NoCover,
  }

  run onlyTheHighestBaseCalculationIsInEffect = all {
    val withMageArmor = { ...unarmoredClassFeature, spellBaseCalculations: [16] }
    val lowOwnBase = { ...withMageArmor, ownBaseCalculation: 13 }
    all {
      assert(collectedArmorClass(withMageArmor) == 17),
      assert(collectedArmorClass(lowOwnBase) == 16),
      assert(collectedArmorClass({ ...lowOwnBase, spellBaseCalculations: [16, 15] }) == 16),
    }
  }

  run aSpellBaseCalculationNeedsNoArmor = all {
    val armored = { ...unarmoredClassFeature, ownBaseCalculation: 14, wearingArmor: true, spellBaseCalculations: [16] }
    assert(collectedArmorClass(armored) == 14)
  }

  run bonusesAndPenaltiesAddToTheBaseInEffect = all {
    val shieldAndShieldOfFaith = { ...unarmoredClassFeature, ownBaseCalculation: 13, spellBaseCalculations: [16], modifiers: [2, 2] }
    val slowed = { ...unarmoredClassFeature, modifiers: [-2] }
    all {
      assert(collectedArmorClass(shieldAndShieldOfFaith) == 20),
      assert(collectedArmorClass(slowed) == 15),
    }
  }

  run aFloorRaisesTheCreaturesOwnArmorClass = all {
    val barkskin = { ...unarmoredClassFeature, ownBaseCalculation: 12, floors: [17] }
    val slowedUnderBarkskin = { ...barkskin, modifiers: [-2] }
    val aboveTheFloor = { ...barkskin, ownBaseCalculation: 18 }
    all {
      assert(collectedArmorClass(barkskin) == 17),
      assert(collectedArmorClass(slowedUnderBarkskin) == 17),
      assert(collectedArmorClass(aboveTheFloor) == 18),
    }
  }

  run coverAddsAfterTheFloor = all {
    val barkskinBehindHalfCover = { ...unarmoredClassFeature, ownBaseCalculation: 12, floors: [17], cover: HalfCover }
    all {
      assert(collectedArmorClass(barkskinBehindHalfCover) == 19),
      assert(collectedArmorClass({ ...unarmoredClassFeature, cover: ThreeQuartersCover }) == 22),
      assert(creatureArmorClass(barkskinBehindHalfCover) == 17),
    }
  }
}
