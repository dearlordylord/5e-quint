// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP

module spellSlowStatBlockMultiattackCore {
  import spellSlowActivePenaltiesCore.* from "./spell-slow-active-penalties-core"
  import statBlockMultiattack.* from "./stat-block-multiattack"

  // RAW anchors:
  // - Spells/Descriptions-S-Z.md: Slow limits the affected creature to one
  //   attack when it takes the Attack action.
  // - Monsters/Overview.md: Multiattack details the attacks a creature makes
  //   as part of its Attack action.
  // - UBIQUITOUS_LANGUAGE.md: Action Lifecycle and Multiattack.
  //
  // Activation is the atomic boundary at which the Slow-derived dispatch
  // allowance is captured. The open dispatch continuation is an implementation
  // decomposition of that one Attack action, so this focused composition does
  // not model an effect-state rewrite midway through the Action.

  type SlowStatBlockMultiattackBinding = {
    sourceOwnerRef: SlowEntityRef,
    // Opaque source occurrence for this admitted Multiattack execution, not an
    // authored procedure id or presentation identity.
    multiattackProcedureExecutionRef: StatBlockProcedureRef,
  }

  type SlowStatBlockMultiattackProfile = {
    binding: SlowStatBlockMultiattackBinding,
    dispatchProfile: StatBlockMultiattackProfile,
  }

  type SlowStatBlockDispatchRequest = {
    binding: SlowStatBlockMultiattackBinding,
    attackProcedureRef: StatBlockProcedureRef,
  }

  type SlowStatBlockMultiattackState =
    | SlowStatBlockMultiattackReady
    | SlowStatBlockMultiattackActivated({
        binding: SlowStatBlockMultiattackBinding,
        dispatchState: StatBlockMultiattackState,
      })

  pure def initialSlowStatBlockMultiattackState:
    SlowStatBlockMultiattackState = SlowStatBlockMultiattackReady

  pure def legalSlowStatBlockMultiattackBinding(
    binding: SlowStatBlockMultiattackBinding
  ): bool = all {
    binding.sourceOwnerRef >= 0,
    binding.multiattackProcedureExecutionRef >= 0,
  }

  pure def legalSlowStatBlockMultiattackProfile(
    profile: SlowStatBlockMultiattackProfile
  ): bool = all {
    legalSlowStatBlockMultiattackBinding(profile.binding),
    legalStatBlockMultiattackProfile(profile.dispatchProfile),
  }

  pure def legalSlowStatBlockMultiattackState(
    state: SlowStatBlockMultiattackState
  ): bool =
    match state {
      | SlowStatBlockMultiattackReady => true
      | SlowStatBlockMultiattackActivated(active) => all {
          legalSlowStatBlockMultiattackBinding(active.binding),
          legalStatBlockMultiattackState(active.dispatchState),
          active.dispatchState != StatBlockMultiattackReadyToAct,
        }
    }

  pure def slowDerivedStatBlockDispatchAllowance(
    slowOccurrence: SlowOccurrenceState,
    sourceOwnerRef: SlowEntityRef
  ): StatBlockMultiattackDispatchAllowance =
    if (slowTargetAffected(slowOccurrence, sourceOwnerRef))
      OneListedDispatch
    else AllListedDispatches

  pure def canActivateSlowStatBlockMultiattack(
    state: SlowStatBlockMultiattackState,
    profile: SlowStatBlockMultiattackProfile
  ): bool = all {
    state == SlowStatBlockMultiattackReady,
    legalSlowStatBlockMultiattackProfile(profile),
  }

  pure def activateSlowStatBlockMultiattack(
    state: SlowStatBlockMultiattackState,
    slowOccurrence: SlowOccurrenceState,
    profile: SlowStatBlockMultiattackProfile
  ): SlowStatBlockMultiattackState =
    if (not(canActivateSlowStatBlockMultiattack(state, profile))) state
    else SlowStatBlockMultiattackActivated({
      binding: profile.binding,
      dispatchState: activateStatBlockMultiattack(
        initialStatBlockMultiattackState,
        profile.dispatchProfile,
        slowDerivedStatBlockDispatchAllowance(
          slowOccurrence,
          profile.binding.sourceOwnerRef
        ),
      ),
    })

  pure def slowStatBlockMultiattackSourceOwnerMatches(
    state: SlowStatBlockMultiattackState,
    sourceOwnerRef: SlowEntityRef
  ): bool =
    match state {
      | SlowStatBlockMultiattackReady => false
      | SlowStatBlockMultiattackActivated(active) =>
          active.binding.sourceOwnerRef == sourceOwnerRef
    }

