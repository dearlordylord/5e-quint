// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-after-hit-damage spell.invocation-after-hit-damage-illumination spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save

module battleRuntimeAfterHitSpellTests {
  import battleRuntimeSpellAttackRollAndVisibilityFacts.* from "./battle-runtime-spell-attack-roll-and-visibility-facts"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"
  import battleRuntimeWeaponHitTurnEffects.* from "./battle-runtime-weapon-hit-turn-effects"

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
    val damaged = endTurnWithEnsnaringStrikeOngoingDamage(ensnared, 4, true)
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
    val stillBurning = endTurnWithSearingSmiteOngoingDamageAndSave(seared, 9, false, true)
    val ended = endTurnWithSearingSmiteOngoingDamageAndSave(seared, 9, true, true)
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
  run test_shining_smite_after_hit_illuminates_and_concentration_cleanup_removes_light = {
    val shone = resolveShiningSmiteAfterMeleeHit(initialState, 3, 6, false, true)
    val broken = breakConcentrationSpellEffects(shone, Fighter)
    val shiningEffect = ShiningSmiteIllumination({
      durationTicks: shiningSmiteDurationTicks,
    })
    all {
      assert(shone.goblin.hp == initialState.goblin.hp - 6),
      assert(shone.goblin.activeEffects.contains(shiningEffect)),
      assert(shone.fighter.concentrating),
      assert(not(shone.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(shone, Fighter)),
      assert(shiningSmiteDamageDiceForSlot(1) == 0),
      assert(shiningSmiteDamageDiceForSlot(3) == 3),
      assert(activeEffectsContainShiningSmite(shone.goblin.activeEffects)),
      assert(activeEffectsDenyInvisibleBenefit(shone.goblin.activeEffects)),
      assert(spellAttackRollModeFromActiveEffects(Set(), shone.goblin.activeEffects, true) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), shone.goblin.activeEffects, false) == AdvantageSpellAttackRoll),
      assert(battleRuntimeLightEmitters(shone).contains(shiningSmiteBrightLightEmitter(Goblin))),
      assert(not(activeEffectsContainShiningSmite(broken.goblin.activeEffects))),
      assert(not(battleRuntimeLightEmitters(broken).contains(shiningSmiteBrightLightEmitter(Goblin)))),
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
}
