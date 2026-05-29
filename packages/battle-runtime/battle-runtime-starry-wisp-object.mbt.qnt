// -*- mode: Bluespec; -*-

module battleRuntimeStarryWispObjectMbt {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"

  type ObjectDamageOutcomeOption =
    | NoObjectDamage
    | SomeObjectDamage(ObjectDamageOutcome)

  var qActionAvailable: bool
  var qHoles: Set[Hole]
  var qObjectDamage: ObjectDamageOutcomeOption
  var qLightEmitters: Set[LightEmitter]
  var qLastResult: str
  var qLastInvalidReason: str

  pure val starryWispObjectArmorClass: int = 13
  pure val starryWispObjectHitPoints: int = 5

  action init = all {
    qActionAvailable' = true,
    qHoles' = Set(TargetChoice, ObjectTargetChoice),
    qObjectDamage' = NoObjectDamage,
    qLightEmitters' = Set(),
    qLastResult' = "init",
    qLastInvalidReason' = "",
  }

  action doFillObjectTarget = all {
    qActionAvailable,
    qHoles == Set(TargetChoice, ObjectTargetChoice),
    qActionAvailable' = qActionAvailable,
    qHoles' = Set(AttackRoll),
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doRejectObjectWithoutFact = all {
    qActionAvailable,
    qHoles == Set(TargetChoice, ObjectTargetChoice),
    qActionAvailable' = qActionAvailable,
    qHoles' = qHoles,
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
    qLastResult' = "invalid",
    qLastInvalidReason' = "invalidFill",
  }

  action doFillObjectAttackRollMiss = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    qActionAvailable' = false,
    qHoles' = Set(),
    qObjectDamage' = NoObjectDamage,
    qLightEmitters' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillObjectAttackRollHit = all {
    qActionAvailable,
    qHoles == Set(AttackRoll),
    qActionAvailable' = qActionAvailable,
    qHoles' = Set(SpellDamageRoll),
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillObjectDamageLow = all {
    qActionAvailable,
    qHoles == Set(SpellDamageRoll),
    qActionAvailable' = false,
    qHoles' = Set(),
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
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillObjectDamageHigh = all {
    qActionAvailable,
    qHoles == Set(SpellDamageRoll),
    qActionAvailable' = false,
    qHoles' = Set(),
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
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doRejectStaleAfterResolved = all {
    not(qActionAvailable),
    qHoles == Set(),
    qActionAvailable' = qActionAvailable,
    qHoles' = qHoles,
    qObjectDamage' = qObjectDamage,
    qLightEmitters' = qLightEmitters,
    qLastResult' = "invalid",
    qLastInvalidReason' = "staleSubject",
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
