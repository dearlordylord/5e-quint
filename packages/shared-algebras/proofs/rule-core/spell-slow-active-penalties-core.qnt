// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE

module spellSlowActivePenaltiesCore {
  // RAW anchors:
  // - Spells/Descriptions-S-Z.md: Slow.
  // - Spells/Gaining-and-Casting.md: Duration and Concentration.
  // - Rules-Glossary.md: Concentration, Speed, Reaction, and Attack action.
  // - UBIQUITOUS_LANGUAGE.md: Action, Bonus Action, Reaction, Speed, Armor
  //   Class, Saving Throw, Spell Component, Spell Effect, and Concentration.
  //
  // This core owns the occurrence-local consequences of a typed
  // concentration-ended signal. It does not duplicate the generic
  // Concentration state machine or decide why Concentration ended. Likewise,
  // SlowDurationExpired is an input from the owning scheduler; this core owns
  // only cleanup after that signal.

  type SlowEntityRef = int
  // Opaque per-execution occurrence identity. This is not an authored spell
  // id, stable catalog procedure id, name, slug, or provenance key.
  type SlowProcedureExecutionRef = int

  type SlowEffectSource = {
    casterRef: SlowEntityRef,
    procedureExecutionRef: SlowProcedureExecutionRef,
  }

  type SlowOccurrenceState =
    | SlowOccurrenceAbsent
    | SlowOccurrenceActive({
        source: SlowEffectSource,
        affectedTargets: Set[SlowEntityRef],
      })

  type SlowSourceConcentrationCommand =
    | SlowSourceConcentrationUnchanged
    | SlowSourceConcentrationStartRequired
    | SlowSourceConcentrationEndRequired

  type SlowOccurrenceTransition = {
    occurrence: SlowOccurrenceState,
    concentrationCommand: SlowSourceConcentrationCommand,
  }

  type SlowSavingThrowOutcome =
    | SlowSaveSucceeded
    | SlowSaveFailed

  type SlowRepeatSaveRequest =
    | SlowRepeatSaveNotRequired
    | SlowRepeatSaveOutcomeRequired({
        source: SlowEffectSource,
        targetRef: SlowEntityRef,
      })

  type SlowOccurrenceCleanupSignal =
    | SlowSourceConcentrationEnded({ source: SlowEffectSource })
    | SlowDurationExpired({ source: SlowEffectSource })

  type SlowTurnActionKind =
    | SlowAttackAction
    | SlowOtherAction

  type SlowTargetTurnState =
    | SlowTurnUnrestricted
    | SlowTurnRestrictedUnused
    | SlowTurnRestrictedActionUsed({
        actionKind: SlowTurnActionKind,
        attackCount: int,
      })
    | SlowTurnRestrictedBonusActionUsed

  type SlowSomaticResolutionState =
    | SlowSomaticCheckBypassed
    | SlowSomaticFailureOutcomeRequired({ failurePercent: int })
    | SlowSomaticSpellContinues
    | SlowSomaticSpellFailedAfterResourceSpend

  type SlowSomaticFailureOutcome =
    | SlowSomaticSpellSucceeded
    | SlowSomaticSpellFailed

  type SlowActivePenaltyProjection = {
    speedRatioNumerator: int,
    speedRatioDenominator: int,
    armorClassDelta: int,
    dexteritySavingThrowDelta: int,
    canReact: bool,
  }

  pure def slowSomaticFailurePercent: int = 25

  pure def slowActivePenaltyProjection: SlowActivePenaltyProjection = {
    speedRatioNumerator: 1,
    speedRatioDenominator: 2,
    armorClassDelta: -2,
    dexteritySavingThrowDelta: -2,
    canReact: false,
  }

  pure def initialSlowOccurrenceState: SlowOccurrenceState =
    SlowOccurrenceAbsent

  pure def initialSlowOccurrenceTransition: SlowOccurrenceTransition = {
    occurrence: initialSlowOccurrenceState,
    concentrationCommand: SlowSourceConcentrationUnchanged,
  }

  pure def legalSlowEffectSource(source: SlowEffectSource): bool = all {
    source.casterRef >= 0,
    source.procedureExecutionRef >= 0,
  }

  pure def legalSlowAffectedTargets(
    affectedTargets: Set[SlowEntityRef]
  ): bool = all {
    affectedTargets.size() > 0,
    affectedTargets.forall(targetRef => targetRef >= 0),
  }

