// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.weapon-mastery-graze
module weaponMasteryGrazeCoreExamples {
  import weaponMasteryGrazeCore.* from "./weapon-mastery-graze-core"

  pure val grazeMiss: GrazeAttackRoll = {
    weaponMasteryIsGraze: true,
    masteryUnlocked: true,
    targetIsCreature: true,
    hit: false,
    attackAbilityModifier: 3,
    attackDamageBonus: 0,
    weaponDamageType: "slashing",
  }

  run grazeOfferedOnlyOnAnUnlockedGrazeMissAgainstACreature = all {
    assert(grazeOffered(grazeMiss)),
    assert(not(grazeOffered({ ...grazeMiss, hit: true }))),
    assert(not(grazeOffered({ ...grazeMiss, weaponMasteryIsGraze: false }))),
    assert(not(grazeOffered({ ...grazeMiss, masteryUnlocked: false }))),
    assert(not(grazeOffered({ ...grazeMiss, targetIsCreature: false }))),
    assert(not(grazeOffered({ ...grazeMiss, attackAbilityModifier: 0 }))),
    assert(not(grazeOffered({ ...grazeMiss, attackAbilityModifier: -1 }))),
  }

  run grazeDealsTheAbilityModifierAsTheWeaponDamageType = all {
    assert(grazeDamage(grazeMiss, true) == Set({ amount: 3, damageType: "slashing" })),
    assert(grazeDamage(grazeMiss, false) == Set()),
    assert(grazeDamage({ ...grazeMiss, attackAbilityModifier: 4 }, true)
      == Set({ amount: 4, damageType: "slashing" })),
    assert(grazeDamage({ ...grazeMiss, attackDamageBonus: 2 }, true)
      == Set({ amount: 3, damageType: "slashing" })),
    assert(grazeDamage({ ...grazeMiss, hit: true }, true) == Set()),
  }
}
