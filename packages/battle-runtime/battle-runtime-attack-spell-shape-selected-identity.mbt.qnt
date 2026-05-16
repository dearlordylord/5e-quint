// -*- mode: Bluespec; -*-

module battleRuntimeAttackSpellShapeSelectedIdentityMbt {
  var qTargetHp: int
  var qSpellSlotSpentThisTurn: bool
  var qLevel1SlotsRemaining: int
  var qActiveEffectKind: str
  var qActiveEffectCount: int
  var qLastResult: str

  action recordProjection(
    targetHp: int,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    activeEffectKind: str,
    activeEffectCount: int,
    lastResult: str,
  ): bool = all {
    qTargetHp' = targetHp,
    qSpellSlotSpentThisTurn' = spellSlotSpentThisTurn,
    qLevel1SlotsRemaining' = level1SlotsRemaining,
    qActiveEffectKind' = activeEffectKind,
    qActiveEffectCount' = activeEffectCount,
    qLastResult' = lastResult,
  }

  action init = recordProjection(12, false, 2, "none", 0, "init")

  action doFireBoltHit = all {
    qLastResult == "init",
    recordProjection(8, false, 2, "none", 0, "fireBolt"),
  }

  action doChillTouchHitPointRegainPrevention = all {
    qLastResult == "init",
    recordProjection(8, false, 2, "hitPointRegainPrevented", 1, "chillTouch"),
  }

  action doGuidingBoltNextAttackAdvantage = all {
    qLastResult == "init",
    recordProjection(8, true, 1, "nextAttackRollAgainstSelf", 1, "guidingBolt"),
  }

  action doInflictWoundsFailedSave = all {
    qLastResult == "init",
    recordProjection(6, true, 1, "none", 0, "inflictWoundsFailure"),
  }

  action doInflictWoundsSuccessfulSave = all {
    qLastResult == "init",
    recordProjection(9, true, 1, "none", 0, "inflictWoundsSuccess"),
  }

  action doShockingGraspOpportunityAttackDenied = all {
    qLastResult == "init",
    recordProjection(8, false, 2, "opportunityAttackDenied", 1, "shockingGrasp"),
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
