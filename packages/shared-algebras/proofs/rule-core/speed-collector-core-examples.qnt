// -*- mode: Bluespec; -*-

module speedCollectorCoreExamples {
  import speedCollectorCore.* from "./speed-collector-core"

  pure val walker: SpeedCircumstances = {
    ordinarySpeed: 30,
    deltas: [],
    slowReductions: [],
    wearingArmor: false,
    strengthScore: 10,
    armorStrengthRequirement: 0,
    ratios: [],
    speedZero: false,
  }

  run twoSlowsReduceSpeedByTenFeet = all {
    assert(creatureSpeed({ ...walker, slowReductions: [10] }) == 20),
    assert(creatureSpeed({ ...walker, slowReductions: [10, 10] }) == 20),
  }

  run heavyArmorSlowsAWearerBelowItsStrength = all {
    val plate = { ...walker, wearingArmor: true, armorStrengthRequirement: 15 }
    all {
      assert(creatureSpeed({ ...plate, strengthScore: 13 }) == 20),
      assert(creatureSpeed({ ...plate, strengthScore: 15 }) == 30),
      assert(creatureSpeed({ ...plate, strengthScore: 13, wearingArmor: false }) == 30),
      assert(creatureSpeed({ ...walker, wearingArmor: true }) == 30),
    }
  }

  run deltasAddThenRatiosApply = all {
    val hamstrung = { ...walker, deltas: [-15] }
    val hasted = { ...walker, deltas: [10], ratios: [{ numerator: 2, denominator: 1 }] }
    val halved = { ...walker, slowReductions: [10], ratios: [{ numerator: 1, denominator: 2 }] }
    all {
      assert(creatureSpeed(hamstrung) == 15),
      assert(creatureSpeed(hasted) == 80),
      assert(creatureSpeed(halved) == 10),
    }
  }

  run speedZeroHoldsEverySpeed = all {
    val grappled = { ...walker, deltas: [10], speedZero: true }
    all {
      assert(creatureSpeed(grappled) == 0),
      assert(fixedSpecialSpeed(grappled, 60) == 0),
    }
  }

  run aReductionNeverTakesSpeedBelowZero = all {
    val slowArmored = {
      ...walker,
      ordinarySpeed: 15,
      slowReductions: [10],
      wearingArmor: true,
      armorStrengthRequirement: 13,
    }
    assert(creatureSpeed(slowArmored) == 0)
  }

  run aSpecialSpeedChangesByTheSameAmount = all {
    val slowed = { ...walker, slowReductions: [10] }
    assert(fixedSpecialSpeed(slowed, 60) == 50)
  }
}
