// -*- mode: Bluespec; -*-

module battleRuntimeReactionSpellSelectedIdentityMbt {
  var qReactorHp: int
  var qTriggerCreatureHp: int
  var qReactorArmorClass: int
  var qReactorReactionAvailable: bool
  var qFirstLevelSlotsExpended: int
  var qSecondLevelSlotsExpended: int
  var qLastResult: str

  action recordProjection(
    reactorHp: int,
    triggerCreatureHp: int,
    reactorArmorClass: int,
    reactorReactionAvailable: bool,
    firstLevelSlotsExpended: int,
    secondLevelSlotsExpended: int,
    lastResult: str,
  ): bool = all {
    qReactorHp' = reactorHp,
    qTriggerCreatureHp' = triggerCreatureHp,
    qReactorArmorClass' = reactorArmorClass,
    qReactorReactionAvailable' = reactorReactionAvailable,
    qFirstLevelSlotsExpended' = firstLevelSlotsExpended,
    qSecondLevelSlotsExpended' = secondLevelSlotsExpended,
    qLastResult' = lastResult,
  }

  action init = recordProjection(12, 12, 10, true, 0, 0, "init")

  action doResolveShieldReactionSpellHit = all {
    qLastResult == "init",
    recordProjection(12, 12, 15, false, 1, 0, "resolved"),
  }

  action doResolveHellishRebukeFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(11, 9, 10, false, 0, 1, "resolved"),
  }

  action step = any {
    doResolveShieldReactionSpellHit,
    doResolveHellishRebukeFailedSavingThrow,
  }
}
