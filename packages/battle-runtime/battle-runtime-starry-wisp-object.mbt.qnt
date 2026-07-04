// -*- mode: Bluespec; -*-

module battleRuntimeStarryWispObjectMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Actor = | Fighter
  type DamageType = | Radiant
  type SpellInvocation = | StarryWisp
  type ObjectTarget = | StarryWispObjectTarget
  type Hole = TargetChoice | ObjectTargetChoice | AttackRoll | SpellDamageRoll

  type ObjectDamageOutcome =
    | ObjectHitPointDamage({
        object: ObjectTarget,
        damageType: DamageType,
        rolledDamage: int,
        effectiveDamage: int,
        priorHitPoints: int,
        nextHitPoints: int,
        destroyed: bool,
      })

  type LightEmitter =
    | ObjectInvisibleRevealLightEmitter({
        source: Actor,
        sourceSpell: SpellInvocation,
        object: ObjectTarget,
        dimLightRadiusFeet: int,
        expiresAtActor: Actor,
        expiresAtRound: int,
      })

  type ObjectDamageOutcomeOption =
    | NoObjectDamage
    | SomeObjectDamage(ObjectDamageOutcome)

  var qActionAvailable: bool
  var qProtocol: WitnessProtocol[Hole]
  var qObjectDamage: ObjectDamageOutcomeOption
  var qLightEmitters: Set[LightEmitter]

  pure def openHoles: Set[Hole] = qProtocol.holes

  pure val starryWispObjectHitPoints: int = 5
  pure val starryWispDimLightRadiusFeet: int = 10
  pure val starryWispExpiresAtRound: int = 2

  pure def starryWispObjectProtocolForProjection(
    holes: Set[Hole],
    result: WitnessResult,
  ): WitnessProtocol[Hole] =
    witnessProtocolFromResult(holes, TargetChoice, result)

  pure val starryWispObjectDamageLow: ObjectDamageOutcome =
    ObjectHitPointDamage({
      object: StarryWispObjectTarget,
      damageType: Radiant,
      rolledDamage: 4,
      effectiveDamage: 4,
      priorHitPoints: starryWispObjectHitPoints,
      nextHitPoints: 1,
      destroyed: false,
    })

  pure val starryWispObjectDamageHigh: ObjectDamageOutcome =
    ObjectHitPointDamage({
      object: StarryWispObjectTarget,
      damageType: Radiant,
      rolledDamage: 6,
      effectiveDamage: 6,
      priorHitPoints: starryWispObjectHitPoints,
      nextHitPoints: 0,
      destroyed: true,
    })

  pure val starryWispObjectDimLightEmitter: LightEmitter =
    ObjectInvisibleRevealLightEmitter({
      source: Fighter,
      sourceSpell: StarryWisp,
      object: StarryWispObjectTarget,
      dimLightRadiusFeet: starryWispDimLightRadiusFeet,
      expiresAtActor: Fighter,
      expiresAtRound: starryWispExpiresAtRound,
    })

  action init = all {
    qActionAvailable' = true,
    qProtocol' = starryWispObjectProtocolForProjection(
      Set(TargetChoice, ObjectTargetChoice),
      WInit,
    ),
    qObjectDamage' = NoObjectDamage,
    qLightEmitters' = Set(),
  }

  action doFillObjectTarget = all {
    qActionAvailable,
    openHoles == Set(TargetChoice, ObjectTargetChoice),
    qActionAvailable' = qActionAvailable,
    qProtocol' = starryWispObjectProtocolForProjection(Set(AttackRoll), WNeedsHoles),
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
  }

  action doRejectObjectWithoutFact = all {
    qActionAvailable,
    openHoles == Set(TargetChoice, ObjectTargetChoice),
    qActionAvailable' = qActionAvailable,
    qProtocol' = starryWispObjectProtocolForProjection(openHoles, WInvalid(WInvalidFill)),
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
  }

  action doFillObjectAttackRollMiss = all {
    qActionAvailable,
    openHoles == Set(AttackRoll),
    qActionAvailable' = false,
    qProtocol' = starryWispObjectProtocolForProjection(Set(), WResolved),
    qObjectDamage' = NoObjectDamage,
    qLightEmitters' = Set(),
  }

  action doFillObjectAttackRollHit = all {
    qActionAvailable,
    openHoles == Set(AttackRoll),
    qActionAvailable' = qActionAvailable,
    qProtocol' = starryWispObjectProtocolForProjection(Set(SpellDamageRoll), WNeedsHoles),
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
  }

  action doFillObjectDamageLow = all {
    qActionAvailable,
    openHoles == Set(SpellDamageRoll),
    qActionAvailable' = false,
    qProtocol' = starryWispObjectProtocolForProjection(Set(), WResolved),
    qObjectDamage' = SomeObjectDamage(starryWispObjectDamageLow),
    qLightEmitters' = Set(starryWispObjectDimLightEmitter),
  }

  action doFillObjectDamageHigh = all {
    qActionAvailable,
    openHoles == Set(SpellDamageRoll),
    qActionAvailable' = false,
    qProtocol' = starryWispObjectProtocolForProjection(Set(), WResolved),
    qObjectDamage' = SomeObjectDamage(starryWispObjectDamageHigh),
    qLightEmitters' = Set(starryWispObjectDimLightEmitter),
  }

  action doRejectStaleAfterResolved = all {
    not(qActionAvailable),
    openHoles == Set(),
    qActionAvailable' = qActionAvailable,
    qProtocol' = starryWispObjectProtocolForProjection(openHoles, WInvalid(WStaleSubject)),
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
  }

  action step = any {
    doFillObjectTarget,
    doRejectObjectWithoutFact,
    doFillObjectAttackRollMiss,
    doFillObjectAttackRollHit,
    doFillObjectDamageLow,
    doFillObjectDamageHigh,
    doRejectStaleAfterResolved,
  }
}
