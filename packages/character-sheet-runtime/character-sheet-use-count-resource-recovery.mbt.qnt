// KERNEL-COVERAGE: qnt-owner SHEET.FEATURE_RESOURCES.TRANSITIONS
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.use-count-resource-recovery
module characterSheetUseCountResourceRecoveryMbt {
  var qState: { useExpended: int, slotExpended: int, phase: int }
  action init = qState' = { useExpended: 2, slotExpended: 0, phase: 0 }
  action exchange = all {
    qState.phase == 0,
    qState' = { useExpended: 1, slotExpended: 1, phase: 1 },
  }
  action shortRest = all {
    qState.phase == 1,
    qState' = { useExpended: 0, slotExpended: 1, phase: 2 },
  }
  action step = any { exchange, shortRest }
}
