// -*- mode: Bluespec; -*-

module battleRuntimeLevitatedCreatureLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type LevitatedCreatureLifecycleScenarioOutcome = | Init | NeedsSave | UnwillingSaveSucceeded | NeedsWillingInitialRise | WillingLevitated | UnwillingSaveFailed | NeedsTargetMovement | TargetMoved | NeedsCasterControl | CasterControlled | MissingWitnessRejected | OutOfRangeRejected | ConcentrationBroken | DurationExpired

  type LevitatedCreatureLifecycleWitnessState = {
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qEffectActive: bool,
    qCasterConcentrating: bool,
    qAltitudeFeet: int,
    qScenarioOutcome: LevitatedCreatureLifecycleScenarioOutcome,
    protocol: WitnessProtocol[str],
  }

  var qState: LevitatedCreatureLifecycleWitnessState

  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qEffectActive: bool = qState.qEffectActive
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qAltitudeFeet: int = qState.qAltitudeFeet
  pure def qLastResult: LevitatedCreatureLifecycleScenarioOutcome = qState.qScenarioOutcome
  pure def qHoles: Set[str] = qState.protocol.holes

  pure def levitatedCreatureLifecycleProtocolForProjection(
    holes: Set[str],
    scenarioResult: LevitatedCreatureLifecycleScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[str] =
    if (scenarioResult == Init) witnessInit("WitnessHole")
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("WitnessHole")

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
    lastResult: LevitatedCreatureLifecycleScenarioOutcome,
  ): bool = all {
    qState' = {
      qActionAvailable: actionAvailable,
      qSpellAvailable: spellAvailable,
      qEffectActive: effectActive,
      qCasterConcentrating: casterConcentrating,
      qAltitudeFeet: altitudeFeet,
      qScenarioOutcome: lastResult,
      protocol: levitatedCreatureLifecycleProtocolForProjection(holes, lastResult, ""),
    },
  }

  action recordNoEffectState(
    actionAvailable: bool,
    spellAvailable: bool,
    lastResult: LevitatedCreatureLifecycleScenarioOutcome,
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
    lastResult: LevitatedCreatureLifecycleScenarioOutcome,
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
      Init,
    ),
  }

  action doDiscoverUnwillingSave = all {
    qActionAvailable,
    qSpellAvailable,
    not(qEffectActive),
    qHoles == noHoles,
    qLastResult == Init,
    recordLevitatedCreatureState(
      true,
      true,
      false,
      false,
      noAltitude,
      savingThrowOutcomeHoles,
      NeedsSave,
    ),
  }

  action doCastUnwillingSaveSuccess = all {
    qHoles == savingThrowOutcomeHoles,
    recordNoEffectState(false, false, UnwillingSaveSucceeded),
  }

  action doCastUnwillingSaveFailureAt10Feet = all {
    qHoles == savingThrowOutcomeHoles,
    recordEffectState(false, 10, noHoles, UnwillingSaveFailed),
  }

  action doDiscoverWillingInitialRise = all {
    qActionAvailable,
    qSpellAvailable,
    not(qEffectActive),
    qHoles == noHoles,
    qLastResult == Init,
    recordLevitatedCreatureState(
      true,
      true,
      false,
      false,
      noAltitude,
      initialRiseHoles,
      NeedsWillingInitialRise,
    ),
  }

  action doCastWillingAt12Feet = all {
    qHoles == initialRiseHoles,
    qLastResult == NeedsWillingInitialRise,
    recordEffectState(false, 12, noHoles, WillingLevitated),
  }

  action doDiscoverTargetMovement = all {
    qEffectActive,
    qHoles == noHoles,
    qLastResult.in(Set(WillingLevitated, UnwillingSaveFailed)),
    recordEffectState(true, qAltitudeFeet, movementHoles, NeedsTargetMovement),
  }

  action doRejectTargetMovementWithoutWitness = all {
    qEffectActive,
    qHoles == movementHoles,
    recordEffectState(true, qAltitudeFeet, noHoles, MissingWitnessRejected),
  }

  action doMoveTargetWithWitnessUp5Feet = all {
    qEffectActive,
    qHoles == movementHoles,
    recordEffectState(true, altitudeAfterChange(qAltitudeFeet, true, 5), noHoles, TargetMoved),
  }

  action doDiscoverCasterControl = all {
    qEffectActive,
    qHoles == noHoles,
    qLastResult.in(Set(
      WillingLevitated,
      UnwillingSaveFailed,
      MissingWitnessRejected,
      TargetMoved,
    )),
    recordEffectState(true, qAltitudeFeet, altitudeChangeHoles, NeedsCasterControl),
  }

  action doRejectOutOfRangeCasterControl = all {
    qEffectActive,
    qHoles == altitudeChangeHoles,
    recordEffectState(true, qAltitudeFeet, noHoles, OutOfRangeRejected),
  }

  action doControlAltitudeDown10Feet = all {
    qEffectActive,
    qHoles == altitudeChangeHoles,
    recordEffectState(false, altitudeAfterChange(qAltitudeFeet, false, 10), noHoles, CasterControlled),
  }

  action doBreakConcentration = all {
    qEffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    qLastResult.in(Set(WillingLevitated, UnwillingSaveFailed)),
    recordNoEffectState(qActionAvailable, false, ConcentrationBroken),
  }

  action doExpireDuration = all {
    qEffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    qLastResult.in(Set(WillingLevitated, UnwillingSaveFailed)),
    recordNoEffectState(true, false, DurationExpired),
  }

  action doStutter = all {
    qLastResult.in(Set(
      UnwillingSaveSucceeded,
      OutOfRangeRejected,
      CasterControlled,
      ConcentrationBroken,
      DurationExpired,
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
