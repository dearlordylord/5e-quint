// -*- mode: Bluespec; -*-

module battleRuntimeStarryWispObjectMbt {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type ObjectDamageOutcomeOption =
    | NoObjectDamage
    | SomeObjectDamage(ObjectDamageOutcome)

  var qActionAvailable: bool
  var qProtocol: WitnessProtocol[Hole]
  var qObjectDamage: ObjectDamageOutcomeOption
  var qLightEmitters: Set[LightEmitter]

  pure def openHoles: Set[Hole] = qProtocol.holes

  pure val starryWispObjectArmorClass: int = 13
  pure val starryWispObjectHitPoints: int = 5

  pure def starryWispObjectProtocolForProjection(
    holes: Set[Hole],
    result: WitnessResult,
  ): WitnessProtocol[Hole] =
    witnessProtocolFromResult(holes, TargetChoice, result)

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
    qObjectDamage' = SomeObjectDamage(spellObjectDamageOutcome(
      StarryWispSpellAttack,
      StarryWispObjectTarget,
      4,
      ObjectHitPoints({ hitPoints: starryWispObjectHitPoints }),
    )),
    qLightEmitters' = Set(starryWispDimLightEmitter(
      initialState,
      Fighter,
      ObjectLightEmitter({ object: StarryWispObjectTarget }),
    )),
  }

  action doFillObjectDamageHigh = all {
    qActionAvailable,
    openHoles == Set(SpellDamageRoll),
    qActionAvailable' = false,
    qProtocol' = starryWispObjectProtocolForProjection(Set(), WResolved),
    qObjectDamage' = SomeObjectDamage(spellObjectDamageOutcome(
      StarryWispSpellAttack,
      StarryWispObjectTarget,
      6,
      ObjectHitPoints({ hitPoints: starryWispObjectHitPoints }),
    )),
    qLightEmitters' = Set(starryWispDimLightEmitter(
      initialState,
      Fighter,
      ObjectLightEmitter({ object: StarryWispObjectTarget }),
    )),
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
