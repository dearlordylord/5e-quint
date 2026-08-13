// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.OBJECT_DAMAGE_TRANSITION

// RAW anchors:
// - Rules Glossary, "Breaking Objects": objects use AC, HP, damage-type
//   immunity, and optional Damage Threshold facts supplied by the table.
// - Rules Glossary, "Damage Threshold": one attack or effect deals no damage
//   below the threshold and its entire damage when the threshold is met.
module objectDamageTransitionCore {
  import spellObjectHitPointDamageCore.* from "./spell-object-hit-point-damage-core"

  type ObjectDamageType = PoisonObjectDamage | PsychicObjectDamage | OtherObjectDamage

  type ObjectDamageComponent = {
    damageType: ObjectDamageType,
    amount: int,
  }

  type ObjectDamageTransitionFacts = {
    firstComponent: ObjectDamageComponent,
    remainingComponents: List[ObjectDamageComponent],
    priorHitPoints: int,
    damageThreshold: ObjectDamageThreshold,
  }

  type ObjectDamageTransitionResult = {
    firstComponent: ObjectDamageComponent,
    remainingComponents: List[ObjectDamageComponent],
    rolledDamage: int,
    damageAfterImmunities: int,
    damageThreshold: ObjectDamageThreshold,
    effectiveDamage: int,
    priorHitPoints: int,
    nextHitPoints: int,
    destroyed: bool,
  }

  pure def objectDamageTypeIsImmune(damageType: ObjectDamageType): bool =
    damageType == PoisonObjectDamage or damageType == PsychicObjectDamage

  pure def objectDamageAfterImmunities(components: List[ObjectDamageComponent]): int =
    components.foldl(0, (total, component) =>
      if (objectDamageTypeIsImmune(component.damageType)) total else total + component.amount
    )

  pure def objectRolledDamage(components: List[ObjectDamageComponent]): int =
    components.foldl(0, (total, component) => total + component.amount)

  pure def objectDamageTransitionResult(damage: ObjectDamageTransitionFacts): ObjectDamageTransitionResult = {
    val components = List(damage.firstComponent).concat(damage.remainingComponents)
    val hitPointResult = objectHitPointDamageResult({
      rolledDamage: objectDamageAfterImmunities(components),
      priorHitPoints: damage.priorHitPoints,
      damageThreshold: damage.damageThreshold,
    })
    {
      firstComponent: damage.firstComponent,
      remainingComponents: damage.remainingComponents,
      rolledDamage: objectRolledDamage(components),
      damageAfterImmunities: objectDamageAfterImmunities(components),
      damageThreshold: damage.damageThreshold,
      effectiveDamage: hitPointResult.effectiveDamage,
      priorHitPoints: hitPointResult.priorHitPoints,
      nextHitPoints: hitPointResult.nextHitPoints,
      destroyed: hitPointResult.destroyed,
    }
  }

}
