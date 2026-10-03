// Literal parity bridge for rule-core/granted-choice-selection.qnt.
module characterCreationGrantedProficiencyChoiceMbt {
  var qState: { classLevel: int, addedSkillCount: int, accepted: bool, phase: int }
  action init = qState' = { classLevel: 2, addedSkillCount: 0, accepted: true, phase: 0 }
  action rejectDuplicate = all { qState.phase == 0, qState' = { classLevel: 2, addedSkillCount: 0, accepted: false, phase: 1 } }
  action gainThree = all { qState.phase == 1, qState' = { classLevel: 3, addedSkillCount: 3, accepted: true, phase: 2 } }
  action step = any { rejectDuplicate, gainThree }
}
