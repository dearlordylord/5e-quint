// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-save-gated-condition-immunity
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagicQuickenedSaveEffectsTests {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeMetamagicQuickenedSaveCondition.* from "./battle-runtime-metamagic-quickened-save-condition"
  import battleRuntimeMetamagicQuickenedCommon.* from "./battle-runtime-metamagic-quickened-common"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeMetamagicQuickenedConditionImmunity.* from "./battle-runtime-metamagic-quickened-condition-immunity"
  import battleRuntimeMetamagicQuickenedDirectCondition.* from "./battle-runtime-metamagic-quickened-direct-condition"
  import battleRuntimeMetamagicQuickenedSaveDamage.* from "./battle-runtime-metamagic-quickened-save-damage"

  run test_metamagic_quickened_save_effects = all {
    {
      val result = resolveQuickenedBurningHands(
        initialState,
        true,
        false,
        9,
        true,
        true,
        Set(quickenedSpellMetamagicFact),
        Set(quickenedSpellMetamagicFact),
        4,
      )
      all {
        assert(result.state.fighter.hp == 8),
        assert(result.state.goblin.hp == 1),
        assert(result.state.actionAvailable),
        assert(not(result.state.bonusActionAvailable)),
        assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
        assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
        assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
        assert(result.sorceryPointsRemaining == 2),
      }
    },
    {
        val result = resolveQuickenedCalmEmotions(initialState, true, false, false, true, Set(quickenedSpellMetamagicFact), Set(quickenedSpellMetamagicFact), 4)
        all {
          assert(result.state.fighter.activeEffects.contains(CalmEmotionsCharmedImmunity)),
          assert(result.state.fighter.activeEffects.contains(CalmEmotionsFrightenedImmunity)),
          assert(not(result.state.goblin.activeEffects.contains(CalmEmotionsCharmedImmunity))),
          assert(result.state.fighter.concentrating),
          assert(result.state.actionAvailable),
          assert(not(result.state.bonusActionAvailable)),
          assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
          assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(result.sorceryPointsRemaining == 2),
        }
      },
    {
        val result = resolveQuickenedInvisibility(initialState, Set(Goblin), 2, Set(quickenedSpellMetamagicFact), Set(quickenedSpellMetamagicFact), 4)
        all {
          assert(result.state.goblin.activeEffects.contains(InvisibilityCondition({ source: Fighter, durationTicks: 600 }))),
          assert(not(result.state.fighter.activeEffects.contains(InvisibilityCondition({ source: Fighter, durationTicks: 600 })))),
          assert(result.state.fighter.concentrating),
          assert(result.state.actionAvailable),
          assert(not(result.state.bonusActionAvailable)),
          assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
          assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(result.sorceryPointsRemaining == 2),
        }
      },
    {
        val result = resolveQuickenedColorSpray(
          initialState,
          false,
          true,
          Set(quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          4,
        )
        all {
          assert(result.state.fighter.activeEffects.contains(ColorSprayBlinded({
            source: Fighter,
            expiresAtRound: 2,
          }))),
          assert(not(result.state.goblin.activeEffects.contains(ColorSprayBlinded({
            source: Fighter,
            expiresAtRound: 2,
          })))),
          assert(result.state.actionAvailable),
          assert(not(result.state.bonusActionAvailable)),
          assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
          assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(result.sorceryPointsRemaining == 2),
        }
      },
    {
        all {
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedSaveGatedDamageProcedure,
            Set(quickenedSpellMetamagicFact),
          )),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedSpellAttackProcedure,
            Set(quickenedSpellMetamagicFact),
          )),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedSaveGatedConditionProcedure,
            Set(quickenedSpellMetamagicFact),
          )),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedSaveGatedConditionImmunityProcedure,
            Set(quickenedSpellMetamagicFact),
          )),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedDirectConditionProcedure,
            Set(quickenedSpellMetamagicFact),
          )),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedRollModifierProcedure,
            Set(quickenedSpellMetamagicFact),
          )),
          assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedDamageProcedure,
            Set(quickenedSpellMetamagicFact),
          ))),
          assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedControlProcedure,
            Set(quickenedSpellMetamagicFact),
          ))),
          assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedOngoingEffectProcedure,
            Set(quickenedSpellMetamagicFact),
          ))),
          assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
            QuickenedOtherActionProcedure,
            Set(quickenedSpellMetamagicFact),
          ))),
        }
      },
  }
}
