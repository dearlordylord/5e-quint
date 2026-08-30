// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-hypnotic-pattern-control
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.creature-type-protection-and-charm

module battleRuntimeHypnoticPatternTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeSaveGatedControlEscape.* from "./battle-runtime-save-gated-control-escape"

  run test_hypnotic_pattern_failed_save_spends_slot_and_projects_control = {
    val controlled = resolveHypnoticPattern(initialState, false, 3)
    val tooLow = resolveHypnoticPattern(initialState, false, 2)
    all {
      assert(tooLow == initialState),
      assert(not(controlled.actionAvailable)),
      assert(battleActorHasSpellSlotUse(controlled, Fighter)),
      assert(controlled.fighter.concentrating),
      assert(combatantHasHypnoticPattern(controlled.goblin)),
      assert(combatantHasHypnoticPatternCharmedProjection(controlled.goblin)),
      assert(controlled.goblin.incapacitated),
      assert(hypnoticPatternEffectiveSpeed(controlled.goblin) == 0),
      assert(controlled.goblin.activeEffects.contains(HypnoticPatternEffect({
        source: Fighter,
        target: Goblin,
        hadCharmed: false,
        hadIncapacitated: false,
        durationTicks: hypnoticPatternDurationTicks,
      }))),
      assert(hypnoticPatternDurationTicks == 10),
    }
  }

  run test_hypnotic_pattern_successful_save_spends_slot_without_concentration_or_control = {
    val resisted = resolveHypnoticPattern(initialState, true, 3)
    all {
      assert(not(resisted.actionAvailable)),
      assert(battleActorHasSpellSlotUse(resisted, Fighter)),
      assert(not(resisted.fighter.concentrating)),
      assert(not(combatantHasHypnoticPattern(resisted.goblin))),
      assert(not(combatantHasHypnoticPatternCharmedProjection(resisted.goblin))),
      assert(not(resisted.goblin.incapacitated)),
      assert(hypnoticPatternEffectiveSpeed(resisted.goblin) == initialState.goblin.speed),
    }
  }

  run test_hypnotic_pattern_charmed_prevention_spends_slot_without_concentration_or_control = {
    val protected = resolveHypnoticPatternWithCharmedPrevention(initialState, false, true, 3)
    all {
      assert(not(protected.actionAvailable)),
      assert(battleActorHasSpellSlotUse(protected, Fighter)),
      assert(not(protected.fighter.concentrating)),
      assert(not(combatantHasHypnoticPattern(protected.goblin))),
      assert(not(combatantHasHypnoticPatternCharmedProjection(protected.goblin))),
      assert(not(protected.goblin.incapacitated)),
      assert(hypnoticPatternEffectiveSpeed(protected.goblin) == initialState.goblin.speed),
    }
  }

  run test_hypnotic_pattern_charmed_immunity_blocks_control_application = {
    val immune = {
      ...initialState.goblin,
      activeEffects: initialState.goblin.activeEffects.union(Set(CalmEmotionsCharmedImmunity)),
    }
    val protected = hypnoticPatternTarget(immune, Goblin, false, Fighter)
    all {
      assert(protected.activeEffects.contains(CalmEmotionsCharmedImmunity)),
      assert(not(combatantHasHypnoticPattern(protected))),
      assert(not(combatantHasHypnoticPatternCharmedProjection(protected))),
      assert(not(protected.incapacitated)),
      assert(hypnoticPatternEffectiveSpeed(protected) == initialState.goblin.speed),
    }
  }

  run test_hypnotic_pattern_damage_ends_only_spell_owned_control = {
    val independentlyCharmed = {
      ...initialState.goblin,
      activeEffects: Set(CharmPersonCharmed({ source: Goblin, durationTicks: 10 })),
    }
    val controlled = hypnoticPatternTarget(independentlyCharmed, Goblin, false, Fighter)
    val damaged = combatantAfterHypnoticPatternDamage(controlled, Fighter, Goblin, 1)
    val noDamage = combatantAfterHypnoticPatternDamage(controlled, Fighter, Goblin, 0)
    all {
      assert(combatantHasHypnoticPattern(controlled)),
      assert(not(controlEffectRemainsAfter(TargetDamaged))),
      assert(not(combatantHasHypnoticPattern(damaged))),
      assert(damaged.activeEffects.contains(CharmPersonCharmed({ source: Goblin, durationTicks: 10 }))),
      assert(not(damaged.incapacitated)),
      assert(hypnoticPatternEffectiveSpeed(damaged) == initialState.goblin.speed),
      assert(noDamage == controlled),
    }
  }

  run test_hypnotic_pattern_physical_shake_action_ends_control = {
    val controlled = resolveHypnoticPattern(initialState, false, 3)
    val nextRoundFighterTurn = {
      ...controlled,
      initiative: { round: 2, alreadyActed: List(), stillToAct: { actor: Fighter, waiting: List(Goblin) } },
      actionAvailable: true,
    }
    val shaken = shakeAwakeFromHypnoticPattern(nextRoundFighterTurn, Goblin, true)
    val physicallyUnreachable = shakeAwakeFromHypnoticPattern(nextRoundFighterTurn, Goblin, false)
    val affectedCreatureTurn = {
      ...controlled,
      initiative: { round: 2, alreadyActed: List(), stillToAct: { actor: Goblin, waiting: List(Fighter) } },
      actionAvailable: true,
    }
    val affectedCreatureSelfShake = shakeAwakeFromHypnoticPattern(affectedCreatureTurn, Goblin, true)
    all {
      assert(not(shaken.actionAvailable)),
      assert(not(shaken.goblin.incapacitated)),
      assert(not(combatantHasHypnoticPattern(shaken.goblin))),
      assert(hypnoticPatternEffectiveSpeed(shaken.goblin) == initialState.goblin.speed),
      assert(physicallyUnreachable == nextRoundFighterTurn),
      assert(affectedCreatureSelfShake == affectedCreatureTurn),
    }
  }

  run test_hypnotic_pattern_expires_after_one_minute_duration = {
    val expiring = {
      ...initialState,
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: {
        ...initialState.goblin,
        incapacitated: true,
        activeEffects: Set(HypnoticPatternEffect({
          source: Fighter,
          target: Goblin,
          hadCharmed: false,
          hadIncapacitated: false,
          durationTicks: 1,
        })),
      },
    }
    val expired = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(expired.fighter.concentrating)),
      assert(not(expired.goblin.incapacitated)),
      assert(not(combatantHasHypnoticPattern(expired.goblin))),
      assert(not(combatantHasHypnoticPatternCharmedProjection(expired.goblin))),
      assert(hypnoticPatternEffectiveSpeed(expired.goblin) == initialState.goblin.speed),
    }
  }

  run test_hypnotic_pattern_preserves_control_when_overlapping_hideous_laughter_expires = {
    val overlapping = {
      ...initialState,
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: {
        ...initialState.goblin,
        prone: true,
        incapacitated: true,
        activeEffects: Set(
          HypnoticPatternEffect({
            source: Fighter,
            target: Goblin,
            hadCharmed: false,
            hadIncapacitated: false,
            durationTicks: 2,
          }),
          HideousLaughterEffect({
            source: Fighter,
            target: Goblin,
            hadProne: false,
            hadIncapacitated: false,
            heightenedRepeatSaveDisadvantage: false,
            durationTicks: 1,
          }),
        ),
      },
    }
    val ticked = tickRoundDurationSpellEffects(overlapping)
    all {
      assert(ticked.fighter.concentrating),
      assert(combatantHasHypnoticPattern(ticked.goblin)),
      assert(not(combatantHasHideousLaughter(ticked.goblin))),
      assert(ticked.goblin.incapacitated),
      assert(hypnoticPatternEffectiveSpeed(ticked.goblin) == 0),
    }
  }

  run test_hypnotic_pattern_preserves_control_when_overlapping_hold_person_expires = {
    val overlapping = {
      ...initialState,
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: {
        ...initialState.goblin,
        incapacitated: true,
        activeEffects: Set(
          HypnoticPatternEffect({
            source: Fighter,
            target: Goblin,
            hadCharmed: false,
            hadIncapacitated: false,
            durationTicks: 2,
          }),
          HoldPersonParalyzed({
            source: Fighter,
            hadIncapacitated: false,
            heightenedRepeatSaveDisadvantage: false,
            durationTicks: 1,
          }),
        ),
      },
    }
    val ticked = tickRoundDurationSpellEffects(overlapping)
    all {
      assert(ticked.fighter.concentrating),
      assert(combatantHasHypnoticPattern(ticked.goblin)),
      assert(not(ticked.goblin.activeEffects.exists(effect => match effect {
        | HoldPersonParalyzed(_) => true
        | _ => false
      }))),
      assert(ticked.goblin.incapacitated),
      assert(hypnoticPatternEffectiveSpeed(ticked.goblin) == 0),
    }
  }

}
