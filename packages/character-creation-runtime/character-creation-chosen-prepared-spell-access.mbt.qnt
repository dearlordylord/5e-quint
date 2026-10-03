// Literal replay bridge; rule authority is rule-core/chosen-prepared-spell-access.qnt.
module characterCreationChosenPreparedSpellAccessMbt {
  var qState: { selected: Set[int], phase: int, accepted: bool }
  action init = qState' = { selected: Set(), phase: 0, accepted: true }
  action gainPair = all { qState.phase == 0, qState' = { selected: Set(1,2), phase: 1, accepted: true } }
  action replaceOne = all { qState.phase == 2, qState' = { selected: Set(1,3), phase: 3, accepted: true } }
  action rejectTwo = all { qState.phase == 1, qState' = { selected: Set(1,2), phase: 2, accepted: false } }
  action step = any { gainPair, replaceOne, rejectTwo }
}
