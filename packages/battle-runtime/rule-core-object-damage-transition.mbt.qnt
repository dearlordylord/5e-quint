// -*- mode: Bluespec; -*-

module ruleCoreObjectDamageTransitionMbt {
  import objectDamageTransitionCore.* from "../shared-algebras/proofs/rule-core/object-damage-transition-core"
  import spellObjectHitPointDamageCore.* from "../shared-algebras/proofs/rule-core/spell-object-hit-point-damage-core"

  var qScenario: str
  var qRolledDamage: int
  var qDamageAfterImmunities: int
  var qDamageThreshold: int
  var qImmuneComponentDamage: int
  var qOtherComponentDamage: int
  var qEffectiveDamage: int
  var qNextHitPoints: int
  var qReplayIndex: int

  action record(
    scenario: str,
    result: ObjectDamageTransitionResult,
    replayIndex: int
  ): bool = all {
    qScenario' = scenario,
    qRolledDamage' = result.rolledDamage,
    qDamageAfterImmunities' = result.damageAfterImmunities,
    qDamageThreshold' = match result.damageThreshold {
      | ObjectWithoutDamageThreshold => 0
      | ObjectWithDamageThreshold(data) => data.amount
    },
    qImmuneComponentDamage' = result.firstComponent.amount,
    qOtherComponentDamage' = result.remainingComponents[0].amount,
    qEffectiveDamage' = result.effectiveDamage,
    qNextHitPoints' = result.nextHitPoints,
    qReplayIndex' = replayIndex,
  }

  action init = all {
    qScenario' = "init",
    qRolledDamage' = 0,
    qDamageAfterImmunities' = 0,
    qDamageThreshold' = 0,
    qImmuneComponentDamage' = 0,
    qOtherComponentDamage' = 0,
    qEffectiveDamage' = 0,
    qNextHitPoints' = 30,
    qReplayIndex' = 0,
  }

  action doMixedImmuneThresholdBlocked = all {
    qReplayIndex == 0,
    record("mixed-immune-threshold-blocked", objectDamageTransitionResult({
        firstComponent: { damageType: PoisonObjectDamage, amount: 9 },
        remainingComponents: List(
          { damageType: OtherObjectDamage, amount: 7 }
        ),
        priorHitPoints: 30,
        damageThreshold: ObjectWithDamageThreshold({ amount: 8 }),
      }), 1),
  }

  action doMixedImmuneThresholdPassed = all {
    qReplayIndex == 1,
    record("mixed-immune-threshold-passed", objectDamageTransitionResult({
        firstComponent: { damageType: PsychicObjectDamage, amount: 20 },
        remainingComponents: List(
          { damageType: OtherObjectDamage, amount: 9 }
        ),
        priorHitPoints: 30,
        damageThreshold: ObjectWithDamageThreshold({ amount: 8 }),
      }), 2),
  }

  action step = any {
    doMixedImmuneThresholdBlocked,
    doMixedImmuneThresholdPassed,
  }
}
