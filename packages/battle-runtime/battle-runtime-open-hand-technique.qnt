// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.open-hand-technique
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module battleRuntimeOpenHandTechnique {
  // RAW anchors:
  // - Classes/Monk.md Level 3: Open Hand Technique.
  // - UBIQUITOUS_LANGUAGE.md: Opportunity Attack, Saving Throw, Prone.

  type OpenHandTechniqueChoice = OpenHandAddle | OpenHandPush | OpenHandTopple | OpenHandDecline
  type OpenHandTechniqueSave = OpenHandSaveSucceeded | OpenHandSaveFailed

  type OpenHandTechniqueState = {
    selectedProfile: bool,
    flurryHitWindow: bool,
    targetPresent: bool,
    targetOpportunityAttackDenied: bool,
    targetProne: bool,
    pushDistanceFeet: int,
    rejected: bool,
  }

  pure def initialOpenHandTechniqueState: OpenHandTechniqueState = {
    selectedProfile: true,
    flurryHitWindow: true,
    targetPresent: true,
    targetOpportunityAttackDenied: false,
    targetProne: false,
    pushDistanceFeet: 0,
    rejected: false,
  }

  pure def canUseOpenHandTechnique(state: OpenHandTechniqueState): bool =
    state.selectedProfile and state.flurryHitWindow and state.targetPresent

  pure def openHandTechniqueAfterHit(
    state: OpenHandTechniqueState,
    choice: OpenHandTechniqueChoice,
    save: OpenHandTechniqueSave,
    requestedPushDistanceFeet: int,
  ): OpenHandTechniqueState =
    if (not(canUseOpenHandTechnique(state)))
      { ...state, rejected: true }
    else
      match choice {
        | OpenHandDecline => state
        | OpenHandAddle => {
            ...state,
            targetOpportunityAttackDenied: true,
          }
        | OpenHandPush =>
            if (save == OpenHandSaveFailed)
              if (0 <= requestedPushDistanceFeet and requestedPushDistanceFeet <= 15)
                { ...state, pushDistanceFeet: requestedPushDistanceFeet }
              else
                { ...state, rejected: true }
            else
              state
        | OpenHandTopple =>
            if (save == OpenHandSaveFailed)
              { ...state, targetProne: true }
            else
              state
      }
}
