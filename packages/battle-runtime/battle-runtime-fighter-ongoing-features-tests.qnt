module battleRuntimeFighterOngoingFeaturesTests {
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeCombatantSide.* from "./battle-runtime-combatant-side"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"

  run test_fighter_ongoing_feature_occurrences_have_exact_rage_slot = {
    val rage = ActiveRoundExtendedOngoingFeature({
      expiresAtEndOfFighterTurnRound: 2,
      maxExpiresRound: 101,
    })
    val raging = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeOngoingFeatureOccurrences: {
          ...initialState.fighter.activeOngoingFeatureOccurrences,
          rage: rage,
        },
      },
    }
    all {
      assert(fighterRageOccurrence(raging) == rage),
      assert(fighterRecklessAttackOccurrence(raging) == NoActiveOngoingFeatureOccurrence),
      assert(fighterHasRage(raging)),
    }
  }

  run test_fighter_ongoing_feature_occurrences_have_exact_reckless_attack_slot = {
    val reckless = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeOngoingFeatureOccurrences: {
          ...initialState.fighter.activeOngoingFeatureOccurrences,
          recklessAttack: ActiveStartOfTurnOngoingFeature,
        },
      },
    }
    all {
      assert(fighterRageOccurrence(reckless) == NoActiveOngoingFeatureOccurrence),
      assert(fighterRecklessAttackOccurrence(reckless) == ActiveStartOfTurnOngoingFeature),
      assert(fighterHasRecklessAttack(reckless)),
    }
  }

}
