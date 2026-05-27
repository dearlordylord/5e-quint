// -*- mode: Bluespec; -*-

module battleRuntimeLevitatedCreatureLifecycleMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Levitate:
  //   Concentration up to 10 minutes; one visible creature rises up to
  //   20 feet and remains suspended; unwilling creatures that succeed on a
  //   Constitution Saving Throw are unaffected; targets move only by pushing
  //   or pulling against a fixed object or surface within reach; the caster can
  //   use a Magic Action to move a non-self target that remains within range.
  // - .references/srd-5.2.1/Rules-Glossary.md#Climbing:
  //   climbing costs 1 extra foot per foot unless using a Climb Speed.
  // - .references/srd-5.2.1/Rules-Glossary.md#Concentration:
  //   effects end when their creator loses Concentration.
  // - .references/srd-5.2.1/Playing-the-Game.md#Movement and Position:
  //   Movement is deducted from the creature's movement budget.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Movement, Concentration,
  //   Duration, and Spellcasting.
  var qActionAvailable: bool
  var qSpellAvailable: bool
  var qEffectActive: bool
  var qCasterConcentrating: bool
  var qAltitudeFeet: int
  var qHoles: Set[str]
  var qLastResult: str

  pure val noAltitude: int = -1
  pure val noHoles: Set[str] = Set()
  pure val savingThrowOutcomeHoles: Set[str] = Set("SavingThrowOutcome")
  pure val initialRiseHoles: Set[str] = Set("LevitateInitialRise")
  pure val movementHoles: Set[str] = Set("Movement")
  pure val altitudeChangeHoles: Set[str] = Set("LevitateAltitudeChange")

  pure def altitudeAfterChange(altitudeFeet: int, directionUp: bool, distanceFeet: int): int =
    if (directionUp)
      altitudeFeet + distanceFeet
    else if (distanceFeet > altitudeFeet)
      0
    else
      altitudeFeet - distanceFeet

  action recordLevitatedCreatureState(
    actionAvailable: bool,
    spellAvailable: bool,
    effectActive: bool,
    casterConcentrating: bool,
    altitudeFeet: int,
    holes: Set[str],
    lastResult: str,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qEffectActive' = effectActive,
    qCasterConcentrating' = casterConcentrating,
    qAltitudeFeet' = altitudeFeet,
    qHoles' = holes,
    qLastResult' = lastResult,
  }

  action recordNoEffectState(
    actionAvailable: bool,
    spellAvailable: bool,
    lastResult: str,
  ): bool =
    recordLevitatedCreatureState(
      actionAvailable,
      spellAvailable,
      false,
      false,
      noAltitude,
      noHoles,
      lastResult,
    )

  action recordEffectState(
    actionAvailable: bool,
    altitudeFeet: int,
    holes: Set[str],
    lastResult: str,
  ): bool =
    recordLevitatedCreatureState(
      actionAvailable,
      false,
      true,
      true,
      altitudeFeet,
      holes,
      lastResult,
    )

  action init = all {
    recordLevitatedCreatureState(
      true,
      true,
      false,
      false,
      noAltitude,
      noHoles,
      "init",
    ),
  }

  action doDiscoverUnwillingSave = all {
    qActionAvailable,
    qSpellAvailable,
    not(qEffectActive),
    qHoles == noHoles,
    qLastResult == "init",
    recordLevitatedCreatureState(
      true,
      true,
      false,
      false,
      noAltitude,
      savingThrowOutcomeHoles,
      "needsSave",
    ),
  }

  action doCastUnwillingSaveSuccess = all {
    qHoles == savingThrowOutcomeHoles,
    recordNoEffectState(false, false, "unwillingSaveSucceeded"),
  }

  action doCastUnwillingSaveFailureAt10Feet = all {
    qHoles == savingThrowOutcomeHoles,
    recordEffectState(false, 10, noHoles, "unwillingSaveFailed"),
  }

  action doDiscoverWillingInitialRise = all {
    qActionAvailable,
    qSpellAvailable,
    not(qEffectActive),
    qHoles == noHoles,
    qLastResult == "init",
    recordLevitatedCreatureState(
      true,
      true,
      false,
      false,
      noAltitude,
      initialRiseHoles,
      "needsWillingInitialRise",
    ),
  }

  action doCastWillingAt12Feet = all {
    qHoles == initialRiseHoles,
    qLastResult == "needsWillingInitialRise",
    recordEffectState(false, 12, noHoles, "willingLevitated"),
  }

  action doDiscoverTargetMovement = all {
    qEffectActive,
    qHoles == noHoles,
    qLastResult.in(Set("willingLevitated", "unwillingSaveFailed")),
    recordEffectState(true, qAltitudeFeet, movementHoles, "needsTargetMovement"),
  }

  action doRejectTargetMovementWithoutWitness = all {
    qEffectActive,
    qHoles == movementHoles,
    recordEffectState(true, qAltitudeFeet, noHoles, "missingWitnessRejected"),
  }

  action doMoveTargetWithWitnessUp5Feet = all {
    qEffectActive,
    qHoles == movementHoles,
    recordEffectState(true, altitudeAfterChange(qAltitudeFeet, true, 5), noHoles, "targetMoved"),
  }

  action doDiscoverCasterControl = all {
    qEffectActive,
    qHoles == noHoles,
    qLastResult.in(Set(
      "willingLevitated",
      "unwillingSaveFailed",
      "missingWitnessRejected",
      "targetMoved",
    )),
    recordEffectState(true, qAltitudeFeet, altitudeChangeHoles, "needsCasterControl"),
  }

  action doRejectOutOfRangeCasterControl = all {
    qEffectActive,
    qHoles == altitudeChangeHoles,
    recordEffectState(true, qAltitudeFeet, noHoles, "outOfRangeRejected"),
  }

  action doControlAltitudeDown10Feet = all {
    qEffectActive,
    qHoles == altitudeChangeHoles,
    recordEffectState(false, altitudeAfterChange(qAltitudeFeet, false, 10), noHoles, "casterControlled"),
  }

  action doBreakConcentration = all {
    qEffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    qLastResult.in(Set("willingLevitated", "unwillingSaveFailed")),
    recordNoEffectState(qActionAvailable, false, "concentrationBroken"),
  }

  action doExpireDuration = all {
    qEffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    qLastResult.in(Set("willingLevitated", "unwillingSaveFailed")),
    recordNoEffectState(true, false, "durationExpired"),
  }

  action doStutter = all {
    qLastResult.in(Set(
      "unwillingSaveSucceeded",
      "outOfRangeRejected",
      "casterControlled",
      "concentrationBroken",
      "durationExpired",
    )),
    recordLevitatedCreatureState(
      qActionAvailable,
      qSpellAvailable,
      qEffectActive,
      qCasterConcentrating,
      qAltitudeFeet,
      qHoles,
      qLastResult,
    ),
  }

  action step = any {
    doDiscoverUnwillingSave,
    doCastUnwillingSaveSuccess,
    doCastUnwillingSaveFailureAt10Feet,
    doDiscoverWillingInitialRise,
    doCastWillingAt12Feet,
    doDiscoverTargetMovement,
    doRejectTargetMovementWithoutWitness,
    doMoveTargetWithWitnessUp5Feet,
    doDiscoverCasterControl,
    doRejectOutOfRangeCasterControl,
    doControlAltitudeDown10Feet,
    doBreakConcentration,
    doExpireDuration,
    doStutter,
  }
}
