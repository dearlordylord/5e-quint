// -*- mode: Bluespec; -*-

module battleRuntimeSaveSpellTests {
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
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeGroundCommand.* from "./battle-runtime-ground-command"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

  run test_roll_modifier_concentration_effects_end_when_caster_concentration_breaks = {
    val concentrating = {
      ...endTurn(initialState),
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus, PassWithoutTraceStealthBonus),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus, PassWithoutTraceStealthBonus),
      },
    }
    val result = resolveGoblinAttack(concentrating, 20, 18, 5, false)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.fighter.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.fighter.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(not(result.fighter.activeEffects.contains(PassWithoutTraceStealthBonus))),
      assert(not(result.goblin.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.goblin.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(not(result.goblin.activeEffects.contains(PassWithoutTraceStealthBonus))),
    }
  }

  run test_roll_modifier_concentration_replacement_removes_prior_effects_before_new_effect = {
    val prior = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(BaneD20RollPenalty, GuidanceAbilityCheckBonus, PassWithoutTraceStealthBonus),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(BaneD20RollPenalty, GuidanceAbilityCheckBonus, PassWithoutTraceStealthBonus),
      },
    }
    val result = resolveRollModifierSpell(prior, BlessRollModifier, Set(Goblin), Set(), 1)
    all {
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(not(result.fighter.activeEffects.contains(PassWithoutTraceStealthBonus))),
      assert(not(result.fighter.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.goblin.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(not(result.goblin.activeEffects.contains(PassWithoutTraceStealthBonus))),
      assert(result.goblin.activeEffects.contains(BlessD20RollBonus)),
    }
  }

  run test_pass_without_trace_applies_stealth_bonus_to_chosen_aura_targets = {
    val result = resolveRollModifierSpell(initialState, PassWithoutTraceRollModifier, Set(Fighter, Goblin), Set(), 2)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(PassWithoutTraceStealthBonus)),
      assert(result.goblin.activeEffects.contains(PassWithoutTraceStealthBonus)),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
    }
  }

  run test_pass_without_trace_requires_caster_in_selected_targets = {
    val result = resolveRollModifierSpell(initialState, PassWithoutTraceRollModifier, Set(Goblin), Set(), 2)
    all {
      assert(result == initialState),
      assert(not(result.fighter.activeEffects.contains(PassWithoutTraceStealthBonus))),
      assert(not(result.goblin.activeEffects.contains(PassWithoutTraceStealthBonus))),
    }
  }

  run test_guidance_preserves_existing_turn_spell_slot_guard = {
    val alreadySpent = commitActorSpellSlotUse(initialState, Fighter)
    val result = resolveRollModifierSpell(alreadySpent, GuidanceRollModifier, Set(Fighter), Set(), 0)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus)),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
    }
  }

  run test_chromatic_orb_chained_replay_facts = {
    val noDuplicateFaces = {
      face1: 1,
      face2: 1,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val duplicateFaces = {
      face1: 2,
      face2: 0,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val criticalDuplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 1,
      face4: 1,
      face5: 1,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val level3DuplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 1,
      face4: 1,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val negativeFaceCount = {
      face1: -1,
      face2: 2,
      face3: 2,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }

    all {
      assert(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, false, noDuplicateFaces)),
      assert(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, true, criticalDuplicateFaces)),
      assert(not(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 0, false, noDuplicateFaces))),
      assert(not(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, false, negativeFaceCount))),
      assert(not(damageRollHasDuplicateD8Face(noDuplicateFaces))),
      assert(damageRollHasDuplicateD8Face(duplicateFaces)),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 0, false, duplicateFaces)),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 0, true, criticalDuplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 1, false, duplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, -1, false, duplicateFaces))),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 2, false, level3DuplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 2, false, duplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 3, false, level3DuplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 0, false, noDuplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 0, false, negativeFaceCount))),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbAcid) == Acid),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbCold) == Cold),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbFire) == Fire),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbLightning) == Lightning),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbPoison) == Poison),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbThunder) == Thunder),
      assert(chainedSpellAttackDamageStepDamageType(ChromaticOrbChainedSpellAttack, ChromaticOrbFire, 0) == Fire),
      assert(chainedSpellAttackDamageStepDamageType(ChromaticOrbChainedSpellAttack, ChromaticOrbFire, 2) == Fire),
    }
  }

  run test_chromatic_orb_chained_replay_holes_are_ordered = {
    all {
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageType) == Set(ChainedSpellDamageTypeChoice)),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsInitialTarget({ slotLevel: 1, selectedDamageType: ChromaticOrbLightning })) == Set(ChainedStepTargetChoice({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsInitialTarget({ slotLevel: 0, selectedDamageType: ChromaticOrbLightning })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set(ChainedStepAttackRoll({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 1,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
        criticalHit: false,
      })) == Set(ChainedStepDamageRoll({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: -1,
        criticalHit: false,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 1,
        target: Goblin,
        targeted: Set(),
        leapsUsed: 1,
        criticalHit: false,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set(ChainedStepTargetChoice({ stepIndex: 1 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedComplete) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, false, ChainedNeedsDamageType) == Set()),
    }
  }

  run test_chromatic_orb_leap_target_invariants = {
    all {
      assert(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsInitialTarget({ slotLevel: 1, selectedDamageType: ChromaticOrbAcid }), Goblin, false)),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsInitialTarget({ slotLevel: 0, selectedDamageType: ChromaticOrbAcid }), Goblin, false))),
      assert(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, true)),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Goblin, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, false))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: -1,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      }), Fighter, true))),
    }
  }

  run test_acid_splash_replay_asks_for_saving_throw_outcomes_then_damage_on_failure = {
    all {
      assert(acidSplashReplayHoles(true, false, false) == Set(SavingThrowOutcome)),
      assert(acidSplashReplayHoles(true, true, true) == Set(DamageRoll)),
      assert(acidSplashReplayHoles(true, true, false) == Set()),
      assert(acidSplashReplayHoles(false, false, false) == Set()),
    }
  }

  run test_single_target_save_damage_replay_asks_for_target_then_saving_throw_then_damage = {
    all {
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, false, false, false) == Set(TargetChoice)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, true, false) == Set()),
      assert(saveGatedDamageReplayHoles(InflictWoundsSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(BurningHandsSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(BurningHandsSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(FireballSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(FireballSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, true, true) == Set()),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, false, true) == Set()),
      assert(saveGatedConditionReplayHoles(EntangleSaveGate, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(EntangleSaveGate, true, true, true) == Set()),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, false, false) == Set(SpellTargetList)),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, true, true) == Set()),
      assert(saveGatedAttackRollAdvantageReplayHoles(FaerieFireSaveGate, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedAttackRollAdvantageReplayHoles(FaerieFireSaveGate, true, true) == Set()),
    }
  }

  run test_ice_knife_replay_asks_for_attack_damage_then_mandatory_burst = {
    all {
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, false, false, false, false, false, false) == Set(TargetChoice)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, false, false, false, false, false) == Set(AttackRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, true, false, false, false) == Set(DamageRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, false, false, false, false) == Set(SavingThrowOutcome)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, false, false, true, true) == Set(SpellDamageRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, false, false, false, false, false, false, false) == Set()),
    }
  }

  run test_acid_splash_damage_applies_only_to_failed_saving_throw_targets = {
    val result = resolveAcidSplash(initialState, false, true, 4, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 6),
    }
  }

  run test_burning_hands_area_save_damage_halves_success_and_spends_slot = {
    val result = resolveBurningHands(initialState, false, true, 6, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 6),
      assert(result.goblin.hp == 7),
    }
  }

  run test_burning_hands_empty_area_spends_slot_without_damage = {
    val result = resolveBurningHandsEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 10),
    }
  }

  run test_fireball_area_save_damage_halves_success_and_spends_slot = {
    val result = resolveFireball(initialState, false, true, 8, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 4),
      assert(result.goblin.hp == 6),
    }
  }

  run test_fireball_empty_area_spends_slot_without_damage = {
    val result = resolveFireballEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 10),
    }
  }

  run test_ice_knife_critical_doubles_only_primary_piercing_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolveIceKnife(noReaction, 20, 20, 5, false, false, false, 6, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.attackRollMadeThisTurn),
      assert(result.goblin.hp == 0),
      assert(result.fighter.hp == 12),
    }
  }

  run test_ice_knife_miss_still_resolves_primary_target_burst_save = {
    val failed = resolveIceKnife(initialState, 1, 1, 5, false, false, false, 6, true, true)
    val succeeded = resolveIceKnife(initialState, 1, 1, 5, true, false, false, 6, true, true)
    all {
      assert(failed.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(failed, Fighter)),
      assert(failed.goblin.hp == 4),
      assert(succeeded.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(succeeded, Fighter)),
      assert(succeeded.goblin.hp == 10),
    }
  }

  run test_ice_knife_burst_can_include_caster_but_primary_target_is_always_included = {
    val result = resolveIceKnife(initialState, 1, 1, 5, false, true, false, 6, true, true)
    val casterSucceeded = resolveIceKnife(initialState, 1, 1, 5, false, true, true, 6, true, true)
    all {
      assert(result.goblin.hp == 4),
      assert(result.fighter.hp == 6),
      assert(casterSucceeded.goblin.hp == 4),
      assert(casterSucceeded.fighter.hp == 12),
    }
  }

  run test_ice_knife_combines_attack_and_burst_damage_for_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, reactionAvailable: false, activeEffects: Set(GuidanceAbilityCheckBonus) } }
    val result = resolveIceKnife(concentratingGoblin, 15, 10, 4, false, false, false, 6, false, true)
    all {
      assert(result.goblin.hp == 0),
      assert(not(result.goblin.concentrating)),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
    }
  }

  run test_ice_knife_spell_attack_hit_opens_shield_reaction_before_damage = {
    val awaiting = resolveIceKnife(initialState, 15, 10, 4, false, false, false, 6, true, true)
    all {
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeIceKnife,
      })),
      assert(awaiting.goblin.hp == 10),
      assert(awaiting.actionAvailable),
      assert(not(battleActorHasSpellSlotUse(awaiting, Fighter))),
    }
  }

  run test_color_spray_area_save_applies_blinded_and_spends_slot = {
    val result = resolveColorSpray(initialState, false, true)
    val blinded = ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 })
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.activeEffects.contains(blinded)),
      assert(not(result.goblin.activeEffects.contains(blinded))),
    }
  }

  run test_color_spray_blinded_expires_at_end_of_caster_next_turn = {
    val hit = resolveColorSpray(initialState, true, false)
    val afterFighterTurn = endTurn(hit)
    val afterGoblinTurn = endTurn(afterFighterTurn)
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    val blinded = ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 })
    all {
      assert(hit.goblin.activeEffects.contains(blinded)),
      assert(afterFighterTurn.goblin.activeEffects.contains(blinded)),
      assert(afterGoblinTurn.goblin.activeEffects.contains(blinded)),
      assert(not(afterFighterNextTurn.goblin.activeEffects.contains(blinded))),
    }
  }

  run test_color_spray_empty_area_spends_slot_without_effect = {
    val result = resolveColorSprayEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(not(result.fighter.activeEffects.exists(effect => match effect {
        | ColorSprayBlinded(_) => true
        | _ => false
      }))),
      assert(not(result.goblin.activeEffects.exists(effect => match effect {
        | ColorSprayBlinded(_) => true
        | _ => false
      }))),
    }
  }

  run test_faerie_fire_applies_outline_until_concentration_break = {
    val lit = resolveFaerieFire(initialState, true, false)
    val broken = breakConcentrationSpellEffects(lit, Fighter)
    all {
      assert(lit.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(lit, Fighter)),
      assert(lit.fighter.concentrating),
      assert(not(lit.fighter.activeEffects.contains(FaerieFireOutline))),
      assert(lit.goblin.activeEffects.contains(FaerieFireOutline)),
      assert(faerieFireDimLightRadiusFeet == 10),
      assert(battleRuntimeLightEmitters(lit).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: CombatantLightEmitter({ actor: Goblin }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      }))),
      assert(activeEffectsDenyInvisibleBenefit(lit.goblin.activeEffects)),
      assert(spellAttackRollModeFromActiveEffects(Set(), lit.goblin.activeEffects, true) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), lit.goblin.activeEffects, false) == NormalSpellAttackRoll),
      assert(not(broken.goblin.activeEffects.contains(FaerieFireOutline))),
      assert(not(battleRuntimeLightEmitters(broken).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: CombatantLightEmitter({ actor: Goblin }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      })))),
      assert(not(activeEffectsDenyInvisibleBenefit(broken.goblin.activeEffects))),
    }
  }

  run test_faerie_fire_object_outline_until_concentration_break = {
    val lit = resolveFaerieFireWithObjects(initialState, true, true, Set(FaerieFireObjectTarget))
    val broken = breakConcentrationSpellEffects(lit, Fighter)
    all {
      assert(lit.objectOutlines.contains(FaerieFireObjectOutline({ source: Fighter, object: FaerieFireObjectTarget }))),
      assert(battleRuntimeLightEmitters(lit).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: ObjectLightEmitter({ object: FaerieFireObjectTarget }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      }))),
      assert(objectOutlinesDenyInvisibleBenefit(lit.objectOutlines, FaerieFireObjectTarget)),
      assert(battleIlluminationFromLightEmitters(
        battleRuntimeLightEmitters(lit),
        Set(ObjectLightEmitterProjectionFact({
          object: FaerieFireObjectTarget,
          distanceFeet: 10,
          opaqueCover: true,
        }))
      ) == DimLightIllumination),
      assert(spellObjectAttackRollModeFromActiveEffects(Set(), lit.objectOutlines, FaerieFireObjectTarget, true) == AdvantageSpellAttackRoll),
      assert(spellObjectAttackRollModeFromActiveEffects(Set(), lit.objectOutlines, FaerieFireObjectTarget, false) == NormalSpellAttackRoll),
      assert(spellObjectAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), lit.objectOutlines, FaerieFireObjectTarget, true) == NormalSpellAttackRoll),
      assert(not(broken.objectOutlines.contains(FaerieFireObjectOutline({ source: Fighter, object: FaerieFireObjectTarget })))),
      assert(not(battleRuntimeLightEmitters(broken).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: ObjectLightEmitter({ object: FaerieFireObjectTarget }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      })))),
      assert(not(objectOutlinesDenyInvisibleBenefit(broken.objectOutlines, FaerieFireObjectTarget))),
    }
  }

  run test_entangle_excludes_caster_and_applies_restrained_until_concentration_or_escape = {
    val rejectedCasterArea = resolveEntangle(initialState, true, false)
    val entangled = resolveEntangle(initialState, false, false)
    val broken = breakConcentrationSpellEffects(entangled, Fighter)
    val escaped = escapeEntangle({ ...entangled, initiative: { round: 1, alreadyActed: List(Fighter), stillToAct: List(Goblin) }, actionAvailable: true }, true)
    all {
      assert(not(rejectedCasterArea.goblin.activeEffects.contains(EntangleRestrained))),
      assert(entangled.fighter.concentrating),
      assert(entangled.goblin.activeEffects.contains(EntangleRestrained)),
      assert(not(broken.goblin.activeEffects.contains(EntangleRestrained))),
      assert(not(escaped.goblin.activeEffects.contains(EntangleRestrained))),
    }
  }

  run test_charm_person_target_list_slot_scaling_and_damage_break = {
    val failed = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      1,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val damaged = resolveAttack({ ...failed, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(1), true)
    val twoTargets = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      2,
      true,
      HumanoidCreature,
      false,
      true,
      HumanoidCreature,
      false,
    )
    val illegalTwoTargets = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      1,
      true,
      HumanoidCreature,
      false,
      true,
      HumanoidCreature,
      false,
    )
    all {
      assert(failed.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(not(damaged.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })))),
      assert(twoTargets.fighter.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(twoTargets.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(illegalTwoTargets == initialState),
    }
  }

  run test_sleep_failed_initial_save_adds_pending_repeat_save_until_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val broken = breakConcentrationSpellEffects(slept, Fighter)
    all {
      assert(not(slept.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(slept, Fighter)),
      assert(slept.fighter.concentrating),
      assert(slept.goblin.incapacitated),
      assert(slept.goblin.activeEffects.contains(SleepPendingRepeatSave({
        source: Fighter,
        repeatAtActor: Goblin,
        repeatAtRound: 1,
        hadIncapacitated: false,
      }))),
      assert(not(broken.fighter.concentrating)),
      assert(not(broken.goblin.incapacitated)),
      assert(not(sleepRepeatSaveDue(broken.goblin.activeEffects, Goblin, 1))),
    }
  }

  run test_sleep_non_sleeper_and_exhaustion_immunity_auto_success = {
    val nonSleeper = resolveSleepTargetAdmission(initialState, false, true, false)
    val exhaustionImmune = resolveSleepTargetAdmission(initialState, false, false, true)
    all {
      assert(not(nonSleeper.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(nonSleeper, Fighter)),
      assert(nonSleeper.fighter.concentrating),
      assert(not(nonSleeper.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(nonSleeper.goblin))),
      assert(not(exhaustionImmune.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(exhaustionImmune, Fighter)),
      assert(exhaustionImmune.fighter.concentrating),
      assert(not(exhaustionImmune.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(exhaustionImmune.goblin))),
    }
  }

  run test_sleep_repeat_save_success_removes_pending_effect = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, true)
    all {
      assert(sleepRepeatSaveHoles(goblinTurn) == Set(SavingThrowOutcome)),
      assert(not(repeated.goblin.incapacitated)),
      assert(not(sleepRepeatSaveDue(repeated.goblin.activeEffects, Goblin, 1))),
    }
  }

  run test_sleep_failed_initial_save_breaks_target_concentration = {
    val concentratingGoblin = {
      ...initialState,
      goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus) },
    }
    val slept = resolveSleepTargetAdmission(concentratingGoblin, false, false, false)
    all {
      assert(not(slept.goblin.concentrating)),
      assert(not(slept.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(slept.goblin.activeEffects.contains(SleepPendingRepeatSave({
        source: Fighter,
        repeatAtActor: Goblin,
        repeatAtRound: 1,
        hadIncapacitated: false,
      }))),
    }
  }

  run test_sleep_repeat_save_failure_escalates_to_unconscious_until_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, false)
    val broken = breakConcentrationSpellEffects(repeated, Fighter)
    all {
      assert(repeated.goblin.unconscious),
      assert(repeated.goblin.prone),
      assert(not(repeated.goblin.incapacitated)),
      assert(repeated.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      }))),
      assert(not(broken.goblin.unconscious)),
      assert(broken.goblin.prone),
      assert(not(broken.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      })))),
    }
  }

  run test_sleep_repeat_save_failure_breaks_target_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val concentratingGoblinTurn = {
      ...goblinTurn,
      goblin: { ...goblinTurn.goblin, concentrating: true, activeEffects: goblinTurn.goblin.activeEffects.union(Set(GuidanceAbilityCheckBonus)) },
    }
    val repeated = endTurnWithSleepRepeatSave(concentratingGoblinTurn, false)
    all {
      assert(not(repeated.goblin.concentrating)),
      assert(not(repeated.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(repeated.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      }))),
    }
  }

  run test_sleep_damage_ends_pending_sleep_on_target = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val damaged = { ...slept, goblin: applyDamageFromSource(slept.goblin, 1, 1, true, OrdinaryDamage, Goblin) }
    all {
      assert(not(damaged.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(damaged.goblin))),
    }
  }

  run test_sleep_damage_ends_unconscious_sleep_and_leaves_prone = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, false)
    val damaged = { ...repeated, goblin: applyDamageFromSource(repeated.goblin, 1, 1, true, OrdinaryDamage, Goblin) }
    all {
      assert(not(damaged.goblin.unconscious)),
      assert(damaged.goblin.prone),
      assert(not(combatantHasSleepEffect(damaged.goblin))),
    }
  }

  run test_hideous_laughter_failed_save_applies_conditions_and_concentration = {
    val laughed = resolveHideousLaughter(initialState, false, 1)
    all {
      assert(laughed.goblin.prone),
      assert(laughed.goblin.incapacitated),
      assert(laughed.fighter.concentrating),
      assert(laughed.goblin.activeEffects.contains(HideousLaughterEffect({
        source: Fighter,
        target: Goblin,
        hadProne: false,
        hadIncapacitated: false,
        durationTicks: hideousLaughterDurationTicks,
      }))),
      assert(hideousLaughterMaxTargets(1) == 1),
      assert(hideousLaughterMaxTargets(2) == 2),
      assert(hideousLaughterDurationTicks == 10),
    }
  }

  run test_hideous_laughter_expires_after_one_minute_duration = {
    val expiring = {
      ...initialState,
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: {
        ...initialState.goblin,
        prone: true,
        incapacitated: true,
        activeEffects: Set(HideousLaughterEffect({
          source: Fighter,
          target: Goblin,
          hadProne: false,
          hadIncapacitated: false,
          durationTicks: 1,
        })),
      },
    }
    val expired = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(expired.fighter.concentrating)),
      assert(not(expired.goblin.prone)),
      assert(not(expired.goblin.incapacitated)),
      assert(not(combatantHasHideousLaughter(expired.goblin))),
    }
  }

  run test_hideous_laughter_repeat_and_damage_saves_end_effect = {
    val laughed = resolveHideousLaughter(initialState, false, 1)
    val goblinTurn = endTurn(laughed)
    val repeated = endTurnWithHideousLaughterRepeatSave(goblinTurn, true)
    val damaged = combatantAfterHideousLaughterDamageRepeatSave(laughed.goblin, Fighter, Goblin, 1, true)
    all {
      assert(hideousLaughterRepeatSaveHoles(goblinTurn) == Set(SavingThrowOutcome)),
      assert(not(repeated.goblin.prone)),
      assert(not(repeated.goblin.incapacitated)),
      assert(not(combatantHasHideousLaughter(repeated.goblin))),
      assert(hideousLaughterDamageRepeatSaveRollMode(laughed.goblin) == AdvantageSavingThrow),
      assert(not(damaged.prone)),
      assert(not(damaged.incapacitated)),
      assert(not(combatantHasHideousLaughter(damaged))),
    }
  }

  run test_hideous_laughter_suppresses_standing_from_prone = {
    val laughedAtFighter = {
      ...initialState,
      fighter: hideousLaughterTarget(initialState.fighter, Fighter, false, Goblin),
    }
    val stood = standFighterFromProne(laughedAtFighter)
    assert(stood == laughedAtFighter)
  }

  run test_sleep_adjacent_action_shakes_target_awake = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val nextRoundFighterTurn = {
      ...slept,
      initiative: { round: 2, alreadyActed: List(), stillToAct: List(Fighter, Goblin) },
      actionAvailable: true,
    }
    val shaken = shakeAwakeFromSleep(nextRoundFighterTurn, Goblin, true)
    val notAdjacent = shakeAwakeFromSleep(nextRoundFighterTurn, Goblin, false)
    all {
      assert(not(shaken.actionAvailable)),
      assert(not(shaken.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(shaken.goblin))),
      assert(notAdjacent == nextRoundFighterTurn),
    }
  }

  run test_sacred_flame_applies_radiant_damage_only_on_failed_saving_throw = {
    val failed = resolveSacredFlame(initialState, false, 7, true)
    val succeeded = resolveSacredFlame(initialState, true, 7, true)
    all {
      assert(failed.actionAvailable == false),
      assert(failed.goblin.hp == 3),
      assert(not(battleActorHasSpellSlotUse(failed, Fighter))),
      assert(succeeded.actionAvailable == false),
      assert(succeeded.goblin.hp == 10),
      assert(not(battleActorHasSpellSlotUse(succeeded, Fighter))),
    }
  }

  run test_inflict_wounds_spends_slot_and_halves_damage_on_successful_saving_throw = {
    val failed = resolveInflictWounds(initialState, false, 10, true)
    val succeeded = resolveInflictWounds(initialState, true, 10, true)
    val alreadySpent = commitActorSpellSlotUse(initialState, Fighter)
    all {
      assert(failed.actionAvailable == false),
      assert(failed.goblin.hp == 0),
      assert(battleActorHasCommittedSpellSlotUse(failed, Fighter)),
      assert(succeeded.actionAvailable == false),
      assert(succeeded.goblin.hp == 5),
      assert(battleActorHasCommittedSpellSlotUse(succeeded, Fighter)),
      assert(resolveInflictWounds(alreadySpent, false, 10, true) == alreadySpent),
    }
  }

}
