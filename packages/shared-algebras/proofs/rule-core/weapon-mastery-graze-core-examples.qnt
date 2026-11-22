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
    assert(grazeOffered({ ...grazeMiss, attackAbilityModifier: 0 })),
    assert(grazeOffered({ ...grazeMiss, attackAbilityModifier: -1 })),
  }

  run grazeDealsTheAbilityModifierAsTheWeaponDamageType = all {
    assert(grazeDamage(grazeMiss, true) == Set({ amount: 3, damageType: "slashing" })),
    assert(grazeDamage(grazeMiss, false) == Set()),
    assert(grazeDamage({ ...grazeMiss, attackAbilityModifier: 4 }, true)
      == Set({ amount: 4, damageType: "slashing" })),
    assert(grazeDamage({ ...grazeMiss, attackDamageBonus: 2 }, true)
      == Set({ amount: 3, damageType: "slashing" })),
    assert(grazeDamage({ ...grazeMiss, attackAbilityModifier: 0 }, true)
      == Set({ amount: 0, damageType: "slashing" })),
    assert(grazeDamage({ ...grazeMiss, attackAbilityModifier: -1 }, true)
      == Set({ amount: 0, damageType: "slashing" })),
    assert(grazeDamage({ ...grazeMiss, attackAbilityModifier: -1, attackDamageBonus: 9 }, true)
      == Set({ amount: 0, damageType: "slashing" })),
    assert(grazeDamage({ ...grazeMiss, attackAbilityModifier: 0 }, false) == Set()),
    assert(grazeDamage({ ...grazeMiss, weaponMasteryIsGraze: false }, true) == Set()),
    assert(grazeDamage({ ...grazeMiss, masteryUnlocked: false }, true) == Set()),
    assert(grazeDamage({ ...grazeMiss, targetIsCreature: false }, true) == Set()),
    assert(grazeDamage({ ...grazeMiss, hit: true }, true) == Set()),
    // Each attack has its own choice: declining one miss doesn't spend the
    // next miss's Graze, and using it doesn't force the next miss to use it.
    assert(List(grazeDamage(grazeMiss, false), grazeDamage(grazeMiss, true))
      == List(Set(), Set({ amount: 3, damageType: "slashing" }))),
    assert(List(grazeDamage(grazeMiss, true), grazeDamage(grazeMiss, false))
      == List(Set({ amount: 3, damageType: "slashing" }), Set())),
  }
}
