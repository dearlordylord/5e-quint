// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-mist-cloud-form
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MIST_CLOUD_FORM_STATE
// RAW-COVERAGE: qnt-proof RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001

module spellMistCloudFormStateCoreExamples {
  import spellMistCloudFormStateCore.* from "./spell-mist-cloud-form-state-core"

  pure def completeMistCloudFacts: MistCloudFormAdmissionFacts = {
    actionCastingTime: true,
    touchRange: true,
    concentrationUpToHour: true,
    targetIsWillingCreature: true,
    transformedObjects: WornAndCarriedObjects,
    movementReplacement: mistCloudFormMovementReplacement,
    passiveProjection: mistCloudFormPassiveProjection,
    activityRestrictions: mistCloudFormActivityRestrictions,
    tableSpatialWitnesses: mistCloudFormTableSpatialWitnesses,
    hasZeroHitPointEnd: true,
    hasTargetMagicActionEnd: true,
    hasSpellEndCleanup: true,
  }

  run test_mist_cloud_form_admits_complete_state = {
    val admission = admitMistCloudFormEffect(10, 20, 30, completeMistCloudFacts)
    match admission {
      | MistCloudFormAccepted(effect) => all {
          assert(effect.sourceSpellKey == 10),
          assert(effect.sourceCombatantKey == 20),
          assert(effect.targetCombatantKey == 30),
          assert(effect.transformedObjects == WornAndCarriedObjects),
          assert(effect.movementReplacement.onlyMovementSpeedKind == MistCloudFlySpeed),
          assert(effect.movementReplacement.feet == 10),
          assert(effect.movementReplacement.hover),
          assert(effect.passiveProjection.damageResistances == Set(
            MistCloudBludgeoningResistance,
            MistCloudPiercingResistance,
            MistCloudSlashingResistance
          )),
          assert(effect.passiveProjection.conditionImmunities == Set(MistCloudProneImmunity)),
          assert(effect.passiveProjection.savingThrowAdvantages == Set(
            MistCloudStrengthSavingThrowAdvantage,
            MistCloudDexteritySavingThrowAdvantage,
            MistCloudConstitutionSavingThrowAdvantage
          )),
          assert(effect.activityRestrictions == mistCloudFormActivityRestrictions),
          assert(effect.tableSpatialWitnesses == mistCloudFormTableSpatialWitnesses),
          assert(effect.endCauses == mistCloudFormEndCauses),
          assert(effect.concentrationOwnerKey == 20),
          assert(effect.durationTicks == mistCloudFormDurationTicks),
        }
      | MistCloudFormRejected => assert(false)
    }
  }

  run test_mist_cloud_form_rejects_missing_magic_action_self_end = {
    val incompleteFacts = completeMistCloudFacts.with(
      "hasTargetMagicActionEnd",
      false
    )
    assert(admitMistCloudFormEffect(10, 20, 30, incompleteFacts) == MistCloudFormRejected)
  }

  run test_mist_cloud_form_rejects_wrong_movement_replacement = {
    val incompleteFacts = completeMistCloudFacts.with(
      "movementReplacement",
      mistCloudFormMovementReplacement.with("feet", 30)
    )
    assert(admitMistCloudFormEffect(10, 20, 30, incompleteFacts) == MistCloudFormRejected)
  }

  run test_mist_cloud_form_rejects_missing_passive_projection = {
    val incompleteFacts = completeMistCloudFacts.with(
      "passiveProjection",
      mistCloudFormPassiveProjection.with("conditionImmunities", Set())
    )
    assert(admitMistCloudFormEffect(10, 20, 30, incompleteFacts) == MistCloudFormRejected)
  }

  run test_mist_cloud_form_rejects_missing_activity_restrictions = {
    val incompleteFacts = completeMistCloudFacts.with(
      "activityRestrictions",
      mistCloudFormActivityRestrictions.exclude(Set(MistCloudCannotCastSpells))
    )
    assert(admitMistCloudFormEffect(10, 20, 30, incompleteFacts) == MistCloudFormRejected)
  }

  run test_mist_cloud_form_rejects_missing_table_spatial_witnesses = {
    val incompleteFacts = completeMistCloudFacts.with(
      "tableSpatialWitnesses",
      mistCloudFormTableSpatialWitnesses.exclude(Set(MistCloudTreatsLiquidsAsSolidSurfaces))
    )
    assert(admitMistCloudFormEffect(10, 20, 30, incompleteFacts) == MistCloudFormRejected)
  }
}