  pure def legalSlowOccurrenceState(state: SlowOccurrenceState): bool =
    match state {
      | SlowOccurrenceAbsent => true
      | SlowOccurrenceActive(active) => all {
          legalSlowEffectSource(active.source),
          legalSlowAffectedTargets(active.affectedTargets),
        }
    }

  pure def slowTargetAffected(
    state: SlowOccurrenceState,
    targetRef: SlowEntityRef
  ): bool =
    match state {
      | SlowOccurrenceAbsent => false
      | SlowOccurrenceActive(active) =>
          active.affectedTargets.contains(targetRef)
    }

  pure def slowOccurrenceHasSource(
    state: SlowOccurrenceState,
    source: SlowEffectSource
  ): bool =
    match state {
      | SlowOccurrenceAbsent => false
      | SlowOccurrenceActive(active) => active.source == source
    }

  pure def slowAffectedTargetCount(state: SlowOccurrenceState): int =
    match state {
      | SlowOccurrenceAbsent => 0
      | SlowOccurrenceActive(active) => active.affectedTargets.size()
    }

  pure def canApplySlowInitialFailedSaves(
    state: SlowOccurrenceState,
    source: SlowEffectSource,
    failedSaveTargets: Set[SlowEntityRef]
  ): bool = all {
    state == SlowOccurrenceAbsent,
    legalSlowEffectSource(source),
    legalSlowAffectedTargets(failedSaveTargets),
  }

  pure def applySlowInitialFailedSaves(
    state: SlowOccurrenceState,
    source: SlowEffectSource,
    failedSaveTargets: Set[SlowEntityRef]
  ): SlowOccurrenceTransition =
    if (not(canApplySlowInitialFailedSaves(state, source, failedSaveTargets))) {
      occurrence: state,
      concentrationCommand: SlowSourceConcentrationUnchanged,
    } else {
      occurrence: SlowOccurrenceActive({
        source: source,
        affectedTargets: failedSaveTargets,
      }),
      concentrationCommand: SlowSourceConcentrationStartRequired,
    }

  pure def requestSlowRepeatSave(
    state: SlowOccurrenceState,
    targetRef: SlowEntityRef
  ): SlowRepeatSaveRequest =
    match state {
      | SlowOccurrenceAbsent => SlowRepeatSaveNotRequired
      | SlowOccurrenceActive(active) =>
          if (not(active.affectedTargets.contains(targetRef)))
            SlowRepeatSaveNotRequired
          else SlowRepeatSaveOutcomeRequired({
            source: active.source,
            targetRef: targetRef,
          })
    }

  pure def canResolveSlowRepeatSave(
    state: SlowOccurrenceState,
    request: SlowRepeatSaveRequest
  ): bool =
    match request {
      | SlowRepeatSaveNotRequired => false
      | SlowRepeatSaveOutcomeRequired(data) => all {
          slowOccurrenceHasSource(state, data.source),
          slowTargetAffected(state, data.targetRef),
        }
    }

  pure def applySlowRepeatSaveOutcome(
    state: SlowOccurrenceState,
    request: SlowRepeatSaveRequest,
    outcome: SlowSavingThrowOutcome
  ): SlowOccurrenceTransition =
    if (not(canResolveSlowRepeatSave(state, request))) {
      occurrence: state,
      concentrationCommand: SlowSourceConcentrationUnchanged,
    } else match request {
      | SlowRepeatSaveNotRequired => {
          occurrence: state,
          concentrationCommand: SlowSourceConcentrationUnchanged,
        }
      | SlowRepeatSaveOutcomeRequired(requestData) =>
          if (outcome == SlowSaveFailed) {
            occurrence: state,
            concentrationCommand: SlowSourceConcentrationUnchanged,
          } else match state {
            | SlowOccurrenceAbsent => {
                occurrence: state,
                concentrationCommand: SlowSourceConcentrationUnchanged,
              }
            | SlowOccurrenceActive(active) => {
                val remainingTargets =
                  active.affectedTargets.exclude(Set(requestData.targetRef))
                if (remainingTargets.size() == 0) {
                  occurrence: SlowOccurrenceAbsent,
                  concentrationCommand: SlowSourceConcentrationEndRequired,
                } else {
                  occurrence: SlowOccurrenceActive({
                    source: active.source,
                    affectedTargets: remainingTargets,
                  }),
                  concentrationCommand: SlowSourceConcentrationUnchanged,
                }
              }
          }
    }

