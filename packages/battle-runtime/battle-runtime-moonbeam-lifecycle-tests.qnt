// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-moonbeam-movable-zone

module battleRuntimeMoonbeamLifecycleTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"
  import battleRuntimeMoonbeamCast.* from "./battle-runtime-moonbeam-cast"
  import battleRuntimeMoonbeamReposition.* from "./battle-runtime-moonbeam-reposition"

  run test_moonbeam_records_movable_zone_and_concentration = {
    val resolved = resolveMoonbeam(initialState, moonbeamAreaId, 2)
    all {
      assert(resolved.fighter.activeEffects.contains(MoonbeamMovableZone({
        areaId: moonbeamAreaId,
        damageDice: 2,
        durationTicks: moonbeamDurationTicks,
        repositionMaxMoveFeet: moonbeamRepositionMaxMoveFeet,
        savedThisTurn: Set(),
        shapeShiftSuppressed: Set(),
      }))),
      assert(moonbeamRadiusFeet == 5),
      assert(moonbeamHeightFeet == 40),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }
  run test_moonbeam_reposition_spends_magic_action_without_damage = {
    val resolved = resolveMoonbeam(initialState, moonbeamAreaId, 2)
    val casterLaterTurn = endTurn(endTurn(resolved))
    val moved = resolveMoonbeamReposition(casterLaterTurn, moonbeamAreaId, 60)
    val tooFar = resolveMoonbeamReposition(casterLaterTurn, moonbeamAreaId, 61)
    all {
      assert(moved.goblin.hp == initialState.goblin.hp),
      assert(not(moved.actionAvailable)),
      assert(tooFar.goblin.hp == initialState.goblin.hp),
      assert(tooFar.actionAvailable),
    }
  }
  run test_moonbeam_concentration_break_removes_zone = {
    val resolved = resolveMoonbeam(initialState, moonbeamAreaId, 2)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(moonbeamActive(broken, moonbeamAreaId))),
      assert(not(broken.fighter.concentrating)),
    }
  }
}
