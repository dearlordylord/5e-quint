// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.spell-slot-healing-modifier

module unitFeatureDiscipleOfLifeCoreExamples {
  import unitFeatureDiscipleOfLifeCore.* from "./unit-feature-disciple-of-life-core"

  run test_disciple_of_life_adds_two_plus_slot_level_only_for_slot_spell_healing = {
    all {
      assert(discipleOfLifeAdditionalHitPoints({
        spellCastWithSpellSlot: true,
        spellRestoresHitPoints: true,
        healedOnCastTurn: true,
        spellSlotLevel: 3,
      }) == 5),
      assert(discipleOfLifeAdditionalHitPoints({
        spellCastWithSpellSlot: false,
        spellRestoresHitPoints: true,
        healedOnCastTurn: true,
        spellSlotLevel: 3,
      }) == 0),
    }
  }
}