  pure def slowCleanupSignalMatchesOccurrence(
    state: SlowOccurrenceState,
    signal: SlowOccurrenceCleanupSignal
  ): bool =
    match signal {
      | SlowSourceConcentrationEnded(data) =>
          slowOccurrenceHasSource(state, data.source)
      | SlowDurationExpired(data) =>
          slowOccurrenceHasSource(state, data.source)
    }

  pure def applySlowOccurrenceCleanupSignal(
    state: SlowOccurrenceState,
    signal: SlowOccurrenceCleanupSignal
  ): SlowOccurrenceTransition =
    if (not(slowCleanupSignalMatchesOccurrence(state, signal))) {
      occurrence: state,
      concentrationCommand: SlowSourceConcentrationUnchanged,
    } else match signal {
      | SlowSourceConcentrationEnded(_) => {
          occurrence: SlowOccurrenceAbsent,
          concentrationCommand: SlowSourceConcentrationUnchanged,
        }
      | SlowDurationExpired(_) => {
          occurrence: SlowOccurrenceAbsent,
          concentrationCommand: SlowSourceConcentrationEndRequired,
        }
    }

  pure def slowEffectiveSpeed(
    state: SlowOccurrenceState,
    targetRef: SlowEntityRef,
    baseSpeed: int
  ): int =
    if (slowTargetAffected(state, targetRef))
      baseSpeed / 2
    else baseSpeed

  pure def slowEffectiveArmorClass(
    state: SlowOccurrenceState,
    targetRef: SlowEntityRef,
    baseArmorClass: int
  ): int =
    if (slowTargetAffected(state, targetRef))
      baseArmorClass + slowActivePenaltyProjection.armorClassDelta
    else baseArmorClass

  pure def slowDexteritySavingThrowDelta(
    state: SlowOccurrenceState,
    targetRef: SlowEntityRef
  ): int =
    if (slowTargetAffected(state, targetRef))
      slowActivePenaltyProjection.dexteritySavingThrowDelta
    else 0

  pure def slowTargetCanReact(
    state: SlowOccurrenceState,
    targetRef: SlowEntityRef
  ): bool =
    not(slowTargetAffected(state, targetRef))

  pure def beginSlowTargetTurn(
    state: SlowOccurrenceState,
    targetRef: SlowEntityRef
  ): SlowTargetTurnState =
    if (slowTargetAffected(state, targetRef))
      SlowTurnRestrictedUnused
    else SlowTurnUnrestricted

  pure def beginSlowTargetTurnAfterPriorAction(
    state: SlowOccurrenceState,
    targetRef: SlowEntityRef,
    priorActionKind: SlowTurnActionKind
  ): SlowTargetTurnState =
    if (not(slowTargetAffected(state, targetRef)))
      SlowTurnUnrestricted
    else SlowTurnRestrictedActionUsed({
      actionKind: priorActionKind,
      attackCount: 0,
    })

  pure def beginSlowTargetTurnAfterPriorBonusAction(
    state: SlowOccurrenceState,
    targetRef: SlowEntityRef
  ): SlowTargetTurnState =
    if (not(slowTargetAffected(state, targetRef)))
      SlowTurnUnrestricted
    else SlowTurnRestrictedBonusActionUsed

  pure def legalSlowTargetTurnState(state: SlowTargetTurnState): bool =
    match state {
      | SlowTurnUnrestricted => true
      | SlowTurnRestrictedUnused => true
      | SlowTurnRestrictedBonusActionUsed => true
      | SlowTurnRestrictedActionUsed(data) =>
          if (data.actionKind == SlowAttackAction)
            data.attackCount >= 0 and data.attackCount <= 1
          else data.attackCount == 0
    }

  pure def slowTurnCanSpendAction(state: SlowTargetTurnState): bool =
    match state {
      | SlowTurnUnrestricted => true
      | SlowTurnRestrictedUnused => true
      | SlowTurnRestrictedActionUsed(_) => false
      | SlowTurnRestrictedBonusActionUsed => false
    }

