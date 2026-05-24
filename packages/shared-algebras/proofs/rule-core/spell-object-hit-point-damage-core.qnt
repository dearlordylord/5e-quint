// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellObjectHitPointDamageCore {
  // RAW anchors:
  // - Rules-Glossary.md: Breaking Objects, Damage Threshold, Hit Points, and
  //   Object.
  // - UBIQUITOUS_LANGUAGE.md: Hit Points.

  type ObjectDamageThreshold =
    | ObjectWithoutDamageThreshold
    | ObjectWithDamageThreshold({ amount: int })

  type ObjectHitPointDamageFacts = {
    rolledDamage: int,
    priorHitPoints: int,
    damageThreshold: ObjectDamageThreshold,
  }

  type ObjectHitPointDamageResult = {
    effectiveDamage: int,
    priorHitPoints: int,
    nextHitPoints: int,
    destroyed: bool,
  }

  pure def objectHitPointEffectiveDamage(rolledDamage: int, damageThreshold: ObjectDamageThreshold): int =
    match damageThreshold {
      | ObjectWithoutDamageThreshold => rolledDamage
      | ObjectWithDamageThreshold(data) =>
          if (rolledDamage < data.amount) 0 else rolledDamage
    }

  pure def objectHitPointDamageResult(facts: ObjectHitPointDamageFacts): ObjectHitPointDamageResult = {
    val effectiveDamage = objectHitPointEffectiveDamage(facts.rolledDamage, facts.damageThreshold)
    val nextHitPoints = if (facts.priorHitPoints - effectiveDamage < 0) 0 else facts.priorHitPoints - effectiveDamage
    {
      effectiveDamage: effectiveDamage,
      priorHitPoints: facts.priorHitPoints,
      nextHitPoints: nextHitPoints,
      destroyed: nextHitPoints == 0,
    }
  }
}
