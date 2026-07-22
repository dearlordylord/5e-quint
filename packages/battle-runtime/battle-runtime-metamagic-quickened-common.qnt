// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagicQuickenedCommon {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  type BattleRuntimeQuickenedMetamagicResult = {
    state: BattleState,
    sorceryPointsRemaining: int,
  }
  pure def quickenedActionSpellAdmission(
    state: BattleState,
    procedure: BattleRuntimeQuickenedActionSpellProcedure,
    hasMagicActionCastingTime: bool,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.contains(quickenedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(procedure, selectedOptions) and
    hasMagicActionCastingTime and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))
  pure def quickenedActionSpellResult(
    before: BattleState,
    resolvedAsMagicAction: BattleState,
    selectedCost: int,
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult =
    if (resolvedAsMagicAction != { ...before, actionAvailable: true }) {
      {
        state: commitActorQuickenedLevelOnePlusSpellCast({
          ...resolvedAsMagicAction,
          actionAvailable: before.actionAvailable,
          bonusActionAvailable: false,
        }, Fighter),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        state: before,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  pure def interruptedQuickenedActionSpellResult(
    before: BattleState,
    breaksExistingConcentration: bool,
    selectedCost: int,
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    state: commitActorQuickenedLevelOnePlusSpellCast({
      ...before,
      fighter: {
        ...before.fighter,
        concentrating: before.fighter.concentrating and not(breaksExistingConcentration),
      },
      bonusActionAvailable: false,
    }, Fighter),
    sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
  }
}
