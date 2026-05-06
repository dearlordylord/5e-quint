// -*- mode: Bluespec; -*-

module hitPointDamageInductive {
  import hitPointDamage.* from "./hit-point-damage"

  var qKind: CreatureKind
  var qHitPoints: int
  var qHitPointMaximum: int
  var qTemporaryHitPoints: int
  var qDead: bool
  var qUnconscious: bool
  var qLastDamageToHitPoints: int
  var qLastRemainingDamageAtZero: int

  pure def qVitals: CreatureVitals = {
    kind: qKind,
    hitPoints: qHitPoints,
    hitPointMaximum: qHitPointMaximum,
    temporaryHitPoints: qTemporaryHitPoints,
    dead: qDead,
    unconscious: qUnconscious,
  }

  action init = all {
    qKind' = PlayerCharacter,
    qHitPoints' = 6,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qLastDamageToHitPoints' = 0,
    qLastRemainingDamageAtZero' = 0,
  }

  action recordDamageResult(result: DamageResult): bool = all {
    qKind' = result.vitals.kind,
    qHitPoints' = result.vitals.hitPoints,
    qHitPointMaximum' = result.vitals.hitPointMaximum,
    qTemporaryHitPoints' = result.vitals.temporaryHitPoints,
    qDead' = result.vitals.dead,
    qUnconscious' = result.vitals.unconscious,
    qLastDamageToHitPoints' = result.damageToHitPoints,
    qLastRemainingDamageAtZero' = result.remainingDamageAtZero,
  }

  action doApplyResolvedDamage = {
    nondet amount = 0.to(18).oneOf()
    all {
      canApplyResolvedDamageToPositiveHitPoints(qVitals),
      recordDamageResult(applyResolvedDamageToPositiveHitPoints(qVitals, amount)),
    }
  }

  action doResetPlayerCharacterWithTemporaryHitPoints = all {
    qKind' = PlayerCharacter,
    qHitPoints' = 8,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 4,
    qDead' = false,
    qUnconscious' = false,
    qLastDamageToHitPoints' = 0,
    qLastRemainingDamageAtZero' = 0,
  }

  action doResetPlayerCharacterNearZero = all {
    qKind' = PlayerCharacter,
    qHitPoints' = 4,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qLastDamageToHitPoints' = 0,
    qLastRemainingDamageAtZero' = 0,
  }

  action doResetMonsterNearZero = all {
    qKind' = MonsterCreature,
    qHitPoints' = 4,
    qHitPointMaximum' = 8,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qLastDamageToHitPoints' = 0,
    qLastRemainingDamageAtZero' = 0,
  }

  // Branch budget: 19 damage amounts + 3 reset actions = 22 transition choices.
  action step = any {
    doApplyResolvedDamage,
    doResetPlayerCharacterWithTemporaryHitPoints,
    doResetPlayerCharacterNearZero,
    doResetMonsterNearZero,
  }

  val invariant = all {
    qKind.in(Set(PlayerCharacter, MonsterCreature)),
    qHitPointMaximum.in(Set(8, 12)),
    qHitPoints.in(0.to(12)),
    qTemporaryHitPoints.in(0.to(4)),
    qDead.in(Set(true, false)),
    qUnconscious.in(Set(true, false)),
    qLastDamageToHitPoints.in(0.to(18)),
    qLastRemainingDamageAtZero.in(0.to(18)),
    legalVitals(qVitals),
    qLastDamageToHitPoints >= 0,
    qLastRemainingDamageAtZero >= 0,
    qLastRemainingDamageAtZero <= qLastDamageToHitPoints,
    qDead implies qHitPoints == 0,
    (qKind == MonsterCreature and qHitPoints == 0) implies qDead,
    (qKind == PlayerCharacter and qHitPoints == 0 and not(qDead)) implies qUnconscious,
    qTemporaryHitPoints >= 0,
  }
}
