// -*- mode: Bluespec; -*-

module ruleCoreHitPointDamageMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"

  var qLastScenario: str
  var qHitPoints: int
  var qHitPointMaximum: int
  var qTemporaryHitPoints: int
  var qDead: bool
  var qUnconscious: bool
  var qDamageToHitPoints: int
  var qRemainingDamageAtZero: int
  var qReplayIndex: int
  var qComponentRoute: List[RuleCoreComponentRouteEvent]

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreHitPointDamageOwner)

  pure def temporaryHitPointsAbsorbFirst: str = "temporary-hit-points-absorb-first"
  pure def monsterDiesAtZero: str = "monster-dies-at-zero"
  pure def playerCharacterFallsUnconscious: str = "player-character-falls-unconscious"
  pure def playerCharacterDiesFromMassiveDamage: str = "player-character-dies-from-massive-damage"
  pure def playerCharacterTempHpFullyAbsorbsAtZero: str = "player-character-temp-hp-fully-absorbs-at-zero"

  action recordDamageResult(scenario: str, result: DamageResult, nextReplayIndex: int): bool = all {
    qLastScenario' = scenario,
    qHitPoints' = result.vitals.hitPoints,
    qHitPointMaximum' = result.vitals.hitPointMaximum,
    qTemporaryHitPoints' = result.vitals.temporaryHitPoints,
    qDead' = result.vitals.dead,
    qUnconscious' = result.vitals.unconscious,
    qDamageToHitPoints' = result.damageToHitPoints,
    qRemainingDamageAtZero' = result.remainingDamageAtZero,
    qReplayIndex' = nextReplayIndex,
    qComponentRoute' = componentRouteEvidence,
  }

  action init = all {
    qLastScenario' = "init",
    qHitPoints' = 0,
    qHitPointMaximum' = 1,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qDamageToHitPoints' = 0,
    qRemainingDamageAtZero' = 0,
    qReplayIndex' = 0,
    qComponentRoute' = componentRouteEvidence,
  }

  action doTemporaryHitPointsAbsorbFirst = all {
    qReplayIndex == 0,
    recordDamageResult(temporaryHitPointsAbsorbFirst, applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 8,
      hitPointMaximum: 10,
      temporaryHitPoints: 3,
      dead: false,
      unconscious: false,
    }, 5), 1),
  }

  action doMonsterDiesAtZero = all {
    qReplayIndex == 1,
    recordDamageResult(monsterDiesAtZero, applyResolvedDamageToPositiveHitPoints({
      kind: MonsterCreature,
      hitPoints: 4,
      hitPointMaximum: 10,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 4), 2),
  }

  action doPlayerCharacterFallsUnconscious = all {
    qReplayIndex == 2,
    recordDamageResult(playerCharacterFallsUnconscious, applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 4,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 7), 3),
  }

  action doPlayerCharacterDiesFromMassiveDamage = all {
    qReplayIndex == 3,
    recordDamageResult(playerCharacterDiesFromMassiveDamage, applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 6,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 18), 4),
  }

  action recordZeroHpDamageResult(scenario: str, vitals: CreatureVitals, nextReplayIndex: int): bool = all {
    qLastScenario' = scenario,
    qHitPoints' = vitals.hitPoints,
    qHitPointMaximum' = vitals.hitPointMaximum,
    qTemporaryHitPoints' = vitals.temporaryHitPoints,
    qDead' = vitals.dead,
    qUnconscious' = vitals.unconscious,
    qDamageToHitPoints' = 0,
    qRemainingDamageAtZero' = 0,
    qReplayIndex' = nextReplayIndex,
    qComponentRoute' = componentRouteEvidence,
  }

  action doPlayerCharacterTempHpFullyAbsorbsAtZero = all {
    qReplayIndex == 4,
    recordZeroHpDamageResult(
      playerCharacterTempHpFullyAbsorbsAtZero,
      applyDamageToZeroHitPointCreature(
        {
          kind: PlayerCharacter,
          hitPoints: 0,
          hitPointMaximum: 12,
          temporaryHitPoints: 3,
          dead: false,
          unconscious: true,
        },
        resetDeathSavingThrowLifecycle,
        3,
        false
      ).vitals,
      5
    ),
  }

  action step = any {
    doTemporaryHitPointsAbsorbFirst,
    doMonsterDiesAtZero,
    doPlayerCharacterFallsUnconscious,
    doPlayerCharacterDiesFromMassiveDamage,
    doPlayerCharacterTempHpFullyAbsorbsAtZero,
  }
}
