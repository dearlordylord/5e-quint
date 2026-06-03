// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-self-teleport

module battleRuntimeSelfTeleport {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"

  pure def mistyStepMaxTeleportFeet(): int = 30

  pure def mistyStepDestinationIsLegal(distanceFeet: int, unoccupiedVisibleDestination: bool): bool =
    unoccupiedVisibleDestination and distanceFeet > 0 and distanceFeet <= mistyStepMaxTeleportFeet

  pure def mistyStepTeleportSpendsMovement(): bool = false

  pure def mistyStepTeleportProvokesOpportunityAttacks(): bool = false

  pure def mistyStepTeleportTransportsWornAndCarriedEquipment(): bool = true

  pure def resolveMistyStepSpell(state: BattleState, distanceFeet: int, unoccupiedVisibleDestination: bool): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      mistyStepDestinationIsLegal(distanceFeet, unoccupiedVisibleDestination)
    ) {
      val afterCasterEarlyEnd = battleStateAfterSanctuaryEarlyEndForActor(state, Fighter)
      commitActorSpellSlotUse({ ...afterCasterEarlyEnd, bonusActionAvailable: false }, Fighter)
    } else {
      state
    }
}
