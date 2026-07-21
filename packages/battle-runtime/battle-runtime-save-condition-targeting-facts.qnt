// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-condition-save

module battleRuntimeSaveConditionTargetingFacts {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"

  pure def selectedTargetCount(fighterTargeted: bool, goblinTargeted: bool): int =
    (if (fighterTargeted) 1 else 0) + (if (goblinTargeted) 1 else 0)
  pure def saveGatedConditionSlotLevelIsLegal(invocation: SaveGatedConditionInvocation, slotLevel: int): bool =
    match saveGatedConditionTargeting(invocation) {
      | TargetListSaveTargets(data) => slotLevel >= data.baseSlotLevel
      | _ => true
    }
  pure def saveGatedConditionTargetCountIsLegal(
    invocation: SaveGatedConditionInvocation,
    slotLevel: int,
    fighterTargeted: bool,
    goblinTargeted: bool,
  ): bool = {
    val count = selectedTargetCount(fighterTargeted, goblinTargeted)
    val targeting = saveGatedConditionTargeting(invocation)
    val minTargets = match targeting {
      | TargetListSaveTargets(data) => data.minTargets
      | _ => 1
    }
    saveGatedConditionSlotLevelIsLegal(invocation, slotLevel) and
      count >= 1 and
      count >= minTargets and
      count <= saveGatedTargetMaxTargets(targeting, slotLevel)
  }
  type SaveGatedConditionHeightenedTarget =
    | NoSaveGatedConditionHeightenedTarget
    | HeightenedSaveGatedConditionTarget({ target: Actor })

  pure val noSaveGatedConditionHeightenedTarget = NoSaveGatedConditionHeightenedTarget
  pure def saveGatedConditionHeightenedRepeatSaveDisadvantage(
    heightenedTarget: SaveGatedConditionHeightenedTarget,
    targetActor: Actor,
  ): bool =
    match heightenedTarget {
      | HeightenedSaveGatedConditionTarget(data) => data.target == targetActor
      | NoSaveGatedConditionHeightenedTarget => false
    }
}
