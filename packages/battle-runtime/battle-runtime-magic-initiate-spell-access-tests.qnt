// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof battle.spell-access-magic-initiate-casting

module battleRuntimeMagicInitiateSpellAccessTests {
  import battleRuntimeMagicInitiateSpellAccess.* from "./battle-runtime-magic-initiate-spell-access"

  pure val freshResources: SpellAccessResourceState = {
    actionsRemaining: 1,
    freeCastExpended: Map(
      { source: FeatSpellAccess({ sourceIdentity: FirstFeatSource }), spell: LevelOnePreparedSpell } -> 0,
      { source: FeatSpellAccess({ sourceIdentity: SecondFeatSource }), spell: LevelOnePreparedSpell } -> 0
    ),
    ordinarySlotUsesRemaining: Map(1 -> 2),
  }

  pure val higherLevelResources: SpellAccessResourceState = {
    actionsRemaining: 1,
    freeCastExpended: Map(
      { source: FeatSpellAccess({ sourceIdentity: FirstFeatSource }), spell: LevelOnePreparedSpell } -> 0,
      { source: FeatSpellAccess({ sourceIdentity: SecondFeatSource }), spell: LevelOnePreparedSpell } -> 0
    ),
    ordinarySlotUsesRemaining: Map(2 -> 1),
  }

  pure val featLevelOneIntelligence: SpellAccess = {
    identity: {
      source: FeatSpellAccess({ sourceIdentity: FirstFeatSource }),
      spell: LevelOnePreparedSpell,
    },
    spellcastingAbility: Intelligence,
  }

  pure val featLevelOneCharisma: SpellAccess = {
    identity: {
      source: FeatSpellAccess({ sourceIdentity: SecondFeatSource }),
      spell: LevelOnePreparedSpell,
    },
    spellcastingAbility: Charisma,
  }

  pure val classLevelOneWisdom: SpellAccess = {
    identity: {
      source: ClassSpellAccess,
      spell: LevelOnePreparedSpell,
    },
    spellcastingAbility: Wisdom,
  }

  pure val classCantripWisdom: SpellAccess = {
    identity: {
      source: ClassSpellAccess,
      spell: CantripSpell,
    },
    spellcastingAbility: Wisdom,
  }

  run test_source_scope_and_chosen_access_ability = {
    all {
      assert(spellAccessSatisfiesClassOnlyPredicate(classLevelOneWisdom)),
      assert(not(spellAccessSatisfiesClassOnlyPredicate(featLevelOneIntelligence))),
      assert(classLevelOneWisdom.identity != featLevelOneIntelligence.identity),
      assert(featLevelOneIntelligence.identity != featLevelOneCharisma.identity),
      assert(spellAccessCastingAbility(featLevelOneCharisma) == Charisma),
      assert(spellAccessCastingAbility(classCantripWisdom) == Wisdom),
    }
  }

  run test_cantrip_is_slotless_and_preserves_resource_state = {
    val result = resolveSpellAccessCast(
      classCantripWisdom,
      freshResources,
      NoSlotPayment
    )
    all {
      assert(match result {
        | SpellAccessCastAccepted(data) => all {
            data.state.actionsRemaining == 0,
            data.state.freeCastExpended == freshResources.freeCastExpended,
            data.state.ordinarySlotUsesRemaining == freshResources.ordinarySlotUsesRemaining,
            data.payment == NoSlotPayment,
            data.spellcastingAbility == Wisdom,
          }
        | SpellAccessCastRejected => false
      }),
      assert(not(spellAccessPaymentIsAvailable(
        classCantripWisdom,
        freshResources,
        OrdinarySlotPayment({ slotLevel: 1 })
      ))),
    }
  }

  run test_feat_level_one_free_cast_spends_only_free_resource = {
    val result = resolveSpellAccessCast(
      featLevelOneIntelligence,
      freshResources,
      FreeLongRestPayment
    )
    all {
      assert(match result {
        | SpellAccessCastAccepted(data) => all {
            data.state.freeCastExpended.get(featLevelOneIntelligence.identity) == 1,
            data.state.freeCastExpended.get(featLevelOneCharisma.identity) == 0,
            data.state.actionsRemaining == 0,
            data.state.ordinarySlotUsesRemaining.get(1) == freshResources.ordinarySlotUsesRemaining.get(1),
            data.spellcastingAbility == Intelligence,
          }
        | SpellAccessCastRejected => false
      }),
      assert(not(spellAccessFreeCastActionAvailable(
        featLevelOneIntelligence,
        {
          ...freshResources,
          freeCastExpended: freshResources.freeCastExpended.put(
            featLevelOneIntelligence.identity,
            1
          ),
        }
      ))),
      assert(resolveSpellAccessCast(
        featLevelOneIntelligence,
        {
          ...freshResources,
          freeCastExpended: freshResources.freeCastExpended.put(
            featLevelOneIntelligence.identity,
            1
          ),
        },
        FreeLongRestPayment
      ) == SpellAccessCastRejected),
    }
  }

