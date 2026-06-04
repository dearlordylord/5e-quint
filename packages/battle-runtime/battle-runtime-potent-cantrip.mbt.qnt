// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.potent-cantrip
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.potent-cantrip

module battleRuntimePotentCantripMbt {
  var qTargetHp: int
  var qActionResourcesRemaining: int
  var qTargetActiveEffectCount: int
  var qLightEmitterCount: int
  var qObjectDamageCount: int
  var qLastResult: str

  action recordProjection(
    targetHp: int,
    actionResourcesRemaining: int,
    targetActiveEffectCount: int,
    lightEmitterCount: int,
    objectDamageCount: int,
    lastResult: str,
  ): bool = all {
    qTargetHp' = targetHp,
    qActionResourcesRemaining' = actionResourcesRemaining,
    qTargetActiveEffectCount' = targetActiveEffectCount,
    qLightEmitterCount' = lightEmitterCount,
    qObjectDamageCount' = objectDamageCount,
    qLastResult' = lastResult,
  }

  action init = recordProjection(13, 1, 0, 0, 0, "init")

  action doAttackMissHalfDamage = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "attackMissHalfDamage"),
  }

  action doAttackMissNoAdditionalEffect = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "attackMissNoAdditionalEffect"),
  }

  action doAttackMissNoLightEmitter = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "attackMissNoLightEmitter"),
  }

  action doSaveSuccessHalfDamage = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "saveSuccessHalfDamage"),
  }

  action doSaveSuccessNoAdditionalEffect = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "saveSuccessNoAdditionalEffect"),
  }

  action doRejectObjectMissHalfDamage = all {
    qLastResult == "init",
    recordProjection(13, 0, 0, 0, 0, "rejectObjectMissHalfDamage"),
  }

  action step = any {
    doAttackMissHalfDamage,
    doAttackMissNoAdditionalEffect,
    doAttackMissNoLightEmitter,
    doSaveSuccessHalfDamage,
    doSaveSuccessNoAdditionalEffect,
    doRejectObjectMissHalfDamage,
  }
}
