module statBlockAtWillSpellcastingGroupMbt {
  // Literal projection witness for the at-will action-cost laws exercised by
  // rule-core/stat-block-at-will-spellcasting-group-examples.qnt. No pool exists.
  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qAdmitted: bool

  action init = all {
    qActionAvailable' = true,
    qBonusActionAvailable' = true,
    qAdmitted' = true,
  }
  action doActionCast = all {
    qActionAvailable' = false,
    qBonusActionAvailable' = true,
    qAdmitted' = true,
  }
  action doBonusCast = all {
    qActionAvailable' = true,
    qBonusActionAvailable' = false,
    qAdmitted' = true,
  }
  action doRejectSpentAction = all {
    qActionAvailable' = false,
    qBonusActionAvailable' = true,
    qAdmitted' = false,
  }
  action doRejectSpentBonus = all {
    qActionAvailable' = true,
    qBonusActionAvailable' = false,
    qAdmitted' = false,
  }
  action step = any {
    doActionCast,
    doBonusCast,
    doRejectSpentAction,
    doRejectSpentBonus,
  }
}
