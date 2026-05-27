// -*- mode: Bluespec; -*-

module battleRuntimeCreatureSizeChangeLifecycleMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Enlarge/Reduce:
  //   Concentration up to 1 minute; unwilling creatures make a Constitution
  //   Saving Throw; Enlarge and Reduce shift Size one category, affect
  //   Strength checks and Strength Saving Throws, and adjust weapon or
  //   Unarmed Strike hit damage.
  // - .references/srd-5.2.1/Playing-the-Game.md#Creature Size:
  //   creature Size categories determine combat space.
  // - .references/srd-5.2.1/Rules-Glossary.md#Concentration:
  //   effects end when their creator loses Concentration.
  // - UBIQUITOUS_LANGUAGE.md: Size, Advantage and Disadvantage, Spell
  //   Invocation, Spell Effect, and Damage.
  var qActionAvailable: bool
  var qSpellAvailable: bool
  var qSizeEffectActive: bool
  var qCasterConcentrating: bool
  var qSizeChangeMode: str
  var qTargetEffectiveSize: str
  var qStrengthAbilityCheckRollMode: str
  var qStrengthSavingThrowRollMode: str
  var qHoles: Set[str]
  var qLastDamageApplied: int
  var qLastResult: str

  pure val noMode: str = "none"
  pure val increaseMode: str = "increase"
  pure val decreaseMode: str = "decrease"
  pure val mediumSize: str = "medium"
  pure val largeSize: str = "large"
  pure val smallSize: str = "small"
  pure val normalRollMode: str = "normal"
  pure val advantageRollMode: str = "advantage"
  pure val disadvantageRollMode: str = "disadvantage"
  pure val noDamageResolved: int = -1
  pure val noHoles: Set[str] = Set()
  pure val savingThrowOutcomeHoles: Set[str] = Set("SavingThrowOutcome")

  action recordCreatureSizeChangeState(
    actionAvailable: bool,
    spellAvailable: bool,
    sizeEffectActive: bool,
    casterConcentrating: bool,
    sizeChangeMode: str,
    targetEffectiveSize: str,
    strengthAbilityCheckRollMode: str,
    strengthSavingThrowRollMode: str,
    holes: Set[str],
    lastDamageApplied: int,
    lastResult: str,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qSizeEffectActive' = sizeEffectActive,
    qCasterConcentrating' = casterConcentrating,
    qSizeChangeMode' = sizeChangeMode,
    qTargetEffectiveSize' = targetEffectiveSize,
    qStrengthAbilityCheckRollMode' = strengthAbilityCheckRollMode,
    qStrengthSavingThrowRollMode' = strengthSavingThrowRollMode,
    qHoles' = holes,
    qLastDamageApplied' = lastDamageApplied,
    qLastResult' = lastResult,
  }

  action recordNoEffectState(
    actionAvailable: bool,
    spellAvailable: bool,
    lastResult: str,
  ): bool =
    recordCreatureSizeChangeState(
      actionAvailable,
      spellAvailable,
      false,
      false,
      noMode,
      mediumSize,
      normalRollMode,
      normalRollMode,
      noHoles,
      noDamageResolved,
      lastResult,
    )

  action recordIncreaseEffectState(
    lastDamageApplied: int,
    lastResult: str,
  ): bool =
    recordCreatureSizeChangeState(
      false,
      false,
      true,
      true,
      increaseMode,
      largeSize,
      advantageRollMode,
      advantageRollMode,
      noHoles,
      lastDamageApplied,
      lastResult,
    )

  action recordDecreaseEffectState(
    lastDamageApplied: int,
    lastResult: str,
  ): bool =
    recordCreatureSizeChangeState(
      false,
      false,
      true,
      true,
      decreaseMode,
      smallSize,
      disadvantageRollMode,
      disadvantageRollMode,
      noHoles,
      lastDamageApplied,
      lastResult,
    )

  action init = all {
    recordCreatureSizeChangeState(
      true,
      true,
      false,
      false,
      noMode,
      mediumSize,
      normalRollMode,
      normalRollMode,
      noHoles,
      noDamageResolved,
      "init",
    ),
  }

  action doDiscoverUnwillingReduceSave = all {
    qActionAvailable,
    qSpellAvailable,
    not(qSizeEffectActive),
    qHoles == noHoles,
    qLastResult == "init",
    recordCreatureSizeChangeState(
      true,
      true,
      false,
      false,
      noMode,
      mediumSize,
      normalRollMode,
      normalRollMode,
      savingThrowOutcomeHoles,
      noDamageResolved,
      "needsHoles",
    ),
  }

  action doCastUnwillingSaveSuccess = all {
    qHoles == savingThrowOutcomeHoles,
    recordNoEffectState(false, false, "unwillingSaveSucceeded"),
  }

  action doCastUnwillingSaveFailure = all {
    qHoles == savingThrowOutcomeHoles,
    recordDecreaseEffectState(noDamageResolved, "unwillingSaveFailed"),
  }

  action doCastWillingEnlarge = all {
    qActionAvailable,
    qSpellAvailable,
    not(qSizeEffectActive),
    qHoles == noHoles,
    qLastResult == "init",
    recordIncreaseEffectState(noDamageResolved, "willingEnlarge"),
  }

  action doCastWillingReduce = all {
    qActionAvailable,
    qSpellAvailable,
    not(qSizeEffectActive),
    qHoles == noHoles,
    qLastResult == "init",
    recordDecreaseEffectState(noDamageResolved, "willingReduce"),
  }

  action doResolveEnlargedWeaponHitDamage = all {
    qSizeEffectActive,
    qSizeChangeMode == increaseMode,
    qHoles == noHoles,
    qLastResult.in(Set("willingEnlarge")),
    recordIncreaseEffectState(7, "attackDamageAdjusted"),
  }

  action doResolveReducedWeaponHitDamage = all {
    qSizeEffectActive,
    qSizeChangeMode == decreaseMode,
    qHoles == noHoles,
    qLastResult.in(Set("willingReduce", "unwillingSaveFailed")),
    recordDecreaseEffectState(1, "attackDamageAdjusted"),
  }

  action doBreakConcentration = all {
    qSizeEffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    qLastResult.in(Set("willingEnlarge", "willingReduce", "unwillingSaveFailed")),
    recordNoEffectState(qActionAvailable, qSpellAvailable, "concentrationBroken"),
  }

  action doExpireDuration = all {
    qSizeEffectActive,
    qCasterConcentrating,
    qHoles == noHoles,
    qLastResult.in(Set("willingEnlarge", "willingReduce", "unwillingSaveFailed")),
    recordNoEffectState(true, qSpellAvailable, "durationExpired"),
  }

  action doStutter = all {
    qLastResult.in(Set(
      "unwillingSaveSucceeded",
      "attackDamageAdjusted",
      "concentrationBroken",
      "durationExpired",
    )),
    recordCreatureSizeChangeState(
      qActionAvailable,
      qSpellAvailable,
      qSizeEffectActive,
      qCasterConcentrating,
      qSizeChangeMode,
      qTargetEffectiveSize,
      qStrengthAbilityCheckRollMode,
      qStrengthSavingThrowRollMode,
      qHoles,
      qLastDamageApplied,
      qLastResult,
    ),
  }

  action step = any {
    doDiscoverUnwillingReduceSave,
    doCastUnwillingSaveSuccess,
    doCastUnwillingSaveFailure,
    doCastWillingEnlarge,
    doCastWillingReduce,
    doResolveEnlargedWeaponHitDamage,
    doResolveReducedWeaponHitDamage,
    doBreakConcentration,
    doExpireDuration,
    doStutter,
  }
}
