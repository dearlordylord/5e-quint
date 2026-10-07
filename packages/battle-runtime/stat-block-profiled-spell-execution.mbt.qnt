module statBlockProfiledSpellExecutionMbt {
  // monsters.md Spellcasting: a spell in an Actions/Bonus Actions section uses
  // that action economy. spells.md False Life: 2d4+4 Temporary Hit Points.
  // The literal rolls 3 and 4 produce 11; rejected repeated casts change nothing.
  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qTemporaryHitPoints: int
  var qAdmitted: bool
  action init = all {
    qActionAvailable' = true,
    qBonusActionAvailable' = true,
    qTemporaryHitPoints' = 0,
    qAdmitted' = true,
  }
  action doActionCast = all {
    qActionAvailable' = false,
    qBonusActionAvailable' = true,
    qTemporaryHitPoints' = 3 + 4 + 4,
    qAdmitted' = true,
  }
  action doBonusCast = all {
    qActionAvailable' = true,
    qBonusActionAvailable' = false,
    qTemporaryHitPoints' = 3 + 4 + 4,
    qAdmitted' = true,
  }
  action doRejectSpentAction = all {
    qActionAvailable' = false,
    qBonusActionAvailable' = true,
    qTemporaryHitPoints' = 11,
    qAdmitted' = false,
  }
  action doRejectSpentBonus = all {
    qActionAvailable' = true,
    qBonusActionAvailable' = false,
    qTemporaryHitPoints' = 11,
    qAdmitted' = false,
  }
  action step = any {doActionCast, doBonusCast, doRejectSpentAction, doRejectSpentBonus}
}
