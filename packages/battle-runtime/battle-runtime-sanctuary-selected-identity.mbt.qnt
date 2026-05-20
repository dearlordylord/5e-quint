// -*- mode: Bluespec; -*-

module battleRuntimeSanctuarySelectedIdentityMbt {
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"

  var qWardPresent: bool
  var qWardSourceIsSanctuary: bool
  var qWisdomSaveRequested: bool
  var qAttackOrSpellLost: bool
  var qSuccessfulSavePassThrough: bool
  var qLegalReplacementPassThrough: bool
  var qIllegalReplacementRejected: bool
  var qAreaEffectBypassedInterdiction: bool
  var qWardedHp: int
  var qLastResult: str

  pure def initialWardedHp: int = 12
  pure def damageDealtByWardedCreature: int = 1
  pure def wardedHpAfterDamage: int = initialWardedHp - damageDealtByWardedCreature

  pure def sanctuaryWardedState: BattleState =
    stateWithActorCombatant(
      initialState,
      Goblin,
      combatantWithSanctuaryWard(initialState.goblin, Fighter),
    )

  pure def sanctuaryWardPresent: bool =
    activeEffectsContainSanctuaryWard(combatantForActor(sanctuaryWardedState, Goblin).activeEffects)

  pure def sanctuaryWardSourceIsFighter: bool =
    activeEffectsContainSanctuaryWardFrom(combatantForActor(sanctuaryWardedState, Goblin).activeEffects, Fighter)

  pure def sanctuaryWisdomSaveRequested(trigger: SanctuaryTargetingTrigger): bool =
    sanctuaryWardPresent and wardTargetingInterdictionApplies(trigger)

  pure def sanctuarySuccessfulSavePassesThrough(trigger: SanctuaryTargetingTrigger): bool =
    sanctuaryTargetingInterdictionOutcomeApplies(
      sanctuaryWardedState,
      Goblin,
      trigger,
      SanctuarySaveSucceeded,
    ) and
    sanctuaryTargetingInterdictionResolvedTarget(
      sanctuaryWardedState,
      Goblin,
      trigger,
      SanctuarySaveSucceeded,
    ) == Goblin

  pure def sanctuaryReplacementPassesThrough(replacement: Actor, callerTargetLegal: bool): bool =
    sanctuaryReplacementTargetAdmitted(Goblin, replacement, callerTargetLegal) and
    sanctuaryTargetingInterdictionOutcomeApplies(
      sanctuaryWardedState,
      Goblin,
      SanctuaryAttackRollTargeting,
      SanctuaryChooseNewTarget({ target: replacement }),
    ) and
    sanctuaryTargetingInterdictionResolvedTarget(
      sanctuaryWardedState,
      Goblin,
      SanctuaryAttackRollTargeting,
      SanctuaryChooseNewTarget({ target: replacement }),
    ) == replacement

  pure def sanctuaryAfterWardedTargetAction: BattleState =
    battleStateAfterSanctuaryEarlyEndForActor(sanctuaryWardedState, Goblin)

  pure def sanctuaryWardEndedAfterTargetAction: bool =
    not(activeEffectsContainSanctuaryWard(combatantForActor(sanctuaryAfterWardedTargetAction, Goblin).activeEffects))

  action recordProjection(
    wardPresent: bool,
    wardSourceIsSanctuary: bool,
    wisdomSaveRequested: bool,
    attackOrSpellLost: bool,
    successfulSavePassThrough: bool,
    legalReplacementPassThrough: bool,
    illegalReplacementRejected: bool,
    areaEffectBypassedInterdiction: bool,
    wardedHp: int,
    lastResult: str,
  ): bool = all {
    qWardPresent' = wardPresent,
    qWardSourceIsSanctuary' = wardSourceIsSanctuary,
    qWisdomSaveRequested' = wisdomSaveRequested,
    qAttackOrSpellLost' = attackOrSpellLost,
    qSuccessfulSavePassThrough' = successfulSavePassThrough,
    qLegalReplacementPassThrough' = legalReplacementPassThrough,
    qIllegalReplacementRejected' = illegalReplacementRejected,
    qAreaEffectBypassedInterdiction' = areaEffectBypassedInterdiction,
    qWardedHp' = wardedHp,
    qLastResult' = lastResult,
  }

  action init = recordProjection(
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    initialWardedHp,
    "init",
  )