  run test_feat_level_one_can_use_eligible_ordinary_slot = {
    val result = resolveSpellAccessCast(
      featLevelOneCharisma,
      higherLevelResources,
      OrdinarySlotPayment({ slotLevel: 2 })
    )
    all {
      assert(match result {
        | SpellAccessCastAccepted(data) => all {
            data.state.freeCastExpended == freshResources.freeCastExpended,
            data.state.actionsRemaining == 0,
            data.state.ordinarySlotUsesRemaining.get(2) == 0,
            data.spellcastingAbility == Charisma,
          }
        | SpellAccessCastRejected => false
      }),
      assert(spellAccessFreeCastActionAvailable(
        featLevelOneCharisma,
        freshResources
      )),
    }
  }

  run test_class_access_cannot_use_feat_free_cast_resource = {
    all {
      assert(not(spellAccessFreeCastActionAvailable(
        classLevelOneWisdom,
        freshResources
      ))),
      assert(resolveSpellAccessCast(
        classLevelOneWisdom,
        freshResources,
        FreeLongRestPayment
      ) == SpellAccessCastRejected),
      assert(match resolveSpellAccessCast(
        classLevelOneWisdom,
        freshResources,
        OrdinarySlotPayment({ slotLevel: 1 })
      ) {
        | SpellAccessCastAccepted(data) => all {
            data.state.freeCastExpended == freshResources.freeCastExpended,
            data.state.actionsRemaining == 0,
            data.state.ordinarySlotUsesRemaining.get(1) == 1,
            data.spellcastingAbility == Wisdom,
          }
        | SpellAccessCastRejected => false
      }),
    }
  }

  run test_free_and_slot_transitions_remain_distinct = {
    val freeSpent = spendSpellAccessFreeCast(featLevelOneIntelligence, freshResources)
    val bothSpent = spendSpellAccessFreeCast(featLevelOneCharisma, freeSpent)
    val slotSpent = spendSpellAccessOrdinarySlot(freshResources, 1)
    val restored = restoreSpellAccessFreeCastsAfterLongRest(bothSpent)
    all {
      assert(freeSpent.freeCastExpended.get(featLevelOneIntelligence.identity) == 1),
      assert(freeSpent.freeCastExpended.get(featLevelOneCharisma.identity) == 0),
      assert(freeSpent.ordinarySlotUsesRemaining.get(1) == freshResources.ordinarySlotUsesRemaining.get(1)),
      assert(bothSpent.freeCastExpended.get(featLevelOneIntelligence.identity) == 1),
      assert(bothSpent.freeCastExpended.get(featLevelOneCharisma.identity) == 1),
      assert(slotSpent.freeCastExpended == freshResources.freeCastExpended),
      assert(slotSpent.ordinarySlotUsesRemaining.get(1) == 1),
      assert(restored.freeCastExpended.get(featLevelOneIntelligence.identity) == 0),
      assert(restored.freeCastExpended.get(featLevelOneCharisma.identity) == 0),
      assert(restored.ordinarySlotUsesRemaining.get(1) == freshResources.ordinarySlotUsesRemaining.get(1)),
    }
  }

  run test_cast_requires_and_spends_one_action_atomically = {
    val noActions = { ...freshResources, actionsRemaining: 0 }
    all {
      assert(not(spellAccessPaymentIsAvailable(
        featLevelOneIntelligence,
        noActions,
        FreeLongRestPayment
      ))),
      assert(resolveSpellAccessCast(
        featLevelOneIntelligence,
        noActions,
        FreeLongRestPayment
      ) == SpellAccessCastRejected),
      assert(match resolveSpellAccessCast(
        featLevelOneIntelligence,
        freshResources,
        FreeLongRestPayment
      ) {
        | SpellAccessCastAccepted(data) => all {
            data.state.actionsRemaining == 0,
            data.state.freeCastExpended.get(featLevelOneIntelligence.identity) == 1,
            data.state.ordinarySlotUsesRemaining == freshResources.ordinarySlotUsesRemaining,
          }
        | SpellAccessCastRejected => false
      }),
    }
  }
}
