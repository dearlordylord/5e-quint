// -*- mode: Bluespec; -*-

module battleRuntimeCunningStrikeSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type CunningStrikeSelectedIdentityScenarioOutcome =
    | Init
    | TripFailedSave
    | PoisonFailedSave
    | WithdrawMoved

  type CunningStrikeSelectedIdentityWitnessState = {
    qTargetTempHp: int,
    qTargetProne: bool,
    qTargetPoisoned: bool,
    qActorMovementSpentFeet: int,
    qSneakAttackDiceRolled: int,
    qCunningStrikeUnitBound: bool,
    qSourceDamageRiderUnitBound: bool,
    qScenarioOutcome: CunningStrikeSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: CunningStrikeSelectedIdentityWitnessState

  pure def qTargetTempHp: int = qState.qTargetTempHp
  pure def qTargetProne: bool = qState.qTargetProne
  pure def qTargetPoisoned: bool = qState.qTargetPoisoned
  pure def qActorMovementSpentFeet: int = qState.qActorMovementSpentFeet
  pure def qSneakAttackDiceRolled: int = qState.qSneakAttackDiceRolled
  pure def qCunningStrikeUnitBound: bool = qState.qCunningStrikeUnitBound
  pure def qSourceDamageRiderUnitBound: bool = qState.qSourceDamageRiderUnitBound
  pure def scenarioOutcome: CunningStrikeSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: CunningStrikeSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    targetTempHp: int,
    targetProne: bool,
    targetPoisoned: bool,
    actorMovementSpentFeet: int,
    sneakAttackDiceRolled: int,
    cunningStrikeUnitBound: bool,
    sourceDamageRiderUnitBound: bool,
    lastResult: CunningStrikeSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qTargetTempHp: targetTempHp,
      qTargetProne: targetProne,
      qTargetPoisoned: targetPoisoned,
      qActorMovementSpentFeet: actorMovementSpentFeet,
      qSneakAttackDiceRolled: sneakAttackDiceRolled,
      qCunningStrikeUnitBound: cunningStrikeUnitBound,
      qSourceDamageRiderUnitBound: sourceDamageRiderUnitBound,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(
    40,
    false,
    false,
    0,
    0,
    false,
    false,
    Init,
  )

  action doResolveCunningStrikeTripFailedSave = all {
    scenarioOutcome == Init,
    recordProjection(
      22,
      true,
      false,
      0,
      2,
      true,
      true,
      TripFailedSave,
    ),
  }

  action doResolveCunningStrikePoisonFailedSave = all {
    scenarioOutcome == Init,
    recordProjection(
      22,
      false,
      true,
      0,
      2,
      true,
      true,
      PoisonFailedSave,
    ),
  }

  action doResolveCunningStrikeWithdrawMove = all {
    scenarioOutcome == Init,
    recordProjection(
      22,
      false,
      false,
      0,
      2,
      true,
      true,
      WithdrawMoved,
    ),
  }

  action step = any {
    doResolveCunningStrikeTripFailedSave,
    doResolveCunningStrikePoisonFailedSave,
    doResolveCunningStrikeWithdrawMove,
  }
}