  action doCastSanctuaryWardCreation = all {
    qLastResult == "init",
    recordProjection(
      sanctuaryWardPresent,
      sanctuaryWardSourceIsFighter,
      false,
      false,
      false,
      false,
      false,
      false,
      initialWardedHp,
      "wardCreated",
    ),
  }

  action doInterdictDirectAttackFailedSaveLoss = all {
    qLastResult == "init",
    recordProjection(
      sanctuaryWardPresent,
      sanctuaryWardSourceIsFighter,
      sanctuaryWisdomSaveRequested(SanctuaryAttackRollTargeting),
      wardInterdictionLosesAttackOrSpell(SanctuaryLoseAttackOrSpell),
      false,
      false,
      false,
      false,
      initialWardedHp,
      "attackLost",
    ),
  }

  action doInterdictDirectSpellSuccessfulSavePassThrough = all {
    qLastResult == "init",
    recordProjection(
      sanctuaryWardPresent,
      sanctuaryWardSourceIsFighter,
      sanctuaryWisdomSaveRequested(SanctuaryDamagingSpellTargeting),
      false,
      sanctuarySuccessfulSavePassesThrough(SanctuaryDamagingSpellTargeting),
      false,
      false,
      false,
      initialWardedHp,
      "spellSaveSucceeded",
    ),
  }

  action doRetargetDirectAttackToLegalReplacement = all {
    qLastResult == "init",
    recordProjection(
      sanctuaryWardPresent,
      sanctuaryWardSourceIsFighter,
      sanctuaryWisdomSaveRequested(SanctuaryAttackRollTargeting),
      false,
      false,
      sanctuaryReplacementPassesThrough(Fighter, true),
      false,
      false,
      initialWardedHp,
      "replacementAdmitted",
    ),
  }

  action doRejectIllegalReplacementTarget = all {
    qLastResult == "init",
    recordProjection(
      sanctuaryWardPresent,
      sanctuaryWardSourceIsFighter,
      sanctuaryWisdomSaveRequested(SanctuaryAttackRollTargeting),
      false,
      false,
      false,
      not(sanctuaryReplacementPassesThrough(Fighter, false)),
      false,
      initialWardedHp,
      "replacementRejected",
    ),
  }

  action doExcludeAreaEffectFromInterdiction = all {
    qLastResult == "init",
    recordProjection(
      sanctuaryWardPresent,
      sanctuaryWardSourceIsFighter,
      sanctuaryWisdomSaveRequested(SanctuaryAreaOfEffectTargeting),
      false,
      false,
      false,
      false,
      not(wardTargetingInterdictionApplies(SanctuaryAreaOfEffectTargeting)),
      initialWardedHp,
      "areaEffectExcluded",
    ),
  }

  action doEndWardOnWardedAttackRoll = all {
    qLastResult == "init",
    recordProjection(
      not(sanctuaryWardEndedAfterTargetAction),
      not(sanctuaryWardEndedAfterTargetAction),
      false,
      false,
      false,
      false,
      false,
      false,
      initialWardedHp,
      "attackRollEndedWard",
    ),
  }

  action doEndWardOnWardedSpellCast = all {
    qLastResult == "init",
    recordProjection(
      not(sanctuaryWardEndedAfterTargetAction),
      not(sanctuaryWardEndedAfterTargetAction),
      false,
      false,
      false,
      false,
      false,
      false,
      initialWardedHp,
      "spellCastEndedWard",
    ),
  }

  action doEndWardOnWardedDamageDealt = all {
    qLastResult == "init",
    recordProjection(
      not(sanctuaryWardEndedAfterTargetAction),
      not(sanctuaryWardEndedAfterTargetAction),
      false,
      false,
      false,
      false,
      false,
      false,
      wardedHpAfterDamage,
      "damageEndedWard",
    ),
  }

  action step = any {
    doCastSanctuaryWardCreation,
    doInterdictDirectAttackFailedSaveLoss,
    doInterdictDirectSpellSuccessfulSavePassThrough,
    doRetargetDirectAttackToLegalReplacement,
    doRejectIllegalReplacementTarget,
    doExcludeAreaEffectFromInterdiction,
    doEndWardOnWardedAttackRoll,
    doEndWardOnWardedSpellCast,
    doEndWardOnWardedDamageDealt,
  }
}
