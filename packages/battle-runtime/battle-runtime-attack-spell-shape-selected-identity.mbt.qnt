// -*- mode: Bluespec; -*-

module battleRuntimeAttackSpellShapeSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | AttackSpellShape

  type WitnessState = {
    qTargetHp: int,
    qSpellSlotSpentThisTurn: bool,
    qLevel1SlotsRemaining: int,
    qActiveEffectKind: str,
    qActiveEffectCount: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qSpellSlotSpentThisTurn: bool = qState.qSpellSlotSpentThisTurn
  pure def qLevel1SlotsRemaining: int = qState.qLevel1SlotsRemaining
  pure def qActiveEffectKind: str = qState.qActiveEffectKind
  pure def qActiveEffectCount: int = qState.qActiveEffectCount
  pure def qScenarioResult: str = qState.qScenarioResult


  action recordProjection(
    targetHp: int,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    activeEffectKind: str,
    activeEffectCount: int,
    scenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qSpellSlotSpentThisTurn: spellSlotSpentThisTurn,
      qLevel1SlotsRemaining: level1SlotsRemaining,
      qActiveEffectKind: activeEffectKind,
      qActiveEffectCount: activeEffectCount,
      qScenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection(12, false, 2, "none", 0, "init",
    witnessInit(AttackSpellShape),
  )

  action doFireBoltHit = all {
    qScenarioResult == "init",
    recordProjection(8, false, 2, "none", 0, "fireBolt",
    witnessResolved(AttackSpellShape),
  ),
  }

  action doChillTouchHitPointRegainPrevention = all {
    qScenarioResult == "init",
    recordProjection(8, false, 2, "hitPointRegainPrevented", 1, "chillTouch",
    witnessResolved(AttackSpellShape),
  ),
  }

  action doGuidingBoltNextAttackAdvantage = all {
    qScenarioResult == "init",
    recordProjection(8, true, 1, "nextAttackRollAgainstSelf", 1, "guidingBolt",
    witnessResolved(AttackSpellShape),
  ),
  }

  action doInflictWoundsFailedSave = all {
    qScenarioResult == "init",
    recordProjection(6, true, 1, "none", 0, "inflictWoundsFailure",
    witnessResolved(AttackSpellShape),
  ),
  }

  action doInflictWoundsSuccessfulSave = all {
    qScenarioResult == "init",
    recordProjection(9, true, 1, "none", 0, "inflictWoundsSuccess",
    witnessResolved(AttackSpellShape),
  ),
  }

  action doShockingGraspOpportunityAttackDenied = all {
    qScenarioResult == "init",
    recordProjection(8, false, 2, "opportunityAttackDenied", 1, "shockingGrasp",
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
