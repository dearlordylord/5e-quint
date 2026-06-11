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

  pure def qHoles: Set[Hole] = qProtocol.holes

  pure val starryWispObjectArmorClass: int = 13
  pure val starryWispObjectHitPoints: int = 5

  pure def starryWispObjectProtocolForProjection(
    holes: Set[Hole],
    lastResult: str,
    invalidReason: str,
  ): WitnessProtocol[Hole] =
    if (lastResult == "init") witnessInitWithHoles(holes)
    else if (lastResult == "invalid")
      witnessInvalidWithHoles(
        holes,
        if (invalidReason == "staleSubject") WStaleSubject else WInvalidFill,
      )
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(TargetChoice)

  action init = all {
    qActionAvailable' = true,
    qProtocol' = starryWispObjectProtocolForProjection(
      Set(TargetChoice, ObjectTargetChoice),
      "init",
      "",
    ),
    qObjectDamage' = NoObjectDamage,
    qLightEmitters' = Set(),
  }

  action doFillObjectTarget = all {
    qActionAvailable,
    qHoles == Set(TargetChoice, ObjectTargetChoice),
    qActionAvailable' = qActionAvailable,
    qProtocol' = starryWispObjectProtocolForProjection(Set(AttackRoll), "needsHoles", ""),
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
  }

  action doRejectObjectWithoutFact = all {
    qActionAvailable,
    qHoles == Set(TargetChoice, ObjectTargetChoice),
    qActionAvailable' = qActionAvailable,
    qProtocol' = starryWispObjectProtocolForProjection(qHoles, "invalid", "invalidFill"),
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
  }

  action doFillObjectAttackRollMiss = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    qActionAvailable' = false,
    qProtocol' = starryWispObjectProtocolForProjection(Set(), "resolved", ""),
    qObjectDamage' = NoObjectDamage,
    qLightEmitters' = Set(),
  }

  action doFillObjectAttackRollHit = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    qActionAvailable' = qActionAvailable,
    qProtocol' = starryWispObjectProtocolForProjection(Set(SpellDamageRoll), "needsHoles", ""),
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
  }

  action doFillObjectDamageLow = all {
    qActionAvailable,
    qHoles == Set(SpellDamageRoll),
    qActionAvailable' = false,
    qProtocol' = starryWispObjectProtocolForProjection(Set(), "resolved", ""),
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
    qHoles == Set(SpellDamageRoll),
    qActionAvailable' = false,
    qProtocol' = starryWispObjectProtocolForProjection(Set(), "resolved", ""),
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
    qHoles == Set(),
    qActionAvailable' = qActionAvailable,
    qProtocol' = starryWispObjectProtocolForProjection(qHoles, "invalid", "staleSubject"),
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
