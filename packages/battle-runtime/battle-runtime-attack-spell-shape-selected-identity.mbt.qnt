// -*- mode: Bluespec; -*-

module battleRuntimeAttackSpellShapeSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | AttackSpellShape

  type AttackSpellShapeSelectedIdentityScenarioOutcome = | Init | FireBolt | ChillTouch | GuidingBolt | InflictWoundsFailure | InflictWoundsSuccess | ShockingGrasp


  type WitnessState = {
    qTargetHp: int,
    qSpellSlotSpentThisTurn: bool,
    qLevel1SlotsRemaining: int,
    qActiveEffectKind: str,
    qActiveEffectCount: int,
    qScenarioOutcome: AttackSpellShapeSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qSpellSlotSpentThisTurn: bool = qState.qSpellSlotSpentThisTurn
  pure def qLevel1SlotsRemaining: int = qState.qLevel1SlotsRemaining
  pure def qActiveEffectKind: str = qState.qActiveEffectKind
  pure def qActiveEffectCount: int = qState.qActiveEffectCount
  pure def qScenarioOutcome: AttackSpellShapeSelectedIdentityScenarioOutcome = qState.qScenarioOutcome


  action recordProjection(
    targetHp: int,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    activeEffectKind: str,
    activeEffectCount: int,
    scenarioOutcome: AttackSpellShapeSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qSpellSlotSpentThisTurn: spellSlotSpentThisTurn,
      qLevel1SlotsRemaining: level1SlotsRemaining,
      qActiveEffectKind: activeEffectKind,
      qActiveEffectCount: activeEffectCount,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(12, false, 2, "none", 0, Init,
    witnessInit(AttackSpellShape),
  )

  action doFireBoltHit = all {
    qScenarioOutcome == Init,
    recordProjection(8, false, 2, "none", 0, FireBolt,
    witnessResolved(AttackSpellShape),
  ),
  }

  action doChillTouchHitPointRegainPrevention = all {
    qScenarioOutcome == Init,
    recordProjection(8, false, 2, "hitPointRegainPrevented", 1, ChillTouch,
    witnessResolved(AttackSpellShape),
  ),
  }

  action doGuidingBoltNextAttackAdvantage = all {
    qScenarioOutcome == Init,
    recordProjection(8, true, 1, "nextAttackRollAgainstSelf", 1, GuidingBolt,
    witnessResolved(AttackSpellShape),
  ),
  }

  action doInflictWoundsFailedSave = all {
    qScenarioOutcome == Init,
    recordProjection(6, true, 1, "none", 0, InflictWoundsFailure,
    witnessResolved(AttackSpellShape),
  ),
  }

  action doInflictWoundsSuccessfulSave = all {
    qScenarioOutcome == Init,
    recordProjection(9, true, 1, "none", 0, InflictWoundsSuccess,
    witnessResolved(AttackSpellShape),
  ),
  }

  action doShockingGraspOpportunityAttackDenied = all {
    qScenarioOutcome == Init,
    recordProjection(8, false, 2, "opportunityAttackDenied", 1, ShockingGrasp,
    witnessResolved(AttackSpellShape),
  ),
  }

  action step = any {
    doFireBoltHit,
    doChillTouchHitPointRegainPrevention,
    doGuidingBoltNextAttackAdvantage,
    doInflictWoundsFailedSave,
    doInflictWoundsSuccessfulSave,
    doShockingGraspOpportunityAttackDenied,
  }
}
