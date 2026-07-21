// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagicQuickenedRestorationBuffs {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeMetamagicQuickenedCommon.* from "./battle-runtime-metamagic-quickened-common"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def quickenedSpellCanModifyDirectRestoration(
    state: BattleState,
    invocation: DirectHitPointRestorationSpell,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    quickenedActionSpellAdmission(
      state,
      QuickenedDirectRestorationProcedure,
      directHitPointRestorationActionCost(invocation) == SpellMagicAction,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
  pure def quickenedSpellCanModifyScalarBuff(
    state: BattleState,
    invocation: ScalarBuffSpell,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    quickenedActionSpellAdmission(
      state,
      QuickenedScalarBuffProcedure,
      scalarBuffActionCost(invocation) == SpellMagicAction,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
  pure def resolveQuickenedDirectHitPointRestoration(
    state: BattleState,
    invocation: DirectHitPointRestorationSpell,
    targetCount: int,
    healingRoll: int,
    spellcastingAbilityModifier: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifyDirectRestoration(
      state,
      invocation,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val validTargetCount =
      targetCount >= 1 and targetCount <= directHitPointRestorationMaximumTargets(invocation)
    if (
      currentActor(state) == Fighter and
      canModify and
      validTargetCount and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val healed = applyHealing(
        state.fighter,
        directHitPointRestorationHealing(healingRoll, spellcastingAbilityModifier),
      )
      {
        state: commitActorQuickenedLevelOnePlusSpellCast(commitActorSpellSlotUse({
          ...spendFighterSpellActionCost(state, SpellBonusAction).state,
          fighter: healed,
        }, Fighter), Fighter),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        state: state,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }
  pure def resolveQuickenedScalarBuffSpell(
    state: BattleState,
    invocation: ScalarBuffSpell,
    targets: Set[Actor],
    knownWillingTargets: Set[Actor],
    slotLevel: int,
    rolledDice: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifyScalarBuff(
      state,
      invocation,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val resolved =
      if (canModify)
        resolveScalarBuffSpellWithActionCost(
          state,
          invocation,
          SpellBonusAction,
          targets,
          knownWillingTargets,
          slotLevel,
          rolledDice,
        )
      else {
        state: state,
        admitted: false,
      }
    if (canModify and resolved.admitted) {
      {
        state: commitActorQuickenedLevelOnePlusSpellCast(resolved.state, Fighter),
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