  pure def slowTurnCanSpendBonusAction(state: SlowTargetTurnState): bool =
    match state {
      | SlowTurnUnrestricted => true
      | SlowTurnRestrictedUnused => true
      | SlowTurnRestrictedActionUsed(_) => false
      | SlowTurnRestrictedBonusActionUsed => false
    }

  pure def slowTurnActionSpent(state: SlowTargetTurnState): bool =
    match state {
      | SlowTurnRestrictedActionUsed(_) => true
      | _ => false
    }

  pure def slowTurnBonusActionSpent(state: SlowTargetTurnState): bool =
    state == SlowTurnRestrictedBonusActionUsed

  pure def slowTurnDoesNotSpendBothActionAndBonusAction(
    state: SlowTargetTurnState
  ): bool =
    not(slowTurnActionSpent(state) and slowTurnBonusActionSpent(state))

  pure def canSpendSlowTurnAction(
    state: SlowTargetTurnState,
    actionKind: SlowTurnActionKind
  ): bool = all {
    state == SlowTurnRestrictedUnused,
    actionKind.in(Set(SlowAttackAction, SlowOtherAction)),
  }

  pure def applySlowTurnAction(
    state: SlowTargetTurnState,
    actionKind: SlowTurnActionKind
  ): SlowTargetTurnState =
    if (not(canSpendSlowTurnAction(state, actionKind))) state
    else SlowTurnRestrictedActionUsed({
      actionKind: actionKind,
      attackCount: 0,
    })

  pure def canSpendSlowTurnBonusAction(state: SlowTargetTurnState): bool =
    state == SlowTurnRestrictedUnused

  pure def applySlowTurnBonusAction(
    state: SlowTargetTurnState
  ): SlowTargetTurnState =
    if (not(canSpendSlowTurnBonusAction(state))) state
    else SlowTurnRestrictedBonusActionUsed

  pure def canMakeSlowAttackActionAttack(state: SlowTargetTurnState): bool =
    match state {
      | SlowTurnRestrictedActionUsed(data) => all {
          data.actionKind == SlowAttackAction,
          data.attackCount == 0,
        }
      | _ => false
    }

  pure def applySlowAttackActionAttack(
    state: SlowTargetTurnState
  ): SlowTargetTurnState =
    if (not(canMakeSlowAttackActionAttack(state))) state
    else SlowTurnRestrictedActionUsed({
      actionKind: SlowAttackAction,
      attackCount: 1,
    })

  pure def slowTurnAttackCount(state: SlowTargetTurnState): int =
    match state {
      | SlowTurnRestrictedActionUsed(data) => data.attackCount
      | _ => 0
    }

  pure def requestSlowSomaticResolution(
    state: SlowOccurrenceState,
    casterRef: SlowEntityRef,
    hasEffectiveSomaticComponent: bool
  ): SlowSomaticResolutionState =
    if (slowTargetAffected(state, casterRef) and hasEffectiveSomaticComponent)
      SlowSomaticFailureOutcomeRequired({
        failurePercent: slowSomaticFailurePercent,
      })
    else SlowSomaticSpellContinues

  pure def slowSomaticOutcomeRequired(
    state: SlowSomaticResolutionState
  ): bool =
    match state {
      | SlowSomaticFailureOutcomeRequired(_) => true
      | _ => false
    }

  pure def canResolveSlowSomaticFailureOutcome(
    state: SlowSomaticResolutionState
  ): bool = slowSomaticOutcomeRequired(state)

  pure def applySlowSomaticFailureOutcome(
    state: SlowSomaticResolutionState,
    outcome: SlowSomaticFailureOutcome
  ): SlowSomaticResolutionState =
    if (not(canResolveSlowSomaticFailureOutcome(state))) state
    else if (outcome == SlowSomaticSpellFailed)
      SlowSomaticSpellFailedAfterResourceSpend
    else SlowSomaticSpellContinues

  pure def slowSomaticFailureSpentCastResources(
    state: SlowSomaticResolutionState
  ): bool = state == SlowSomaticSpellFailedAfterResourceSpend

  pure def slowSomaticSpellEffectMayApply(
    state: SlowSomaticResolutionState
  ): bool = state == SlowSomaticSpellContinues

  pure def slowSomaticFailureStartsNewConcentration(
    state: SlowSomaticResolutionState
  ): bool = false
}
