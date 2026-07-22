// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagicQuickenedSpellAttack {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeMetamagicQuickenedCommon.* from "./battle-runtime-metamagic-quickened-common"
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def quickenedSpellCanModifySpellAttackDamage(
    state: BattleState,
    invocation: SpellAttackDamageInvocation,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    quickenedActionSpellAdmission(
      state,
      QuickenedSpellAttackProcedure,
      true,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
  pure def resolveQuickenedRayOfFrost(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifySpellAttackDamage(
      state,
      RayOfFrostSpellAttack,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    if (
      canModify and
      currentActor(state) == Fighter and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val resolvedAsMagicAction = resolveRayOfFrost(
        { ...state, actionAvailable: true },
        attackTotal,
        naturalD20,
        damageRoll,
        concentrationSaveSucceeded,
      )
      {
        state: commitActorQuickenedLevelOnePlusSpellCast({
          ...resolvedAsMagicAction,
          actionAvailable: state.actionAvailable,
          bonusActionAvailable: false,
        }, Fighter),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        state: state,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }
}
