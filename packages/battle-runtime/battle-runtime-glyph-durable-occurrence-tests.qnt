module battleRuntimeGlyphDurableOccurrenceTests {
  import battleRuntimeGlyphDurableOccurrence.* from "./battle-runtime-glyph-durable-occurrence"

  run test_completed_inscription_creates_active_glyph_occurrence = {
    val occurrence = completedGlyphOccurrence(1, 3, "thunder", 200, 100)
    all {
      assert(completedGlyphInscriptionAccepted(3, "thunder")),
      assert(occurrence.active),
      assert(occurrence.effectId == 1),
      assert(occurrence.sourceSpellLevel == 3),
      assert(glyphOccurrenceHasExplosiveRuneRelease(occurrence, "thunder")),
      assert(not(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(occurrence.coveredAreaId == 200),
      assert(occurrence.castLocationId == 100),
      assert(occurrence.movementInvalidationMoreThanFeet == 10),
    }
  }

  run test_completed_inscription_stores_prepared_spell_without_immediate_effect = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
        200,
        100,
      )
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        5,
        5,
        "area",
        "none",
        false,
        glyphStoredSpellSaveGatedDamageProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "hostileTrap",
        "none",
        false,
        glyphStoredSpellGreaseGroundHazardProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        3,
        "area",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "harmfulObject",
        "none",
        true,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
      )),
      assert(occurrence.active),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      )),
      assert(not(glyphOccurrenceHasExplosiveRuneRelease(occurrence, "thunder"))),
      assert(occurrence.coveredAreaId == 200),
      assert(occurrence.castLocationId == 100),
    }
  }

  run test_completed_inscription_rejects_below_minimum_spell_level = {
    all {
      assert(not(completedGlyphInscriptionAccepted(2, "thunder"))),
      assert(completedGlyphInscriptionAccepted(3, "thunder")),
      assert(completedGlyphInscriptionAccepted(4, "thunder")),
      assert(not(completedGlyphInscriptionAccepted(3, "force"))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        2,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        4,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "selfOnly",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "now",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        false,
        "unknownProcedure",
      ))),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
      )),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellSaveGatedConditionProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "area",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "harmfulObject",
        "none",
        false,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        false,
        glyphStoredSpellMoonbeamProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        3,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        3,
        "area",
        "none",
        false,
        glyphStoredSpellHypnoticPatternProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellScalarBuffProcedure,
      ))),
    }
  }

  run test_stored_concentration_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(ended.active)),
    }
  }

  run test_stored_concentration_save_gated_damage_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedDamageProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val areaWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedDamageProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, areaWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_single_creature_active_effect_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val areaWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
      )),
      assert(glyphStoredSpellScalarBuffProcedure.in(glyphStoredSpellSingleCreatureActiveEffectProcedures)),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, areaWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_self_transformation_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSelfTransformationModeProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val areaWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSelfTransformationModeProcedure,
      )),
      assert(glyphStoredSpellSelfTransformationModeProcedure.in(glyphStoredSpellSelfTransformationProcedures)),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSelfTransformationModeProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, areaWitness))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellSelfTransformationModeProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellSelfTransformationModeProcedure,
      ))),
      assert(not(ended.active)),
    }
  }

  run test_stored_area_ongoing_concentration_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val wrongAreaCenterWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 11,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
      )),
      assert(glyphStoredSpellMoonbeamProcedure.in(glyphStoredSpellAreaOngoingProcedures)),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongAreaCenterWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_area_control_concentration_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        3,
        "area",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val wrongAreaCenterWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 11,
    })
    val wrongSingleCreatureWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        3,
        "area",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
      )),
      assert(glyphStoredSpellHypnoticPatternProcedure.in(glyphStoredSpellAreaControlProcedures)),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        3,
        "area",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongAreaCenterWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongSingleCreatureWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_harmful_object_release_requires_close_force_witness_and_fixed_target = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "harmfulObject",
        "none",
        true,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
        200,
        100,
      )
    val placement = {
      subject: "harmful_objects",
      positionId: 300,
      placement: "as_close_as_possible_to_triggering_creature",
      attackTargetId: 10,
      targetReachPositionId: 300,
      forceReachFeet: glyphStoredSpellSpiritualWeaponForceReachFeet,
    }
    val acceptedWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
      hostilePlacement: placement,
    })
    val ordinarySingleCreatureWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val wrongTargetWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 11,
      hostilePlacement: placement,
    })
    val wrongPlacementTargetWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
      hostilePlacement: { ...placement, attackTargetId: 11 },
    })
    val wrongPlacementSubjectWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
      hostilePlacement: { ...placement, subject: "traps" },
    })
    val wrongReachPositionWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
      hostilePlacement: { ...placement, targetReachPositionId: 301 },
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "harmfulObject",
        "none",
        true,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, ordinarySingleCreatureWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongTargetWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongPlacementTargetWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongPlacementSubjectWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongReachPositionWitness))),
      assert(not(ended.active)),
    }
  }

  run test_trigger_occurrence_does_not_end_glyph_without_release = {
    val occurrence = completedGlyphOccurrence(1, 3, "thunder", 200, 100)
    val spellGlyph =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
        200,
        100,
      )
    val ended = glyphAfterTriggerOccurrence(occurrence, 1)
    val spellGlyphEnded = glyphAfterTriggerOccurrence(spellGlyph, 1)
    val unrelated = glyphAfterTriggerOccurrence(occurrence, 2)
    all {
      assert(ended.active),
      assert(spellGlyphEnded.active),
      assert(unrelated.active),
    }
  }

  run test_movement_invalidation_requires_matching_cast_location_and_more_than_ten_feet = {
    val occurrence = completedGlyphOccurrence(1, 3, "thunder", 200, 100)
    val exactThreshold = glyphAfterMovementInvalidation(occurrence, 1, 100, 10)
    val wrongCastLocation = glyphAfterMovementInvalidation(occurrence, 1, 200, 11)
    val movedBeyondThreshold = glyphAfterMovementInvalidation(occurrence, 1, 100, 11)
    all {
      assert(exactThreshold.active),
      assert(wrongCastLocation.active),
      assert(not(movedBeyondThreshold.active)),
    }
  }

  run test_explosive_rune_release_requires_matching_area_witness_and_stored_release = {
    val occurrence = completedGlyphOccurrence(1, 5, "thunder", 200, 100)
    val acceptedWitness = {
      triggerOccurrence: { effectId: 1 },
      coveredAreaId: 200,
      affectedTargetCount: 2,
      savingThrowAbility: "dex",
      savingThrowDcSource: "casterSpellSaveDc",
      savingThrowOutcomeCount: 2,
    }
    val wrongAreaWitness = { ...acceptedWitness, coveredAreaId: 201 }
    val wrongSaveAbilityWitness = { ...acceptedWitness, savingThrowAbility: "con" }
    val wrongSaveDcWitness = { ...acceptedWitness, savingThrowDcSource: "fixed" }
    val wrongSaveCountWitness = { ...acceptedWitness, savingThrowOutcomeCount: 1 }
    val wrongReleaseBranchOccurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        5,
        3,
        "area",
        "none",
        false,
        glyphStoredSpellSaveGatedDamageProcedure,
        200,
        100,
      )
    val wrongDamageTypeOccurrence = completedGlyphOccurrence(1, 5, "force", 200, 100)
    all {
      assert(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongAreaWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongSaveAbilityWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongSaveDcWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongSaveCountWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(wrongReleaseBranchOccurrence, acceptedWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(wrongDamageTypeOccurrence, acceptedWitness))),
    }
  }

  run test_explosive_rune_release_scales_damage_and_halves_successful_saves = {
    val occurrence = completedGlyphOccurrence(1, 5, "thunder", 200, 100)
    all {
      assert(glyphExplosiveRuneDamageDice(3) == 5),
      assert(glyphExplosiveRuneDamageDice(5) == 7),
      assert(glyphExplosiveRuneRadiusFeet == 20),
      assert(glyphExplosiveRuneDamageDieSize == 8),
      assert(glyphExplosiveRuneDamageDice(occurrence.sourceSpellLevel) == 7),
      assert(glyphExplosiveRuneDamageOnSave(27, false) == 27),
      assert(glyphExplosiveRuneDamageOnSave(27, true) == 13),
    }
  }

  run test_explosive_rune_release_ends_matching_glyph_after_release = {
    val occurrence = completedGlyphOccurrence(1, 3, "fire", 200, 100)
    val releaseWitness = {
      triggerOccurrence: { effectId: 1 },
      coveredAreaId: 200,
      affectedTargetCount: 1,
      savingThrowAbility: "dex",
      savingThrowDcSource: "casterSpellSaveDc",
      savingThrowOutcomeCount: 1,
    }
    val ended = glyphAfterExplosiveRuneRelease(occurrence, releaseWitness)
    val unrelated = glyphAfterExplosiveRuneRelease(
      occurrence,
      { ...releaseWitness, triggerOccurrence: { effectId: 2 } },
    )
    all {
      assert(not(ended.active)),
      assert(unrelated.active),
    }
  }

  run test_stored_spell_release_targets_triggering_creature_and_ends_glyph = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val wrongTargetWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 11,
    })
    val wrongShapeWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongTargetWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongShapeWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_spell_area_release_centers_on_triggering_creature = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        3,
        "area",
        "none",
        false,
        glyphStoredSpellSaveGatedDamageProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val wrongAreaCenterWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 11,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongAreaCenterWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_hostile_trap_release_requires_close_placement_witness = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        1,
        "hostileTrap",
        "none",
        false,
        glyphStoredSpellGreaseGroundHazardProcedure,
        200,
        100,
      )
    val placement = {
      subject: "traps",
      areaId: 300,
      placement: "as_close_as_possible_to_triggering_creature",
      attackTargetId: 10,
    }
    val acceptedWitness = StoredHostileTrapReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
      hostilePlacement: placement,
    })
    val ordinaryAreaWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val wrongPlacementTargetWitness = StoredHostileTrapReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
      hostilePlacement: { ...placement, attackTargetId: 11 },
    })
    val wrongPlacementSubjectWitness = StoredHostileTrapReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
      hostilePlacement: { ...placement, subject: "harmful_objects" },
    })
    val wrongAreaCenterWitness = StoredHostileTrapReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 11,
      hostilePlacement: placement,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, ordinaryAreaWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongPlacementTargetWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongPlacementSubjectWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongAreaCenterWitness))),
      assert(not(ended.active)),
    }
  }

}