  pure def slowStatBlockMultiattackProcedureExecutionMatches(
    state: SlowStatBlockMultiattackState,
    procedureExecutionRef: StatBlockProcedureRef
  ): bool =
    match state {
      | SlowStatBlockMultiattackReady => false
      | SlowStatBlockMultiattackActivated(active) =>
          active.binding.multiattackProcedureExecutionRef ==
            procedureExecutionRef
    }

  pure def slowStatBlockMultiattackHasBinding(
    state: SlowStatBlockMultiattackState,
    binding: SlowStatBlockMultiattackBinding
  ): bool = all {
    slowStatBlockMultiattackSourceOwnerMatches(
      state,
      binding.sourceOwnerRef
    ),
    slowStatBlockMultiattackProcedureExecutionMatches(
      state,
      binding.multiattackProcedureExecutionRef
    ),
  }

  pure def slowStatBlockMultiattackDispatchState(
    state: SlowStatBlockMultiattackState
  ): StatBlockMultiattackState =
    match state {
      | SlowStatBlockMultiattackReady => initialStatBlockMultiattackState
      | SlowStatBlockMultiattackActivated(active) => active.dispatchState
    }

  pure def slowStatBlockMultiattackPendingProcedureRefs(
    state: SlowStatBlockMultiattackState
  ): List[StatBlockProcedureRef] =
    statBlockMultiattackPendingProcedureRefs(
      slowStatBlockMultiattackDispatchState(state)
    )

  pure def slowStatBlockMultiattackDispatchResourceCount(
    state: SlowStatBlockMultiattackState
  ): int =
    statBlockMultiattackDispatchResourceCount(
      slowStatBlockMultiattackDispatchState(state)
    )

  pure def slowStatBlockMultiattackContinuationOpen(
    state: SlowStatBlockMultiattackState
  ): bool =
    statBlockMultiattackContinuationOpen(
      slowStatBlockMultiattackDispatchState(state)
    )

  pure def slowStatBlockMultiattackOneListedAllowanceActive(
    state: SlowStatBlockMultiattackState
  ): bool =
    match slowStatBlockMultiattackDispatchState(state) {
      | StatBlockMultiattackDispatching(active) =>
          active.allowance == OneListedDispatch
      | _ => false
    }

  pure def canResolveSlowStatBlockMultiattackDispatch(
    state: SlowStatBlockMultiattackState,
    request: SlowStatBlockDispatchRequest
  ): bool =
    match state {
      | SlowStatBlockMultiattackReady => false
      | SlowStatBlockMultiattackActivated(active) => all {
          active.binding == request.binding,
          multiattackDispatchSubjectPermitted(
            active.dispatchState,
            StatBlockDispatchProcedure({
              procedureRef: request.attackProcedureRef,
            })
          ),
          statBlockMultiattackContinuationOpen(active.dispatchState),
        }
    }

  pure def resolveSlowStatBlockMultiattackDispatch(
    state: SlowStatBlockMultiattackState,
    request: SlowStatBlockDispatchRequest
  ): SlowStatBlockMultiattackState =
    if (not(canResolveSlowStatBlockMultiattackDispatch(state, request))) state
    else match state {
      | SlowStatBlockMultiattackReady => state
      | SlowStatBlockMultiattackActivated(active) =>
          SlowStatBlockMultiattackActivated({
            binding: active.binding,
            dispatchState: resolveStatBlockMultiattackDispatch(
              active.dispatchState,
              request.attackProcedureRef
            ),
          })
    }

  pure def slowStatBlockMultiattackSubjectPermitted(
    state: SlowStatBlockMultiattackState,
    binding: SlowStatBlockMultiattackBinding,
    subject: StatBlockDispatchSubject
  ): bool =
    match state {
      | SlowStatBlockMultiattackReady => true
      | SlowStatBlockMultiattackActivated(active) => all {
          active.binding == binding,
          multiattackDispatchSubjectPermitted(active.dispatchState, subject),
        }
    }

  pure def endSlowStatBlockMultiattackTurn(
    state: SlowStatBlockMultiattackState
  ): SlowStatBlockMultiattackState =
    match state {
      | SlowStatBlockMultiattackReady => state
      | SlowStatBlockMultiattackActivated(active) =>
          SlowStatBlockMultiattackActivated({
            binding: active.binding,
            dispatchState: endStatBlockMultiattackTurn(active.dispatchState),
          })
    }
}
