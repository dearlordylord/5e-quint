// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave

module battleRuntimeWeaponAttackAndMasteryTests {
  import battleRuntimeSpellAttackRollAndVisibilityFacts.* from "./battle-runtime-spell-attack-roll-and-visibility-facts"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

  run test_critical_hit_applies_doubled_damage_dice = {
    val result = resolveAttack(initialState, 20, 20, fighterWeaponAttackDamageRoll(9), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 0),
    }
  }
  run test_authored_critical_range_19_weapon_attack_crits_on_natural_19 = {
    val result = resolveAttack(withFighterImprovedCriticalRange19(initialState), 1, 19, fighterWeaponAttackDamageRoll(1), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 6),
    }
  }
  run test_default_critical_range_20_weapon_attack_does_not_crit_on_natural_19 = {
    val result = resolveAttack(initialState, 1, 19, fighterWeaponAttackDamageRoll(9), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
    }
  }
  run test_authored_critical_range_keeps_natural_1_auto_miss = {
    val result = resolveAttack(withFighterImprovedCriticalRange19(initialState), 99, 1, fighterWeaponAttackDamageRoll(9), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
    }
  }
  run test_weapon_mastery_sap_applies_next_attack_disadvantage_on_selected_sap_weapon_hit = {
    val mastered = { ...initialState, fighter: { ...initialState.fighter, longswordSapMastery: true } }
    val hit = resolveAttack(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true)
    val goblinTurn = endTurn(hit)
    val fighterNextTurn = endTurn(goblinTurn)
    all {
      assert(hit.goblin.activeEffects.contains(WeaponMasterySapNextAttackDisadvantage({ source: Fighter }))),
      assert(spellAttackRollModeFromActiveEffects(hit.goblin.activeEffects, Set(), true) == DisadvantageSpellAttackRoll),
      assert(goblinTurn.goblin.activeEffects.contains(WeaponMasterySapNextAttackDisadvantage({ source: Fighter }))),
      assert(not(fighterNextTurn.goblin.activeEffects.contains(WeaponMasterySapNextAttackDisadvantage({ source: Fighter })))),
    }
  }
  run test_weapon_mastery_sap_start_turn_expiry_preserves_non_active_combatant_effects = {
    val goblinTurn = endTurn(initialState)
    val primed = {
      ...goblinTurn,
      goblin: {
        ...goblinTurn.goblin,
        activeEffects: Set(
          ShieldArmorClassBonus,
          ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: true }),
          JumpMovementReplacement({ durationTicks: 10, usedThisTurn: true }),
          WeaponMasterySapNextAttackDisadvantage({ source: Fighter })
        ),
      },
    }
    val fighterNextTurn = endTurn(primed)
    all {
      assert(not(fighterNextTurn.goblin.activeEffects.contains(WeaponMasterySapNextAttackDisadvantage({ source: Fighter })))),
      assert(fighterNextTurn.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(fighterNextTurn.goblin.activeEffects.contains(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: true }))),
      assert(fighterNextTurn.goblin.activeEffects.exists(effect => match effect {
        | JumpMovementReplacement(data) => data.usedThisTurn
        | _ => false
      })),
    }
  }
  run test_weapon_mastery_sap_is_gated_by_hit_and_selected_weapon_mastery = {
    val notMasteredHit = resolveAttack(initialState, 15, 10, fighterWeaponAttackDamageRoll(1), true)
    val masteredMiss = resolveAttack({ ...initialState, fighter: { ...initialState.fighter, longswordSapMastery: true } }, 1, 1, fighterWeaponAttackDamageRoll(1), true)
    all {
      assert(not(notMasteredHit.goblin.activeEffects.exists(effect => match effect {
        | WeaponMasterySapNextAttackDisadvantage(_) => true
        | _ => false
      }))),
      assert(not(masteredMiss.goblin.activeEffects.exists(effect => match effect {
        | WeaponMasterySapNextAttackDisadvantage(_) => true
        | _ => false
      }))),
    }
  }
  run test_weapon_mastery_topple_save_dc_uses_attack_ability_modifier_and_proficiency_bonus = {
    assert(weaponMasteryToppleSaveDc(3, 2) == 13)
  }
  run test_weapon_mastery_topple_applies_prone_on_selected_topple_weapon_failed_save = {
    val mastered = { ...initialState, fighter: { ...initialState.fighter, quarterstaffToppleMastery: true } }
    val failed = resolveAttackWithToppleChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, false)
    val succeeded = resolveAttackWithToppleChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true)
    val declined = resolveAttackWithToppleChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, false, false)
    all {
      assert(failed.goblin.prone),
      assert(not(succeeded.goblin.prone)),
      assert(not(declined.goblin.prone)),
    }
  }
  run test_weapon_mastery_topple_is_gated_by_hit_and_selected_weapon_mastery = {
    val notMasteredHit = resolveAttackWithToppleChoice(initialState, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, false)
    val masteredMiss = resolveAttackWithToppleChoice({ ...initialState, fighter: { ...initialState.fighter, quarterstaffToppleMastery: true } }, 1, 1, fighterWeaponAttackDamageRoll(1), true, true, false)
    all {
      assert(not(notMasteredHit.goblin.prone)),
      assert(not(masteredMiss.goblin.prone)),
    }
  }
  run test_weapon_mastery_cleave_applies_second_hit_weapon_damage_without_positive_ability_modifier = {
    val mastered = { ...initialState, fighter: { ...initialState.fighter, greataxeCleaveMastery: true } }
    val result = resolveAttackWithCleaveChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    all {
      assert(result.goblin.hp == 2),
      assert(result.fighter.cleaveExtraAttackUsedThisTurn),
    }
  }
  run test_weapon_mastery_cleave_preserves_negative_ability_modifier = {
    val mastered = { ...initialState, fighter: { ...initialState.fighter, greataxeCleaveMastery: true } }
    val result = resolveAttackWithCleaveChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(4), true, true, true, 15, 10, 4, -1)
    assert(result.goblin.hp == 0)
  }
  run test_weapon_mastery_cleave_is_gated_by_hit_eligibility_and_once_per_turn = {
    val mastered = { ...initialState, fighter: { ...initialState.fighter, greataxeCleaveMastery: true } }
    val notMastered = resolveAttackWithCleaveChoice(initialState, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    val primaryMiss = resolveAttackWithCleaveChoice(mastered, 1, 1, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    val ineligibleSecondTarget = resolveAttackWithCleaveChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, false, 15, 10, 4, 3)
    val alreadyUsed = resolveAttackWithCleaveChoice({ ...mastered, fighter: { ...mastered.fighter, cleaveExtraAttackUsedThisTurn: true } }, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    all {
      assert(notMastered.goblin.hp == 6),
      assert(primaryMiss.goblin.hp == 10),
      assert(ineligibleSecondTarget.goblin.hp == 6),
      assert(alreadyUsed.goblin.hp == 6),
    }
  }
}
