// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-action-attack-count-scaling

module battleRuntimeFeatureTurnEndEffects {
  import unitFeatureActionCountCore.* from "../shared-algebras/proofs/rule-core/unit-feature-action-count-core"

  // RAW trace:
  // - Classes/Fighter.md Level 5: Extra Attack lets a Fighter attack twice
  //   instead of once when taking the Attack action on their turn.
  // - Rules-Glossary.md "Moving between Attacks" says movement may be
  //   interleaved between attacks granted by a feature such as Extra Attack.
  // The runtime-owned turn-end fact here is only cleanup of an unspent
  // Attack-action slot when the turn ends; route geometry remains table-owned.

  pure def battleRuntimeAttackCountState(
    actionAvailable: bool,
    extraAttackSlotsRemaining: int
  ): AttackActionAttackCountState = {
    actionAvailable: actionAvailable,
    extraAttackSlotOpen: extraAttackSlotsRemaining > 0,
    attacksResolved: 0,
    movementSegmentsTaken: 0,
    turnEnded: false,
  }

  pure def battleRuntimeExtraAttackSlotsAfterEndTurn(
    extraAttackSlotsRemaining: int
  ): int = {
    val ended = endTurnDuringAttackActionAttackCount(battleRuntimeAttackCountState(false, extraAttackSlotsRemaining))
    if (ended.extraAttackSlotOpen) 1 else 0
  }
}
