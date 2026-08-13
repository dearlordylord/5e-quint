// -*- mode: Bluespec; -*-

module objectDamageTransitionExamples {
  import objectDamageTransitionCore.* from "./object-damage-transition-core"
  import spellObjectHitPointDamageCore.* from "./spell-object-hit-point-damage-core"

  run object_attack_damage_examples = all {
    assert(objectDamageTransitionResult({
      firstComponent: { damageType: OtherObjectDamage, amount: 7 },
      remainingComponents: List(),
      priorHitPoints: 30,
      damageThreshold: ObjectWithoutDamageThreshold,
    }) == {
      firstComponent: { damageType: OtherObjectDamage, amount: 7 },
      remainingComponents: List(),
      rolledDamage: 7,
      damageAfterImmunities: 7,
      damageThreshold: ObjectWithoutDamageThreshold,
      effectiveDamage: 7,
      priorHitPoints: 30,
      nextHitPoints: 23,
      destroyed: false,
    }),
    assert(objectDamageTransitionResult({
      firstComponent: { damageType: PoisonObjectDamage, amount: 9 },
      remainingComponents: List(
        { damageType: OtherObjectDamage, amount: 7 }
      ),
      priorHitPoints: 30,
      damageThreshold: ObjectWithDamageThreshold({ amount: 8 }),
    }) == {
      firstComponent: { damageType: PoisonObjectDamage, amount: 9 },
      remainingComponents: List(
        { damageType: OtherObjectDamage, amount: 7 }
      ),
      rolledDamage: 16,
      damageAfterImmunities: 7,
      damageThreshold: ObjectWithDamageThreshold({ amount: 8 }),
      effectiveDamage: 0,
      priorHitPoints: 30,
      nextHitPoints: 30,
      destroyed: false,
    }),
  }
}
