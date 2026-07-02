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
}
