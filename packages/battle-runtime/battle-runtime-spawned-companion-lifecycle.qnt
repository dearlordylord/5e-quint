// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE

module battleRuntimeSpawnedCompanionLifecycle {
  pure def spawnedCompanionIdentityAdmitted(
    ownerIsCompanion: bool,
    companionAlreadyOrdinaryCombatant: bool,
  ): bool =
    not(ownerIsCompanion) and not(companionAlreadyOrdinaryCombatant)

  pure def spawnedCompanionOrdinaryAttackAvailable(isPresentCompanion: bool, actionAvailable: bool): bool =
    not(isPresentCompanion) and actionAvailable

  pure def spawnedCompanionOpportunityAttackAvailable(isPresentCompanion: bool, reactionAvailable: bool): bool =
    not(isPresentCompanion) and reactionAvailable

  pure def spawnedCompanionConnectionAvailable(
    ownerMatches: bool,
    companionWithinRange: bool,
  ): bool =
    ownerMatches and companionWithinRange

  pure def spawnedCompanionSharedSensesAvailable(
    ownerMatches: bool,
    companionWithinRange: bool,
    bonusActionAvailable: bool,
  ): bool =
    spawnedCompanionConnectionAvailable(ownerMatches, companionWithinRange) and bonusActionAvailable

  pure def spawnedCompanionTouchDeliveryAvailable(
    ownerMatches: bool,
    spellHasTouchRange: bool,
    companionWithinRange: bool,
    companionReactionAvailable: bool,
  ): bool =
    ownerMatches and spellHasTouchRange and companionWithinRange and companionReactionAvailable

  pure def spawnedCompanionGrantedReactionAttackAvailable(
    ownerMatches: bool,
    featureSelected: bool,
    ownerAttackAvailable: bool,
    companionReactionAvailable: bool,
    companionAttackSupported: bool,
  ): bool =
    ownerMatches and featureSelected and ownerAttackAvailable and companionReactionAvailable and companionAttackSupported
}
