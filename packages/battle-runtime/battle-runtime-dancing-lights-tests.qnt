// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-dancing-lights-movable-dim-light

module battleRuntimeDancingLightsTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"
  import battleRuntimeLightSpellLifecycle.* from "./battle-runtime-light-spell-lifecycle"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_dancing_lights_projects_dim_emitters_and_srd_bounds = {
    val cast = resolveDancingLightsSeparateCast(initialState, 3, 60, 20)
    val recast = resolveDancingLightsCombinedCast({ ...cast, actionAvailable: true }, 40)
    val moved = resolveDancingLightsReposition(cast, false, 3, 60, 20, 70)
    val partiallyElapsed = {
      ...cast,
      fighter: {
        ...cast.fighter,
        activeEffects: Set(dancingLightsActiveEffect(false, 3, 1, 2, 3, 4, 37)),
      },
    }
    val movedAfterElapsed = resolveDancingLightsReposition(partiallyElapsed, false, 3, 60, 20, 70)
    val vanished = resolveDancingLightsReposition(cast, false, 3, 60, 20, 121)
    val broken = breakConcentrationSpellEffects(cast, Fighter)
    val nearlyExpired = {
      ...cast,
      fighter: {
        ...cast.fighter,
        activeEffects: Set(dancingLightsActiveEffect(false, 3, 1, 2, 3, 4, 1)),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(dancingLightsDimLightRadiusFeet == 10),
      assert(dancingLightsDurationTicks == 600),
      assert(dancingLightsCastPlacementAllowed(1, 120, 99)),
      assert(dancingLightsCastPlacementAllowed(3, 60, 20)),
      assert(not(dancingLightsCastPlacementAllowed(0, 60, 20))),
      assert(not(dancingLightsCastPlacementAllowed(5, 60, 20))),
      assert(not(dancingLightsCastPlacementAllowed(2, 121, 20))),
      assert(not(dancingLightsCastPlacementAllowed(2, 60, 21))),
      assert(dancingLightsRepositionAllowed(60, 20, 2)),
      assert(not(dancingLightsRepositionAllowed(61, 20, 2))),
      assert(dancingLightSurvivesRange(120)),
      assert(not(dancingLightSurvivesRange(121))),
      assert(dancingLightsEmitters(false, 1).size() == 1),
      assert(dancingLightsEmitters(false, 3).size() == 3),
      assert(dancingLightsEmitters(true, 1) == Set(dancingLightsEmitter(1, 1, true))),
      assert(cast.fighter.activeEffects.contains(dancingLightsActiveEffect(false, 3, 1, 2, 3, 4, dancingLightsDurationTicks))),
      assert(cast.fighter.concentrating),
      assert(not(cast.actionAvailable)),
      assert(battleRuntimeLightEmitters(cast) == dancingLightsEmitters(false, 3)),
      assert(recast.fighter.activeEffects == Set(dancingLightsActiveEffect(true, 1, 1, 0, 0, 0, dancingLightsDurationTicks))),
      assert(battleRuntimeLightEmitters(recast) == dancingLightsEmitters(true, 1)),
      assert(moved.fighter.activeEffects.contains(dancingLightsActiveEffect(false, 3, 11, 12, 13, 14, dancingLightsDurationTicks))),
      assert(movedAfterElapsed.fighter.activeEffects.contains(dancingLightsActiveEffect(false, 3, 11, 12, 13, 14, 37))),
      assert(not(moved.bonusActionAvailable)),
      assert(battleRuntimeLightEmitters(moved).contains(dancingLightsEmitter(1, 11, false))),
      assert(not(activeEffectsContainDancingLights(vanished.fighter.activeEffects))),
      assert(battleRuntimeLightEmitters(vanished) == Set()),
      assert(not(activeEffectsContainDancingLights(broken.fighter.activeEffects))),
      assert(battleRuntimeLightEmitters(broken) == Set()),
      assert(activeEffectsContainDancingLights(stillSameRound.fighter.activeEffects)),
      assert(not(activeEffectsContainDancingLights(nextRound.fighter.activeEffects))),
    }
  }
}
