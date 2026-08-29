// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-antimagic-field-ongoing-spell-suppression spell.invocation-antimagic-field-action-interdiction spell.invocation-antimagic-field-magical-effect-interdiction

module battleRuntimeMagicSuppressionTests {
  import battleRuntimeMagicSuppression.* from "./battle-runtime-magic-suppression"

  run magicSuppressionInterdictsActionsEffectsAndFunctionWithoutPausingDurationTest = {
    val ordinaryEffectInside = {
      insideSuppressionArea: true,
      exemptSource: false,
    }
    val exemptEffectInside = {
      insideSuppressionArea: true,
      exemptSource: true,
    }
    all {
      assert(not(ongoingEffectFunctions(ordinaryEffectInside))),
      assert(ongoingEffectFunctions(exemptEffectInside)),
      assert(not(actionAllowedDuringMagicSuppression({
        actorInsideSuppressionArea: true,
        isSpellCast: true,
        isMagicAction: false,
        createsMagicalEffect: false,
      }))),
      assert(actionAllowedDuringMagicSuppression({
        actorInsideSuppressionArea: false,
        isSpellCast: true,
        isMagicAction: false,
        createsMagicalEffect: false,
      })),
      assert(not(magicalEffectMayTargetOrAffect(true, true))),
      assert(magicalEffectMayTargetOrAffect(false, true)),
      assert(remainingDurationAfterSuppressedTicks(10, 4) == 6),
      assert(remainingDurationAfterSuppressedTicks(10, 10) == 0),
    }
  }
}
