// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT

module battleRuntimeObserverSightGrant {
  pure def observerSightGrantRevealsInvisibleCreature(
    grantActive: bool,
    targetIsHidden: bool,
    targetHasInvisibleCondition: bool,
    targetInvisibleBenefitDenied: bool,
  ): bool =
    not(targetIsHidden) and (
      not(targetHasInvisibleCondition) or
      targetInvisibleBenefitDenied or
      grantActive
    )

  pure def observerSightGrantRevealsInvisibleObject(
    grantActive: bool,
    objectHasInvisibleCondition: bool,
    hasSightLine: bool,
    blockedByOpaqueCover: bool,
  ): bool =
    grantActive and
      objectHasInvisibleCondition and
      hasSightLine and
      not(blockedByOpaqueCover)

  pure def observerSightGrantRevealsOtherPlaneWitness(
    grantActive: bool,
    targetIsOnRevealedPlane: bool,
    hasSightLine: bool,
    blockedByOpaqueCover: bool,
  ): bool =
    grantActive and
      targetIsOnRevealedPlane and
      hasSightLine and
      not(blockedByOpaqueCover)
}
