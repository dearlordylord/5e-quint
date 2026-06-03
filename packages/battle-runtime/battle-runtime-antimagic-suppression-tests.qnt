// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-antimagic-field-ongoing-spell-suppression

module battleRuntimeAntimagicSuppressionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAntimagicSuppression.* from "./battle-runtime-antimagic-suppression"

  run test_antimagic_field_suppression_tracks_ongoing_spell_refs = {
    val suppressed = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(AntimagicFieldOngoingSpellSuppression({
          areaId: 1,
          radiusFeet: 10,
          suppressedOngoingSpellEffects: Set(OngoingSpellActiveEffectRef({
            activeEffectKind: OngoingSpellSpiritualWeaponEffect,
            effectId: 2,
          })),
          durationTicks: 10,
        })),
      },
    }
    all {
      assert(antimagicSuppressesOngoingSpellActiveEffect(suppressed, OngoingSpellSpiritualWeaponEffect, 2)),
      assert(not(antimagicSuppressesOngoingSpellActiveEffect(suppressed, OngoingSpellSpiritualWeaponEffect, 3))),
    }
  }
}
