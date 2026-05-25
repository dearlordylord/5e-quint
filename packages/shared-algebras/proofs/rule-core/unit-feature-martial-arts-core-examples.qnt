// -*- mode: Bluespec; -*-

module unitFeatureMartialArtsCoreExamples {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import unitFeatureMartialArtsCore.* from "./unit-feature-martial-arts-core"

  run test_martial_arts_projects_dexterity_die_scaling_and_grapple_shove_dc = {
    val unarmed = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
      monkLevel: 1,
      strengthModifier: 1,
      dexterityModifier: 3,
      normalDamageDice: 0,
      normalDamageDieSize: 1,
      proficiencyBonus: 2,
    })
    val monkWeapon = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsMonkWeapon,
      },
      monkLevel: 17,
      strengthModifier: 1,
      dexterityModifier: 3,
      normalDamageDice: 1,
      normalDamageDieSize: 4,
      proficiencyBonus: 2,
    })
    all {
      assert(unarmed.attackAbilityModifier == 3),
      assert(unarmed.damageAbilityModifier == 3),
      assert(unarmed.damageDice == 1),
      assert(unarmed.damageDieSize == 6),
      assert(unarmed.unarmedStrikeSaveDc == 13),
      assert(monkWeapon.damageDice == 1),
      assert(monkWeapon.damageDieSize == 12),
      assert(monkWeapon.unarmedStrikeSaveDc == 13),
    }
  }

  run test_martial_arts_rejects_armor_shield_and_non_monk_weapons = {
    val armored = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: false,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
      monkLevel: 17,
      strengthModifier: 2,
      dexterityModifier: 4,
      normalDamageDice: 0,
      normalDamageDieSize: 1,
      proficiencyBonus: 2,
    })
    val shielded = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: true,
        attackForm: MartialArtsMonkWeapon,
      },
      monkLevel: 17,
      strengthModifier: 2,
      dexterityModifier: 4,
      normalDamageDice: 1,
      normalDamageDieSize: 4,
      proficiencyBonus: 2,
    })
    val otherWeapon = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsOtherWeapon,
      },
      monkLevel: 17,
      strengthModifier: 2,
      dexterityModifier: 4,
      normalDamageDice: 1,
      normalDamageDieSize: 4,
      proficiencyBonus: 2,
    })
    all {
      assert(not(armored.eligible)),
      assert(armored.attackAbilityModifier == 2),
      assert(armored.damageDieSize == 1),
      assert(not(shielded.eligible)),
      assert(shielded.damageDieSize == 4),
      assert(not(otherWeapon.eligible)),
      assert(otherWeapon.attackAbilityModifier == 2),
    }
  }

  run test_martial_arts_bonus_unarmed_strike_spends_bonus_action = {
    val result = resolveMartialArtsBonusUnarmedStrike(
      initialTurnProcedureState,
      {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
    )
    val noBonusAction = resolveMartialArtsBonusUnarmedStrike(
      initialTurnProcedureState.with("bonusActionAvailable", false),
      {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
    )
    all {
      assert(result.admitted),
      assert(not(result.turn.bonusActionAvailable)),
      assert(not(noBonusAction.admitted)),
    }
  }
}
