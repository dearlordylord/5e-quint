// -*- mode: Bluespec; -*-

module battleRuntimeCreatureSizeChangeLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | SavingThrowOutcome

  type CreatureSizeChangeLifecycleScenarioOutcome = | Init | NeedsHoles | UnwillingSaveSucceeded | UnwillingSaveFailed | WillingEnlarge | WillingReduce | AttackDamageAdjusted | ConcentrationBroken | DurationExpired


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
  type WitnessState = {
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qSizeEffectActive: bool,
    qCasterConcentrating: bool,
    qSizeChangeMode: str,
    qTargetEffectiveSize: str,
    qStrengthAbilityCheckRollMode: str,
    qStrengthSavingThrowRollMode: str,
    qLastDamageApplied: int,
    qScenarioOutcome: CreatureSizeChangeLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qSizeEffectActive: bool = qState.qSizeEffectActive
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qSizeChangeMode: str = qState.qSizeChangeMode
  pure def qTargetEffectiveSize: str = qState.qTargetEffectiveSize
  pure def qStrengthAbilityCheckRollMode: str = qState.qStrengthAbilityCheckRollMode
  pure def qStrengthSavingThrowRollMode: str = qState.qStrengthSavingThrowRollMode
  pure def protocolHoles: Set[WitnessHole] = qState.protocol.holes
  pure def qLastDamageApplied: int = qState.qLastDamageApplied
  pure def qScenarioOutcome: CreatureSizeChangeLifecycleScenarioOutcome = qState.qScenarioOutcome

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
  pure val noHoles: Set[WitnessHole] = Set()
  pure val savingThrowOutcomeHoles: Set[WitnessHole] = Set(SavingThrowOutcome)

  action recordCreatureSizeChangeState(
    actionAvailable: bool,
    spellAvailable: bool,
    sizeEffectActive: bool,
    casterConcentrating: bool,
    sizeChangeMode: str,
    targetEffectiveSize: str,
    strengthAbilityCheckRollMode: str,
    strengthSavingThrowRollMode: str,
    lastDamageApplied: int,
    scenarioOutcome: CreatureSizeChangeLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qActionAvailable: actionAvailable,
      qSpellAvailable: spellAvailable,
      qSizeEffectActive: sizeEffectActive,
      qCasterConcentrating: casterConcentrating,
      qSizeChangeMode: sizeChangeMode,
      qTargetEffectiveSize: targetEffectiveSize,
      qStrengthAbilityCheckRollMode: strengthAbilityCheckRollMode,
      qStrengthSavingThrowRollMode: strengthSavingThrowRollMode,
      qLastDamageApplied: lastDamageApplied,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action recordNoEffectState(
    actionAvailable: bool,
    spellAvailable: bool,
    scenarioOutcome: CreatureSizeChangeLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
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
      noDamageResolved,
      scenarioOutcome,
      protocol,
    )

  action recordIncreaseEffectState(
    lastDamageApplied: int,
    scenarioOutcome: CreatureSizeChangeLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
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
      lastDamageApplied,
      scenarioOutcome,
      protocol,
    )

  action recordDecreaseEffectState(
    lastDamageApplied: int,
    scenarioOutcome: CreatureSizeChangeLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
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
      lastDamageApplied,
      scenarioOutcome,
      protocol,
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
      noDamageResolved,
      Init,
      witnessInit(SavingThrowOutcome),
    ),
  }

  action doDiscoverUnwillingReduceSave = all {
    qActionAvailable,
    qSpellAvailable,
    not(qSizeEffectActive),
    protocolHoles == noHoles,
    qScenarioOutcome == Init,
    recordCreatureSizeChangeState(
      true,
      true,
      false,
      false,
      noMode,
      mediumSize,
      normalRollMode,
      normalRollMode,
      noDamageResolved,
      NeedsHoles,
      witnessNeedsHoles(savingThrowOutcomeHoles),
    ),
  }

  action doCastUnwillingSaveSuccess = all {
    protocolHoles == savingThrowOutcomeHoles,
    recordNoEffectState(
      false,
      false,
      UnwillingSaveSucceeded,
      witnessResolved(SavingThrowOutcome),
    ),
  }

  action doCastUnwillingSaveFailure = all {
    protocolHoles == savingThrowOutcomeHoles,
    recordDecreaseEffectState(
      noDamageResolved,
      UnwillingSaveFailed,
      witnessResolved(SavingThrowOutcome),
    ),
  }

  action doCastWillingEnlarge = all {
    qActionAvailable,
    qSpellAvailable,
    not(qSizeEffectActive),
    protocolHoles == noHoles,
    qScenarioOutcome == Init,
    recordIncreaseEffectState(
      noDamageResolved,
      WillingEnlarge,
      witnessResolved(SavingThrowOutcome),
    ),
  }

  action doCastWillingReduce = all {
    qActionAvailable,
    qSpellAvailable,
    not(qSizeEffectActive),
    protocolHoles == noHoles,
    qScenarioOutcome == Init,
    recordDecreaseEffectState(
      noDamageResolved,
      WillingReduce,
      witnessResolved(SavingThrowOutcome),
    ),
  }

  action doResolveEnlargedWeaponHitDamage = all {
    qSizeEffectActive,
    qSizeChangeMode == increaseMode,
    protocolHoles == noHoles,
    qScenarioOutcome.in(Set(WillingEnlarge)),
    recordIncreaseEffectState(
      7,
      AttackDamageAdjusted,
      witnessResolved(SavingThrowOutcome),
    ),
  }

  action doResolveReducedWeaponHitDamage = all {
    qSizeEffectActive,
    qSizeChangeMode == decreaseMode,
    protocolHoles == noHoles,
    qScenarioOutcome.in(Set(WillingReduce, UnwillingSaveFailed)),
    recordDecreaseEffectState(
      1,
      AttackDamageAdjusted,
      witnessResolved(SavingThrowOutcome),
    ),
  }

  action doBreakConcentration = all {
    qSizeEffectActive,
    qCasterConcentrating,
    protocolHoles == noHoles,
    qScenarioOutcome.in(Set(WillingEnlarge, WillingReduce, UnwillingSaveFailed)),
    recordNoEffectState(
      qActionAvailable,
      qSpellAvailable,
      ConcentrationBroken,
      witnessResolved(SavingThrowOutcome),
    ),
  }

  action doExpireDuration = all {
    qSizeEffectActive,
    qCasterConcentrating,
    protocolHoles == noHoles,
    qScenarioOutcome.in(Set(WillingEnlarge, WillingReduce, UnwillingSaveFailed)),
    recordNoEffectState(
      true,
      qSpellAvailable,
      DurationExpired,
      witnessResolved(SavingThrowOutcome),
    ),
  }

  action doStutter = all {
    qScenarioOutcome.in(Set(
      UnwillingSaveSucceeded,
      AttackDamageAdjusted,
      ConcentrationBroken,
      DurationExpired,
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
      qLastDamageApplied,
      qScenarioOutcome,
      qState.protocol,
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
