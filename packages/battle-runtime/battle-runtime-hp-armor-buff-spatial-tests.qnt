// -*- mode: Bluespec; -*-

module battleRuntimeHpArmorBuffSpatialTests {
  import battleRuntime.* from "./battle-runtime"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFindFamiliar.* from "./battle-runtime-find-familiar"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeCreatureTypeProtection.* from "./battle-runtime-creature-type-protection"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeThaumaturgy.* from "./battle-runtime-thaumaturgy"
  import battleRuntimeBardicInspiration.* from "./battle-runtime-bardic-inspiration"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"
  import battleRuntimeChainedSpellAttack.* from "./battle-runtime-chained-spell-attack"
  import battleRuntimeSaveGatedSpell.* from "./battle-runtime-save-gated-spell"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeMarkedSpells.* from "./battle-runtime-marked-spells"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeCombatantSide.* from "./battle-runtime-combatant-side"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"
  import battleRuntimeFeatherFall.* from "./battle-runtime-feather-fall"
  import battleRuntimeJumpMovement.* from "./battle-runtime-jump-movement"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"

  run test_evasion_style_save_damage_replacement = {
    all {
      assert(dexHalfSaveDamageAfterReplacement(6, true, true) == 0),
      assert(dexHalfSaveDamageAfterReplacement(6, false, true) == 3),
      assert(dexHalfSaveDamageAfterReplacement(6, true, false) == 3),
      assert(dexHalfSaveDamageAfterReplacement(6, false, false) == 6),
    }
  }

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
    val mastered = { ...initialState, fighterLongswordSapMastery: true }
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
    val masteredMiss = resolveAttack({ ...initialState, fighterLongswordSapMastery: true }, 1, 1, fighterWeaponAttackDamageRoll(1), true)
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
    val mastered = { ...initialState, fighterQuarterstaffToppleMastery: true }
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
    val masteredMiss = resolveAttackWithToppleChoice({ ...initialState, fighterQuarterstaffToppleMastery: true }, 1, 1, fighterWeaponAttackDamageRoll(1), true, true, false)
    all {
      assert(not(notMasteredHit.goblin.prone)),
      assert(not(masteredMiss.goblin.prone)),
    }
  }

  run test_weapon_mastery_cleave_applies_second_hit_weapon_damage_without_positive_ability_modifier = {
    val mastered = { ...initialState, fighterGreataxeCleaveMastery: true }
    val result = resolveAttackWithCleaveChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    all {
      assert(result.goblin.hp == 2),
      assert(result.fighterCleaveExtraAttackUsedThisTurn),
    }
  }

  run test_weapon_mastery_cleave_preserves_negative_ability_modifier = {
    val mastered = { ...initialState, fighterGreataxeCleaveMastery: true }
    val result = resolveAttackWithCleaveChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(4), true, true, true, 15, 10, 4, -1)
    assert(result.goblin.hp == 0)
  }

  run test_weapon_mastery_cleave_is_gated_by_hit_eligibility_and_once_per_turn = {
    val mastered = { ...initialState, fighterGreataxeCleaveMastery: true }
    val notMastered = resolveAttackWithCleaveChoice(initialState, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    val primaryMiss = resolveAttackWithCleaveChoice(mastered, 1, 1, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    val ineligibleSecondTarget = resolveAttackWithCleaveChoice(mastered, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, false, 15, 10, 4, 3)
    val alreadyUsed = resolveAttackWithCleaveChoice({ ...mastered, fighterCleaveExtraAttackUsedThisTurn: true }, 15, 10, fighterWeaponAttackDamageRoll(1), true, true, true, 15, 10, 4, 3)
    all {
      assert(notMastered.goblin.hp == 6),
      assert(primaryMiss.goblin.hp == 10),
      assert(ineligibleSecondTarget.goblin.hp == 6),
      assert(alreadyUsed.goblin.hp == 6),
    }
  }

  run test_temporary_hp_absorbs_damage_before_hp = {
    val result = resolveAttack(withGoblinHp(initialState, 10, 5), 15, 10, fighterWeaponAttackDamageRoll(4), true)
    all {
      assert(result.goblin.tempHp == 0),
      assert(result.goblin.hp == 8),
    }
  }

  run test_hp_clamps_to_zero_and_monster_dies = {
    val result = resolveAttack(withGoblinHp(initialState, 3, 0), 15, 10, fighterWeaponAttackDamageRoll(8), true)
    all {
      assert(result.goblin.hp == 0),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }

  run test_character_drop_to_zero_uses_death_saving_throw_lifecycle = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 11, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 0),
      assert(result.lifecycle == UsesDeathSavingThrows),
    }
  }

  run test_melee_knock_out_leaves_stat_block_at_one_hp_unconscious = {
    val result = resolveAttackKnockOut(withGoblinHp(initialState, 3, 0), 15, 10, fighterWeaponAttackDamageRoll(8), true)
    all {
      assert(result.goblin.hp == 1),
      assert(result.goblin.unconscious),
      assert(result.goblin.knockedOut),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }

  run test_melee_knock_out_leaves_character_at_one_hp_unconscious = {
    val result = applyDamageWithDisposition(withFighterHp(initialState, 3, 0).fighter, 8, 1, true, KnockOut)
    all {
      assert(result.hp == 1),
      assert(result.unconscious),
      assert(result.knockedOut),
      assert(result.lifecycle == UsesDeathSavingThrows),
      assert(result.deathFailures == 0),
    }
  }

  run test_healing_knock_out_recovery_ends_unconscious = {
    val knockedOut = applyDamageWithDisposition(withFighterHp(initialState, 3, 0).fighter, 8, 1, true, KnockOut)
    val result = applyHealing(knockedOut, 4)
    all {
      assert(result.hp == 5),
      assert(not(result.unconscious)),
      assert(not(result.knockedOut)),
    }
  }

  run test_massive_damage_kills_character_on_drop_to_zero = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 19, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_character_damage_at_zero_adds_one_death_failure = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 1),
    }
  }

  run test_character_critical_damage_at_zero_adds_two_death_failures = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 2),
    }
  }

  run test_character_temporary_hp_at_zero_absorbs_damage_before_death_failures = {
    val absorbed = applyDamage(withFighterHp(initialState, 0, 5).fighter, 4, 2, true)
    val overflow = applyDamage(withFighterHp(initialState, 0, 5).fighter, 7, 2, true)
    all {
      assert(absorbed.hp == 0),
      assert(absorbed.tempHp == 1),
      assert(absorbed.deathFailures == 0),
      assert(absorbed.unconscious),
      assert(overflow.hp == 0),
      assert(overflow.tempHp == 0),
      assert(overflow.deathFailures == 2),
      assert(overflow.unconscious),
    }
  }

  run test_massive_damage_at_zero_kills_character = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 13, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_start_turn_death_save_failure_adds_one_failure = {
    val result = endTurnWithDeathSave(withFighterHp(endTurn(initialState), 0, 0), 5)
    all {
      assert(currentActor(result) == Fighter),
      assert(result.fighter.hp == 0),
      assert(result.fighter.unconscious),
      assert(result.fighter.deathFailures == 1),
    }
  }

  run test_start_turn_death_save_success_three_stabilizes = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, unconscious: true, deathSuccesses: 2, deathFailures: 1 }
    val result = endTurnWithDeathSave({ ...endTurn(initialState), fighter: fighter }, 10)
    all {
      assert(result.fighter.hp == 0),
      assert(result.fighter.unconscious),
      assert(result.fighter.stable),
      assert(result.fighter.deathSuccesses == 0),
      assert(result.fighter.deathFailures == 0),
    }
  }

  run test_start_turn_death_save_natural_twenty_restores_one_hp = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, deathSuccesses: 1, deathFailures: 2 }
    val result = endTurnWithDeathSave({ ...endTurn(initialState), fighter: fighter }, 20)
    all {
      assert(result.fighter.hp == 1),
      assert(not(result.fighter.unconscious)),
      assert(not(result.fighter.stable)),
      assert(result.fighter.deathSuccesses == 0),
      assert(result.fighter.deathFailures == 0),
    }
  }

  run test_spare_the_dying_makes_zero_hp_non_dead_character_stable = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, unconscious: true, deathSuccesses: 2, deathFailures: 1 }
    val result = applySpareTheDying(fighter)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.stable),
      assert(result.deathSuccesses == 0),
      assert(result.deathFailures == 0),
      assert(spellInvocationSpendsSpellSlot(SpareTheDying) == false),
    }
  }

  run test_spare_the_dying_rejects_dead_and_nonzero_targets = {
    val dead = { ...withFighterHp(initialState, 0, 0).fighter, deathFailures: 3 }
    all {
      assert(not(spareTheDyingTargetAdmitted(withFighterHp(initialState, 5, 0).fighter))),
      assert(not(spareTheDyingTargetAdmitted(dead))),
      assert(not(spareTheDyingTargetAdmitted(withGoblinHp(initialState, 0, 0).goblin))),
      assert(applySpareTheDying(dead) == dead),
    }
  }

  run test_spare_the_dying_range_scales_by_character_level = {
    all {
      assert(spareTheDyingRangeFeet(1) == 15),
      assert(spareTheDyingRangeFeet(5) == 30),
      assert(spareTheDyingRangeFeet(11) == 60),
      assert(spareTheDyingRangeFeet(17) == 120),
    }
  }

  run test_end_turn_advances_current_actor_and_resets_resources = {
    val result = endTurn({
      ...initialState,
      actionAvailable: false,
      bonusActionAvailable: false,
      dashMovementBonus: 30,
      disengaged: true,
      goblin: {
        ...initialState.goblin,
        reactionAvailable: false,
        movementSpent: 20,
        dodging: true,
      },
    })
    all {
      assert(currentActor(result) == Goblin),
      assert(result.initiative.round == 1),
      assert(result.actionAvailable),
      assert(result.bonusActionAvailable),
      assert(result.goblin.reactionAvailable),
      assert(result.goblin.movementSpent == 0),
      assert(not(result.goblin.dodging)),
      assert(result.dashMovementBonus == 0),
      assert(not(result.disengaged)),
    }
  }

  run test_end_turn_wraps_to_next_round = {
    val result = endTurn(endTurn(initialState))
    all {
      assert(currentActor(result) == Fighter),
      assert(result.initiative.round == 2),
      assert(result.initiative.alreadyActed == []),
      assert(result.initiative.stillToAct == [Fighter, Goblin]),
    }
  }

  run test_mage_armor_sets_base_ac_plus_dex = {
    all {
      assert(activeEffectArmorClass(10, 2, Set(mageArmorActiveEffect(mageArmorDurationTicks))) == 15),
      assert(activeEffectArmorClass(10, 2, Set(RayOfFrostSpeedDelta)) == 10),
    }
  }

  run test_armor_of_shadows_mage_armor_spends_action_not_spell_slot = {
    val result = resolveArmorOfShadowsMageArmor(initialState)
    all {
      assert(result.fighter.activeEffects.contains(mageArmorActiveEffect(mageArmorDurationTicks))),
      assert(not(result.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_armor_of_shadows_mage_armor_rejects_heavy_armored_self = {
    val armored = { ...initialState, fighter: { ...initialState.fighter, wearingHeavyArmor: true } }
    val result = resolveArmorOfShadowsMageArmor(armored)
    all {
      assert(not(activeEffectsContainMageArmor(result.fighter.activeEffects))),
      assert(result.actionAvailable),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_armor_of_shadows_mage_armor_replaces_existing_effect_duration = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(mageArmorActiveEffect(1)) } }
    val result = resolveArmorOfShadowsMageArmor(protected)
    all {
      assert(result.fighter.activeEffects == Set(mageArmorActiveEffect(mageArmorDurationTicks))),
      assert(not(result.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_mage_armor_expires_after_duration_tick = {
    val nearlyExpired = {
      ...resolveArmorOfShadowsMageArmor(initialState),
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(mageArmorActiveEffect(1)),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainMageArmor(stillSameRound.fighter.activeEffects)),
      assert(activeEffectsMageArmorDurationTicks(stillSameRound.fighter.activeEffects) == 1),
      assert(not(activeEffectsContainMageArmor(nextRound.fighter.activeEffects))),
      assert(combatantArmorClass(stillSameRound.fighter) == 13),
      assert(combatantArmorClass(nextRound.fighter) == 10),
    }
  }

  run test_scalar_buff_longstrider_targets_selected_creature = {
    val result = resolveScalarBuffSpell(initialState, LongstriderScalarBuff, Set(Goblin), 1, 0)
    all {
      assert(not(result.fighter.activeEffects.contains(LongstriderSpeedDelta))),
      assert(result.goblin.activeEffects.contains(LongstriderSpeedDelta)),
      assert(movementSpeed(result.goblin, WalkSpeedKind) == 40),
    }
  }

  run test_scalar_buff_shield_of_faith_targets_selected_creature_and_uses_concentration = {
    val result = resolveScalarBuffSpell(initialState, ShieldOfFaithScalarBuff, Set(Goblin), 1, 0)
    all {
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(ShieldOfFaithArmorClassBonus))),
      assert(result.goblin.activeEffects.contains(ShieldOfFaithArmorClassBonus)),
      assert(combatantArmorClass(result.goblin) == 17),
    }
  }

  run test_heroism_stores_distinct_immunity_and_turn_start_temporary_hit_points = {
    val result = resolveHeroismSpell(initialState, Set(Fighter), 1, 3)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(HeroismFrightenedImmunity)),
      assert(result.fighter.activeEffects.contains(HeroismTurnStartTemporaryHitPoints({ amount: 3 }))),
      assert(result.fighter.tempHp == 0),
      assert(endTurn(endTurn(result)).fighter.tempHp == 3),
    }
  }

  run test_heroism_slot_level_controls_target_count_and_concentration_cleanup = {
    val hostile = resolveHeroismSpell(initialState, Set(Goblin), 1, 3)
    val invalidCount = resolveHeroismSpell(initialState, Set(Fighter, Goblin), 1, 3)
    val invalidWilling = resolveHeroismSpell(initialState, Set(Fighter, Goblin), 2, 3)
    val valid = resolveHeroismSpell(initialState, Set(Fighter), 1, 3)
    val broken = breakConcentration({ ...valid.fighter, activeEffects: valid.fighter.activeEffects.union(Set(HeroismTurnStartTemporaryHitPoints({ amount: 5 }))) })
    all {
      assert(hostile == initialState),
      assert(invalidCount == initialState),
      assert(invalidWilling == initialState),
      assert(valid.fighter.activeEffects.contains(HeroismFrightenedImmunity)),
      assert(valid.fighter.activeEffects.contains(HeroismTurnStartTemporaryHitPoints({ amount: 3 }))),
      assert(not(broken.activeEffects.contains(HeroismFrightenedImmunity))),
      assert(not(broken.activeEffects.exists(effect => match effect {
        | HeroismTurnStartTemporaryHitPoints(_) => true
        | _ => false
      }))),
    }
  }

  run test_expeditious_retreat_immediate_dash_spends_bonus_action_and_slot = {
    val result = resolveExpeditiousRetreatDash(initialState, WalkSpeedKind)
    all {
      assert(result.actionAvailable),
      assert(not(result.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.dashMovementBonus == 30),
      assert(movementRemainingForFighterWithSpeedKind(result, WalkSpeedKind) == 60),
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(ExpeditiousRetreatDashBonusAction)),
    }
  }

  run test_expeditious_retreat_later_bonus_action_dash_uses_existing_dash_budget = {
    val cast = resolveExpeditiousRetreatDash(initialState, WalkSpeedKind)
    val nextFighterTurn = endTurn(endTurn(cast))
    val dashed = expeditiousRetreatBonusActionDashFighter(nextFighterTurn, WalkSpeedKind)
    all {
      assert(dashed.actionAvailable),
      assert(not(dashed.bonusActionAvailable)),
      assert(dashed.dashMovementBonus == 30),
      assert(movementRemainingForFighterWithSpeedKind(dashed, WalkSpeedKind) == 60),
      assert(dashed.fighter.activeEffects.contains(ExpeditiousRetreatDashBonusAction)),
    }
  }

  run test_expeditious_retreat_concentration_cleanup_removes_bonus_action_dash_permission = {
    val cast = resolveExpeditiousRetreatDash(initialState, WalkSpeedKind)
    val broken = { ...cast, fighter: breakConcentration(cast.fighter) }
    val nextFighterTurn = endTurn(endTurn(broken))
    val attempted = expeditiousRetreatBonusActionDashFighter(nextFighterTurn, WalkSpeedKind)
    all {
      assert(not(broken.fighter.concentrating)),
      assert(not(broken.fighter.activeEffects.contains(ExpeditiousRetreatDashBonusAction))),
      assert(attempted == nextFighterTurn),
    }
  }

  run test_jump_movement_replacement_cast_targets_and_slot_scaling = {
    val firstSlot = resolveJumpMovementReplacementSpell(initialState, Set(Fighter), Set(Fighter), 1)
    val secondSlot = resolveJumpMovementReplacementSpell(initialState, Set(Fighter, Goblin), Set(Fighter, Goblin), 2)
    val unwillingTarget = resolveJumpMovementReplacementSpell(initialState, Set(Fighter, Goblin), Set(Fighter), 2)
    val tooMany = resolveJumpMovementReplacementSpell(initialState, Set(Fighter, Goblin), Set(Fighter, Goblin), 1)
    all {
      assert(not(firstSlot.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(firstSlot, Fighter)),
      assert(firstSlot.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false }))),
      assert(secondSlot.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false }))),
      assert(secondSlot.goblin.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false }))),
      assert(unwillingTarget == initialState),
      assert(tooMany == initialState),
    }
  }

  run test_feather_fall_reaction_targets_slot_and_descent_cap = {
    val resolved = resolveFeatherFallSpell(initialState, Fighter, Set(Fighter, Goblin), Set(Fighter, Goblin), 2)
    val noReaction = resolveFeatherFallSpell({ ...initialState, fighter: { ...initialState.fighter, reactionAvailable: false } }, Fighter, Set(Fighter), Set(Fighter), 1)
    val nonFallingTarget = resolveFeatherFallSpell(initialState, Fighter, Set(Fighter, Goblin), Set(Fighter), 2)
    val tooMany = resolveFeatherFallSpell(initialState, Fighter, Set(Fighter, Goblin), Set(Fighter, Goblin), 6)
    val goblinTurnSpentSlot = commitActorSpellSlotUse(endTurn(initialState), Goblin)
    val offTurnResolved = resolveFeatherFallSpell(goblinTurnSpentSlot, Fighter, Set(Fighter), Set(Fighter), 1)
    all {
      assert(not(resolved.fighter.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(resolved.fighter.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(resolved.goblin.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(activeFeatherFallDescentRateCapFeetPerRound(resolved.fighter.activeEffects) == 60),
      assert(noReaction == { ...initialState, fighter: { ...initialState.fighter, reactionAvailable: false } }),
      assert(nonFallingTarget == initialState),
      assert(tooMany == initialState),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Goblin)),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Fighter)),
    }
  }

  run test_feather_fall_landing_cleanup_prevents_falling_outcomes = {
    val resolved = resolveFeatherFallSpell(initialState, Fighter, Set(Fighter, Goblin), Set(Fighter, Goblin), 2)
    val fighterLanding = resolveFeatherFallLanding(resolved, Fighter)
    val fighterLandingState = featherFallLandingState(fighterLanding)
    val staleLanding = resolveFeatherFallLanding(fighterLandingState, Fighter)
    val staleLandingState = featherFallLandingState(staleLanding)
    val unaffectedLanding = resolveFeatherFallLanding(initialState, Goblin)
    val unaffectedLandingState = featherFallLandingState(unaffectedLanding)
    all {
      assert(featherFallLandingFallDamagePrevented(fighterLanding)),
      assert(featherFallLandingFallingPronePrevented(fighterLanding)),
      assert(not(fighterLandingState.fighter.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 })))),
      assert(fighterLandingState.goblin.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(not(fighterLandingState.fighter.prone)),
      assert(not(featherFallLandingFallDamagePrevented(staleLanding))),
      assert(not(featherFallLandingFallingPronePrevented(staleLanding))),
      assert(staleLandingState == fighterLandingState),
      assert(not(featherFallLandingFallDamagePrevented(unaffectedLanding))),
      assert(not(featherFallLandingFallingPronePrevented(unaffectedLanding))),
      assert(unaffectedLandingState == initialState),
    }
  }

  run test_jump_movement_replacement_spends_ten_movement_once_per_target_turn = {
    val cast = resolveJumpMovementReplacementSpell(initialState, Set(Fighter), Set(Fighter), 1)
    val jumped = jumpMovementReplacementFighter(cast, 10, 30, JumpLegalLandingNoCheck)
    val secondSameTurn = jumpMovementReplacementFighter(jumped, 10, 30, JumpLegalLandingNoCheck)
    val nextFighterTurn = endTurn(endTurn(jumped))
    val nextTurnJumped = jumpMovementReplacementFighter(nextFighterTurn, 10, 30, JumpLegalLandingNoCheck)
    all {
      assert(jumped.fighter.movementSpent == 10),
      assert(jumped.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: true }))),
      assert(secondSameTurn == jumped),
      assert(nextFighterTurn.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 9, usedThisTurn: false }))),
      assert(nextTurnJumped.fighter.movementSpent == 10),
      assert(nextTurnJumped.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 9, usedThisTurn: true }))),
    }
  }

  run test_jump_movement_replacement_rejects_invalid_distance_cost_and_landing = {
    val cast = resolveJumpMovementReplacementSpell(initialState, Set(Fighter), Set(Fighter), 1)
    val tooCheap = jumpMovementReplacementFighter(cast, 5, 30, JumpLegalLandingAcrobaticsPassed)
    val tooFar = jumpMovementReplacementFighter(cast, 10, 35, JumpLegalLandingAcrobaticsPassed)
    val illegalLanding = jumpMovementReplacementFighter(cast, 10, 30, JumpIllegalLanding)
    val failedLanding = jumpMovementReplacementFighter(cast, 10, 30, JumpLegalLandingAcrobaticsFailed)
    all {
      assert(tooCheap == cast),
      assert(tooFar == cast),
      assert(illegalLanding == cast),
      assert(failedLanding.fighter.prone),
    }
  }

  run test_divine_favor_adds_radiant_damage_to_fighter_weapon_hits = {
    val favored = resolveDivineFavor(initialState)
    val hit = resolveAttack(favored, 15, 10, fighterWeaponAttackDamageRollWithDivineFavor(4, 3), true)
    all {
      assert(favored.fighter.activeEffects.contains(DivineFavorWeaponDamageRider({ durationTicks: favorWeaponDamageRiderDurationTicks }))),
      assert(not(favored.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(favored, Fighter)),
      assert(hit.goblin.hp == 0),
    }
  }

  run test_divine_favor_weapon_damage_rider_expires_after_one_minute = {
    val favored = resolveDivineFavor(initialState)
    val round1 = endTurn(endTurn(favored))
    val round2 = endTurn(endTurn(round1))
    val round3 = endTurn(endTurn(round2))
    val round4 = endTurn(endTurn(round3))
    val round5 = endTurn(endTurn(round4))
    val round6 = endTurn(endTurn(round5))
    val round7 = endTurn(endTurn(round6))
    val round8 = endTurn(endTurn(round7))
    val round9 = endTurn(endTurn(round8))
    val round10 = endTurn(endTurn(round9))
    val hit = resolveAttack(round10, 15, 10, fighterWeaponAttackDamageRollWithDivineFavor(4, 3), true)
    all {
      assert(activeEffectsContainDivineFavor(round9.fighter.activeEffects)),
      assert(not(activeEffectsContainDivineFavor(round10.fighter.activeEffects))),
      assert(hit.goblin.hp == 3),
    }
  }

  run test_divine_smite_after_hit_spends_bonus_action_and_slot_without_base_attack_replay = {
    val smote = resolveDivineSmiteAfterMeleeHit(initialState, 1, 5, HumanoidCreature, false, true)
    val alreadySpent = resolveDivineSmiteAfterMeleeHit(commitActorSpellSlotUse(initialState, Fighter), 1, 5, HumanoidCreature, false, true)
    val critical = resolveDivineSmiteAfterMeleeHit(initialState, 1, 5, HumanoidCreature, true, true)
    val freeSmote = resolvePaladinsSmiteAfterMeleeHit(initialState, 1, 5, HumanoidCreature, false, true)
    val freeAfterSlot = resolvePaladinsSmiteAfterMeleeHit(commitActorSpellSlotUse(initialState, Fighter), 1, 5, HumanoidCreature, false, true)
    val freeExhausted = resolvePaladinsSmiteAfterMeleeHit(initialState, 0, 5, HumanoidCreature, false, true)
    all {
      assert(smote.goblin.hp == 5),
      assert(not(smote.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(smote, Fighter)),
      assert(alreadySpent.goblin.hp == initialState.goblin.hp),
      assert(critical.goblin.hp == 0),
      assert(freeSmote.state.goblin.hp == 5),
      assert(freeSmote.paladinsSmiteUsesRemaining == 0),
      assert(not(freeSmote.state.bonusActionAvailable)),
      assert(not(battleActorHasSpellSlotUse(freeSmote.state, Fighter))),
      assert(freeAfterSlot.state.goblin.hp == 5),
      assert(freeExhausted.state == initialState),
    }
  }

  run test_ensnaring_strike_after_weapon_hit_restrains_damages_and_escapes = {
    val ensnared = resolveEnsnaringStrikeAfterWeaponHit(initialState, 1, false)
    val damaged = endTurnWithEnsnaringStrikeDamage(ensnared, 4, true)
    val escaped = escapeEnsnaringStrike(damaged, true, false)
    val helperTurn = endTurn(damaged)
    val helperWithoutReach = escapeEnsnaringStrike(helperTurn, true, false)
    val helperEscaped = escapeEnsnaringStrike(helperTurn, true, true)
    val saveSucceeded = resolveEnsnaringStrikeAfterWeaponHit(initialState, 1, true)
    all {
      assert(ensnared.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 }))),
      assert(ensnared.fighter.concentrating),
      assert(not(ensnared.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(ensnared, Fighter)),
      assert(damaged.goblin.hp == initialState.goblin.hp - 4),
      assert(not(escaped.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 })))),
      assert(not(escaped.fighter.concentrating)),
      assert(helperWithoutReach.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 }))),
      assert(not(helperEscaped.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 })))),
      assert(not(helperEscaped.fighter.concentrating)),
      assert(not(saveSucceeded.fighter.concentrating)),
      assert(not(activeEffectsContainEnsnaringStrike(saveSucceeded.goblin.activeEffects))),
      assert(ensnaringStrikeTargetHasSaveAdvantage(Large)),
      assert(not(ensnaringStrikeTargetHasSaveAdvantage(Medium))),
      assert(ensnaringStrikeDamageDiceForSlot(3) == 3),
    }
  }

  run test_searing_smite_after_hit_burns_and_constitution_save_ends = {
    val seared = resolveSearingSmiteAfterMeleeHit(initialState, 3, 6, false, true)
    val stillBurning = endTurnWithSearingSmiteDamageAndSave(seared, 9, false, true)
    val ended = endTurnWithSearingSmiteDamageAndSave(seared, 9, true, true)
    all {
      assert(seared.goblin.hp == initialState.goblin.hp - 6),
      assert(seared.goblin.activeEffects.contains(SearingSmiteBurning({ damageDice: 3, durationTicks: searingSmiteDurationTicks }))),
      assert(not(seared.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(seared, Fighter)),
      assert(stillBurning.goblin.hp == 0),
      assert(activeEffectsContainSearingSmite(stillBurning.goblin.activeEffects)),
      assert(ended.goblin.hp == 0),
      assert(not(activeEffectsContainSearingSmite(ended.goblin.activeEffects))),
      assert(searingSmiteDamageDiceForSlot(3) == 3),
    }
  }

  run test_searing_smite_burn_expires_after_duration_tick = {
    val burning = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(SearingSmiteBurning({ damageDice: 1, durationTicks: 1 })),
      },
    }
    val stillSameRound = endTurn(burning)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainSearingSmite(stillSameRound.goblin.activeEffects)),
      assert(not(activeEffectsContainSearingSmite(nextRound.goblin.activeEffects))),
    }
  }

  run test_true_strike_weapon_attack_uses_spellcasting_ability_and_cantrip_scaling = {
    val hit = resolveTrueStrikeWeaponAttack(
      { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } },
      15,
      10,
      4,
      5,
      3,
      5,
      Radiant,
      Slashing,
      true,
    )
    all {
      assert(hit.goblin.hp == 0),
      assert(not(hit.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(hit, Fighter))),
      assert(spellInvocationSpendsSpellSlot(TrueStrike) == false),
      assert(trueStrikeWeaponAttackModifier(3, 3) == 6),
      assert(trueStrikeDamageAfterAdjustments(4, 5, 3, 5, Radiant) == 12),
    }
  }

  run test_true_strike_damage_choice_and_bonus_dice_are_level_gated = {
    all {
      assert(trueStrikeDamageTypeChoiceIsLegal(Radiant, Slashing)),
      assert(trueStrikeDamageTypeChoiceIsLegal(Slashing, Slashing)),
      assert(not(trueStrikeDamageTypeChoiceIsLegal(Fire, Slashing))),
      assert(trueStrikeBonusDamageDice(1) == 0),
      assert(trueStrikeBonusDamageDice(5) == 1),
      assert(trueStrikeBonusDamageDice(11) == 2),
      assert(trueStrikeBonusDamageDice(17) == 3),
    }
  }

  run test_shillelagh_requires_held_club_or_quarterstaff_and_spends_bonus_action = {
    val club = resolveShillelagh(initialState, HeldClub, 3, 1)
    val quarterstaff = resolveShillelagh(initialState, HeldQuarterstaff, 3, 1)
    all {
      assert(club.fighter.activeEffects.contains(shillelaghEffect(ShillelaghClub, 3, 1))),
      assert(not(club.bonusActionAvailable)),
      assert(not(battleActorHasSpellSlotUse(club, Fighter))),
      assert(quarterstaff.fighter.activeEffects.contains(shillelaghEffect(ShillelaghQuarterstaff, 3, 1))),
      assert(resolveShillelagh(initialState, HeldOtherWeapon, 3, 1) == initialState),
      assert(resolveShillelagh(initialState, HeldNoWeapon, 3, 1) == initialState),
    }
  }

  run test_shillelagh_projects_spellcasting_attack_damage_type_choice_and_scaling = {
    all {
      assert(shillelaghAttackModifier(3, 2) == 5),
      assert(shillelaghDamageTypeChoiceIsLegal(Force, Bludgeoning)),
      assert(shillelaghDamageTypeChoiceIsLegal(Bludgeoning, Bludgeoning)),
      assert(not(shillelaghDamageTypeChoiceIsLegal(Fire, Bludgeoning))),
      assert(shillelaghDamageDice(1) == 1),
      assert(shillelaghDamageDieSize(1) == 8),
      assert(shillelaghDamageDice(5) == 1),
      assert(shillelaghDamageDieSize(5) == 10),
      assert(shillelaghDamageDice(11) == 1),
      assert(shillelaghDamageDieSize(11) == 12),
      assert(shillelaghDamageDice(17) == 2),
      assert(shillelaghDamageDieSize(17) == 6),
    }
  }

  run test_shillelagh_recast_replaces_prior_effect_and_lets_go_ends_projection = {
    val once = resolveShillelagh(initialState, HeldClub, 1, 1)
    val nextTurn = { ...once, bonusActionAvailable: true }
    val recast = resolveShillelagh(nextTurn, HeldQuarterstaff, 3, 17)
    val letGo = {
      ...recast,
      fighter: {
        ...recast.fighter,
        activeEffects: shillelaghEffectsMatchingHeldWeapon(recast.fighter.activeEffects, HeldNoWeapon),
      },
    }
    all {
      assert(recast.fighter.activeEffects == Set(shillelaghEffect(ShillelaghQuarterstaff, 3, 17))),
      assert(letGo.fighter.activeEffects == Set()),
    }
  }

  run test_pact_blade_damage_choice_and_charisma_option_projection = {
    all {
      assert(pactBladeDamageTypeChoiceIsLegal(Slashing, Slashing)),
      assert(pactBladeDamageTypeChoiceIsLegal(Necrotic, Slashing)),
      assert(pactBladeDamageTypeChoiceIsLegal(Psychic, Slashing)),
      assert(pactBladeDamageTypeChoiceIsLegal(Radiant, Slashing)),
      assert(not(pactBladeDamageTypeChoiceIsLegal(Fire, Slashing))),
      assert(pactBladeAbilityModifierChoiceIsLegal(4, 4, 3)),
      assert(pactBladeAbilityModifierChoiceIsLegal(3, 4, 3)),
      assert(not(pactBladeAbilityModifierChoiceIsLegal(2, 4, 3))),
      assert(pactBladeAttackModifier(3, 2) == 5),
      assert(pactBladeAttackModifier(4, 2) == 6),
    }
  }

}
