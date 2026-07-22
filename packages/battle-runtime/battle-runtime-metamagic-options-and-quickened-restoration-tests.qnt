// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-range-increase
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-damage-dice-reroll
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-missed-spell-attack-reroll
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-component-suppression
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-effective-level-extra-target
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagicOptionAndQuickenedRestorationTests {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import battleRuntimeMetamagicDistant.* from "./battle-runtime-metamagic-distant"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMetamagicEmpowered.* from "./battle-runtime-metamagic-empowered"
  import battleRuntimeMetamagicExtended.* from "./battle-runtime-metamagic-extended"
  import battleRuntimeMetamagicCareful.* from "./battle-runtime-metamagic-careful"
  import battleRuntimeMetamagicHeightened.* from "./battle-runtime-metamagic-heightened"
  import battleRuntimeMetamagicSaveCommon.* from "./battle-runtime-metamagic-save-common"
  import battleRuntimeMetamagicSeeking.* from "./battle-runtime-metamagic-seeking"
  import battleRuntimeMetamagicSubtle.* from "./battle-runtime-metamagic-subtle"
  import battleRuntimeMetamagicTransmuted.* from "./battle-runtime-metamagic-transmuted"
  import battleRuntimeMetamagicTwinned.* from "./battle-runtime-metamagic-twinned"
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeMetamagicQuickenedCommon.* from "./battle-runtime-metamagic-quickened-common"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeMetamagicQuickenedRestorationBuffs.* from "./battle-runtime-metamagic-quickened-restoration-buffs"
  import battleRuntimeMetamagicQuickenedRollModifier.* from "./battle-runtime-metamagic-quickened-roll-modifier"

  pure val empoweredDamageDieSize = 8
  pure val empoweredOriginalDamageDice: int -> int = Map(8 -> 2)
  pure val empoweredOverLimitOriginalDamageDice: int -> int =
    Map(4 -> 1, 3 -> 1, 2 -> 1, 1 -> 1)
  pure val empoweredSingleDamageReroll: BattleRuntimeEmpoweredSpellDamageDieReroll -> int =
    Map({ original: 8, replacement: 1 } -> 1)
  pure val empoweredDuplicateDamageRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int =
    Map({ original: 8, replacement: 1 } -> 2)
  pure val empoweredOverLimitDamageRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int =
    Map(
      { original: 4, replacement: 1 } -> 1,
      { original: 3, replacement: 1 } -> 1,
      { original: 2, replacement: 1 } -> 1,
      { original: 1, replacement: 1 } -> 1,
    )
  pure val empoweredInvalidReplacementDamageReroll: BattleRuntimeEmpoweredSpellDamageDieReroll -> int =
    Map({ original: 8, replacement: -1 } -> 1)
  pure val empoweredAbsentOriginalDamageReroll: BattleRuntimeEmpoweredSpellDamageDieReroll -> int =
    Map({ original: 7, replacement: 1 } -> 1)
  pure val empoweredOverselectedDuplicateDamageRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int =
    Map({ original: 8, replacement: 1 } -> 3)
  pure val empoweredEmptyDamageRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int = Map()

  run test_metamagic_options_and_quickened_restoration = all {
    {
        val known = Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact, heightenedSpellMetamagicFact)
        val priorSpell = commitActorLevelOnePlusSpellCast(initialState, Fighter)
        all {
          assert(quickenedActionSpellAdmission(initialState, QuickenedDirectRestorationProcedure, true, known, Set(quickenedSpellMetamagicFact), 2)),
          assert(not(quickenedActionSpellAdmission(initialState, QuickenedDirectRestorationProcedure, false, known, Set(quickenedSpellMetamagicFact), 2))),
          assert(not(quickenedActionSpellAdmission({ ...initialState, bonusActionAvailable: false }, QuickenedDirectRestorationProcedure, true, known, Set(quickenedSpellMetamagicFact), 2))),
          assert(not(quickenedActionSpellAdmission(priorSpell, QuickenedDirectRestorationProcedure, true, known, Set(quickenedSpellMetamagicFact), 2))),
          assert(not(quickenedActionSpellAdmission(initialState, QuickenedDirectRestorationProcedure, true, known, Set(quickenedSpellMetamagicFact), 1))),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedSaveGatedDamageProcedure, Set(quickenedSpellMetamagicFact))),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedSpellAttackProcedure, Set(quickenedSpellMetamagicFact))),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedSaveGatedConditionProcedure, Set(quickenedSpellMetamagicFact))),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedSaveGatedConditionImmunityProcedure, Set(quickenedSpellMetamagicFact))),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedDirectConditionProcedure, Set(quickenedSpellMetamagicFact))),
          assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedRollModifierProcedure, Set(quickenedSpellMetamagicFact))),
          assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedOtherActionProcedure, Set(quickenedSpellMetamagicFact)))),
        }
      },
    {
        val known = Set(distantSpellMetamagicFact)
        val touchResult = resolveDistantSpellRangeProjection(
          DistantRangeBearingTargetProcedure,
          SpellRangeTouch,
          known,
          Set(distantSpellMetamagicFact),
          2,
        )
        val distanceResult = resolveDistantSpellRangeProjection(
          DistantRangeBearingTargetProcedure,
          SpellRangeFeet({ feet: 60 }),
          known,
          Set(distantSpellMetamagicFact),
          2,
        )
        all {
          assert(touchResult == { rangeFeet: 30, sorceryPointsRemaining: 1 }),
          assert(distanceResult == { rangeFeet: 120, sorceryPointsRemaining: 1 }),
        }
      },
    {
        val known = Set(distantSpellMetamagicFact)
        all {
          assert(not(distantSpellCanModifyRangeSpell(
            DistantRangeBearingTargetProcedure,
            SpellRangeSelf,
            known,
            Set(distantSpellMetamagicFact),
            1,
          ))),
          assert(not(distantSpellCanModifyRangeSpell(
            DistantRangeBearingTargetProcedure,
            SpellRangeFeet({ feet: 4 }),
            known,
            Set(distantSpellMetamagicFact),
            1,
          ))),
          assert(not(distantSpellCanModifyRangeSpell(
            NonDistantRangeProcedure,
            SpellRangeTouch,
            known,
            Set(distantSpellMetamagicFact),
            1,
          ))),
          assert(not(distantSpellCanModifyRangeSpell(
            DistantRangeBearingTargetProcedure,
            SpellRangeTouch,
            known,
            Set(distantSpellMetamagicFact),
            0,
          ))),
        }
      },
    {
        val result = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredDuplicateDamageRerolls,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(),
          4,
        )
        all {
          assert(result.finalDamageTotal == 2),
          assert(result.selectedDice == 2),
          assert(result.sorceryPointsRemaining == 3),
        }
      },
    {
        val unknown = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredSingleDamageReroll,
          3,
          Set(quickenedSpellMetamagicFact),
          Set(),
          4,
        )
        val unaffordable = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredSingleDamageReroll,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(),
          0,
        )
        val repeatedAttackSequence = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackSequenceProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredSingleDamageReroll,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(),
          4,
        )
        val nonDamageOwner = resolveEmpoweredSpellDamageReroll(
          NonEmpoweredSpellDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredSingleDamageReroll,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(),
          4,
        )
        val overLimit = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOverLimitOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredOverLimitDamageRerolls,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(),
          4,
        )
        val zeroSelected = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredEmptyDamageRerolls,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(),
          4,
        )
        val invalidReplacement = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredInvalidReplacementDamageReroll,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(),
          4,
        )
        val absentOriginal = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredAbsentOriginalDamageReroll,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(),
          4,
        )
        val overselectedDuplicate = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredOverselectedDuplicateDamageRerolls,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(),
          4,
        )
        all {
          assert(unknown.finalDamageTotal == 16),
          assert(unknown.sorceryPointsRemaining == 4),
          assert(unaffordable.finalDamageTotal == 16),
          assert(unaffordable.sorceryPointsRemaining == 0),
          assert(repeatedAttackSequence.finalDamageTotal == 16),
          assert(repeatedAttackSequence.sorceryPointsRemaining == 4),
          assert(nonDamageOwner.finalDamageTotal == 16),
          assert(nonDamageOwner.sorceryPointsRemaining == 4),
          assert(overLimit.finalDamageTotal == 10),
          assert(overLimit.selectedDice == 0),
          assert(overLimit.sorceryPointsRemaining == 4),
          assert(zeroSelected.finalDamageTotal == 16),
          assert(zeroSelected.selectedDice == 0),
          assert(zeroSelected.sorceryPointsRemaining == 4),
          assert(invalidReplacement.finalDamageTotal == 16),
          assert(invalidReplacement.selectedDice == 0),
          assert(invalidReplacement.sorceryPointsRemaining == 4),
          assert(absentOriginal.finalDamageTotal == 16),
          assert(absentOriginal.selectedDice == 0),
          assert(absentOriginal.sorceryPointsRemaining == 4),
          assert(overselectedDuplicate.finalDamageTotal == 16),
          assert(overselectedDuplicate.selectedDice == 0),
          assert(overselectedDuplicate.sorceryPointsRemaining == 4),
        }
      },
    {
        val quickenedCast = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredSingleDamageReroll,
          3,
          Set(empoweredSpellMetamagicFact, quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          4,
        )
        val empoweredAlreadyCast = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredSingleDamageReroll,
          3,
          Set(empoweredSpellMetamagicFact),
          Set(empoweredSpellMetamagicFact),
          4,
        )
        val twoCastMetamagics = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredSingleDamageReroll,
          3,
          Set(empoweredSpellMetamagicFact, quickenedSpellMetamagicFact, seekingSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact, seekingSpellMetamagicFact),
          4,
        )
        val quickenedCastCombinedUnaffordable = resolveEmpoweredSpellDamageReroll(
          EmpoweredSpellAttackDamageProcedure,
          empoweredOriginalDamageDice,
          empoweredDamageDieSize,
          empoweredSingleDamageReroll,
          3,
          Set(empoweredSpellMetamagicFact, quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          2,
        )
        all {
          assert(quickenedCast.finalDamageTotal == 9),
          assert(quickenedCast.sorceryPointsRemaining == 1),
          assert(empoweredAlreadyCast.finalDamageTotal == 16),
          assert(empoweredAlreadyCast.sorceryPointsRemaining == 4),
          assert(twoCastMetamagics.finalDamageTotal == 16),
          assert(twoCastMetamagics.sorceryPointsRemaining == 4),
          assert(quickenedCastCombinedUnaffordable.finalDamageTotal == 16),
          assert(quickenedCastCombinedUnaffordable.sorceryPointsRemaining == 2),
        }
      },
    {
        val known = Set(extendedSpellMetamagicFact)
        val timedResult = resolveExtendedSpellDurationProjection(
          ExtendedDurationBearingProcedure,
          SpellTimedDurationTicks({ durationTicks: 600 }),
          known,
          Set(extendedSpellMetamagicFact),
          2,
        )
        val concentrationResult = resolveExtendedSpellDurationProjection(
          ExtendedDurationBearingProcedure,
          SpellConcentrationDurationTicks({ durationTicks: 10 }),
          known,
          Set(extendedSpellMetamagicFact),
          2,
        )
        all {
          assert(timedResult == {
            durationTicks: 1200,
            concentrationSavingThrowMode: NormalSavingThrow,
            sorceryPointsRemaining: 1,
          }),
          assert(concentrationResult == {
            durationTicks: 20,
            concentrationSavingThrowMode: AdvantageSavingThrow,
            sorceryPointsRemaining: 1,
          }),
        }
      },
    {
        val known = Set(extendedSpellMetamagicFact)
        val capped = resolveExtendedSpellDurationProjection(
          ExtendedDurationBearingProcedure,
          SpellTimedDurationTicks({ durationTicks: 10000 }),
          known,
          Set(extendedSpellMetamagicFact),
          2,
        )
        all {
          assert(capped.durationTicks == 14400),
          assert(not(extendedSpellCanModifyDurationSpell(
            ExtendedDurationBearingProcedure,
            SpellTimedDurationTicks({ durationTicks: 9 }),
            known,
            Set(extendedSpellMetamagicFact),
            1,
          ))),
          assert(not(extendedSpellCanModifyDurationSpell(
            ExtendedDurationBearingProcedure,
            SpellInstantaneousDuration,
            known,
            Set(extendedSpellMetamagicFact),
            1,
          ))),
          assert(not(extendedSpellCanModifyDurationSpell(
            NonExtendedDurationProcedure,
            SpellConcentrationDurationTicks({ durationTicks: 10 }),
            known,
            Set(extendedSpellMetamagicFact),
            1,
          ))),
          assert(not(extendedSpellCanModifyDurationSpell(
            ExtendedDurationBearingProcedure,
            SpellConcentrationDurationTicks({ durationTicks: 10 }),
            known,
            Set(extendedSpellMetamagicFact),
            0,
          ))),
        }
      },
    {
        val known = Set(carefulSpellMetamagicFact, heightenedSpellMetamagicFact)
        all {
          assert(carefulSpellCanModifySaveSpell(
            SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
            known,
            Set(carefulSpellMetamagicFact),
            1,
          )),
          assert(heightenedSpellCanModifySaveSpell(
            SaveGatedNonDamageProcedure,
            known,
            Set(heightenedSpellMetamagicFact),
            2,
          )),
          assert(not(heightenedSpellCanModifySaveSpell(
            SleepTargetAdmissionProcedure,
            known,
            Set(heightenedSpellMetamagicFact),
            2,
          ))),
          assert(not(carefulSpellCanModifySaveSpell(
            SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
            known,
            Set(carefulSpellMetamagicFact, heightenedSpellMetamagicFact),
            3,
          ))),
          assert(not(heightenedSpellCanModifySaveSpell(
            SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
            Set(carefulSpellMetamagicFact),
            Set(heightenedSpellMetamagicFact),
            2,
          ))),
        }
      },
    {
        val targets = Set(Fighter, Goblin)
        all {
          assert(carefulSpellProtectedTargetSelectionValid(targets, Set(Fighter), 3)),
          assert(carefulSpellProtectedTargetSelectionValid(targets, Set(Fighter), 0)),
          assert(not(carefulSpellProtectedTargetSelectionValid(targets, Set(Fighter, Goblin), 1))),
          assert(not(carefulSpellProtectedTargetSelectionValid(targets, Set(), 3))),
          assert(heightenedSpellTargetSelectionValid(targets, Goblin)),
          assert(not(heightenedSpellTargetSelectionValid(Set(Fighter), Goblin))),
          assert(savingThrowRollModeWithHeightenedSpell(
            NormalSavingThrow,
            Set(heightenedSpellMetamagicFact),
            Goblin,
            Goblin,
          ) == DisadvantageSavingThrow),
          assert(savingThrowRollModeWithHeightenedSpell(
            NormalSavingThrow,
            Set(heightenedSpellMetamagicFact),
            Fighter,
            Goblin,
          ) == NormalSavingThrow),
          assert(savingThrowRollModeWithHeightenedSpell(
            AdvantageSavingThrow,
            Set(heightenedSpellMetamagicFact),
            Goblin,
            Goblin,
          ) == NormalSavingThrow),
          assert(carefulSpellSuppressesSuccessfulHalfDamage(
            SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
            Set(carefulSpellMetamagicFact),
            Set(Fighter),
            Fighter,
            true,
          )),
          assert(not(carefulSpellSuppressesSuccessfulHalfDamage(
            SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
            Set(carefulSpellMetamagicFact),
            Set(Fighter),
            Fighter,
            false,
          ))),
          assert(not(carefulSpellSuppressesSuccessfulHalfDamage(
            SaveGatedDamageProcedure({ success: NoDamageOnSaveSuccess }),
            Set(carefulSpellMetamagicFact),
            Set(Fighter),
            Fighter,
            true,
          ))),
        }
      },
    {
        val result = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          15,
          10,
          13,
          Set(seekingSpellMetamagicFact),
          Set(),
          4,
        )
        all {
          assert(result.finalTotal == 15),
          assert(result.finalNaturalD20 == 10),
          assert(result.hit),
          assert(not(result.critical)),
          assert(result.sorceryPointsRemaining == 3),
        }
      },
    {
        val replacementMiss = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          7,
          4,
          13,
          Set(seekingSpellMetamagicFact),
          Set(),
          4,
        )
        val naturalOne = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          30,
          1,
          13,
          Set(seekingSpellMetamagicFact),
          Set(),
          4,
        )
        all {
          assert(not(replacementMiss.hit)),
          assert(not(replacementMiss.critical)),
          assert(replacementMiss.sorceryPointsRemaining == 3),
          assert(not(naturalOne.hit)),
          assert(not(naturalOne.critical)),
          assert(naturalOne.sorceryPointsRemaining == 3),
        }
      },
    {
        val result = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          20,
          20,
          30,
          Set(seekingSpellMetamagicFact),
          Set(),
          4,
        )
        all {
          assert(result.hit),
          assert(result.critical),
          assert(result.sorceryPointsRemaining == 3),
        }
      },
    {
        val originalHit = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          15,
          10,
          5,
          2,
          13,
          Set(seekingSpellMetamagicFact),
          Set(),
          4,
        )
        val unknown = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          15,
          10,
          13,
          Set(quickenedSpellMetamagicFact),
          Set(),
          4,
        )
        val unaffordable = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          15,
          10,
          13,
          Set(seekingSpellMetamagicFact),
          Set(),
          0,
        )
        val repeatedAttackSequence = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackSequenceProcedure,
          5,
          2,
          15,
          10,
          13,
          Set(seekingSpellMetamagicFact),
          Set(),
          4,
        )
        all {
          assert(originalHit.finalTotal == 15),
          assert(originalHit.sorceryPointsRemaining == 4),
          assert(unknown.finalTotal == 5),
          assert(unknown.sorceryPointsRemaining == 4),
          assert(unaffordable.finalTotal == 5),
          assert(unaffordable.sorceryPointsRemaining == 0),
          assert(repeatedAttackSequence.finalTotal == 5),
          assert(repeatedAttackSequence.sorceryPointsRemaining == 4),
        }
      },
    {
        val quickenedCast = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          15,
          10,
          13,
          Set(seekingSpellMetamagicFact, quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          4,
        )
        val seekingAlreadyCast = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          15,
          10,
          13,
          Set(seekingSpellMetamagicFact),
          Set(seekingSpellMetamagicFact),
          4,
        )
        val twoCastMetamagics = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          15,
          10,
          13,
          Set(seekingSpellMetamagicFact, quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
          4,
        )
        val quickenedCastCombinedUnaffordable = resolveSeekingSpellAttackReroll(
          SeekingSpellAttackDamageProcedure,
          5,
          2,
          15,
          10,
          13,
          Set(seekingSpellMetamagicFact, quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          2,
        )
        all {
          assert(quickenedCast.hit),
          assert(quickenedCast.sorceryPointsRemaining == 1),
          assert(seekingAlreadyCast.finalTotal == 5),
          assert(seekingAlreadyCast.sorceryPointsRemaining == 4),
          assert(twoCastMetamagics.finalTotal == 5),
          assert(twoCastMetamagics.sorceryPointsRemaining == 4),
          assert(quickenedCastCombinedUnaffordable.finalTotal == 5),
          assert(quickenedCastCombinedUnaffordable.sorceryPointsRemaining == 2),
        }
      },
    {
        val known = Set(subtleSpellMetamagicFact)
        val verbalSomatic = resolveSubtleSpellComponentProjection(
          { verbal: true, somatic: true, material: NoMaterialComponent },
          known,
          Set(subtleSpellMetamagicFact),
          2,
        )
        val focusReplaceableMaterial = resolveSubtleSpellComponentProjection(
          { verbal: true, somatic: true, material: FocusReplaceableMaterialComponent },
          known,
          Set(subtleSpellMetamagicFact),
          2,
        )
        all {
          assert(verbalSomatic == {
            verbalSuppressed: true,
            somaticSuppressed: true,
            materialSuppressed: false,
            materialPreserved: false,
            sorceryPointsRemaining: 1,
          }),
          assert(focusReplaceableMaterial == {
            verbalSuppressed: true,
            somaticSuppressed: true,
            materialSuppressed: true,
            materialPreserved: false,
            sorceryPointsRemaining: 1,
          }),
        }
      },
    {
        val known = Set(subtleSpellMetamagicFact)
        val priced = resolveSubtleSpellComponentProjection(
          { verbal: true, somatic: true, material: PricedMaterialComponent },
          known,
          Set(subtleSpellMetamagicFact),
          2,
        )
        val consumed = resolveSubtleSpellComponentProjection(
          { verbal: true, somatic: true, material: ConsumedMaterialComponent },
          known,
          Set(subtleSpellMetamagicFact),
          2,
        )
        val consumedPriced = resolveSubtleSpellComponentProjection(
          { verbal: false, somatic: false, material: ConsumedPricedMaterialComponent },
          known,
          Set(subtleSpellMetamagicFact),
          2,
        )
        all {
          assert(priced == {
            verbalSuppressed: true,
            somaticSuppressed: true,
            materialSuppressed: false,
            materialPreserved: true,
            sorceryPointsRemaining: 1,
          }),
          assert(consumed == {
            verbalSuppressed: true,
            somaticSuppressed: true,
            materialSuppressed: false,
            materialPreserved: true,
            sorceryPointsRemaining: 1,
          }),
          assert(consumedPriced == {
            verbalSuppressed: false,
            somaticSuppressed: false,
            materialSuppressed: false,
            materialPreserved: true,
            sorceryPointsRemaining: 1,
          }),
        }
      },
    {
        val known = Set(subtleSpellMetamagicFact)
        val components = { verbal: true, somatic: false, material: NoMaterialComponent }
        val rejected = resolveSubtleSpellComponentProjection(
          { verbal: false, somatic: false, material: NoMaterialComponent },
          known,
          Set(subtleSpellMetamagicFact),
          2,
        )
        all {
          assert(rejected == {
            verbalSuppressed: false,
            somaticSuppressed: false,
            materialSuppressed: false,
            materialPreserved: false,
            sorceryPointsRemaining: 2,
          }),
          assert(not(subtleSpellCanModifyComponentSpell(
            components,
            Set(),
            Set(subtleSpellMetamagicFact),
            1,
          ))),
          assert(not(subtleSpellCanModifyComponentSpell(
            components,
            known,
            Set(subtleSpellMetamagicFact),
            0,
          ))),
          assert(not(subtleSpellCanModifyComponentSpell(
            components,
            Set(subtleSpellMetamagicFact, empoweredSpellMetamagicFact),
            Set(subtleSpellMetamagicFact, empoweredSpellMetamagicFact),
            2,
          ))),
        }
      },
    {
        val known = Set(transmutedSpellMetamagicFact)
        all {
          assert(transmutedSpellCanModifyDamageSpell(
            TransmutedSaveGatedDamageProcedure,
            Fire,
            Cold,
            known,
            Set(transmutedSpellMetamagicFact),
            1,
          )),
          assert(transmutedSpellCanModifyDamageSpell(
            TransmutedSpellAttackDamageProcedure,
            Cold,
            Thunder,
            known,
            Set(transmutedSpellMetamagicFact),
            1,
          )),
          assert(not(transmutedSpellCanModifyDamageSpell(
            TransmutedSpellAttackSequenceProcedure,
            Force,
            Thunder,
            known,
            Set(transmutedSpellMetamagicFact),
            1,
          ))),
          assert(not(transmutedSpellCanModifyDamageSpell(
            TransmutedSpellAttackDamageProcedure,
            Fire,
            Fire,
            known,
            Set(transmutedSpellMetamagicFact),
            1,
          ))),
          assert(not(transmutedSpellCanModifyDamageSpell(
            NonTransmutedDamageProcedure,
            Fire,
            Cold,
            known,
            Set(transmutedSpellMetamagicFact),
            1,
          ))),
          assert(not(transmutedSpellCanModifyDamageSpell(
            TransmutedSaveGatedDamageProcedure,
            Fire,
            Cold,
            Set(carefulSpellMetamagicFact),
            Set(transmutedSpellMetamagicFact),
            1,
          ))),
        }
      },
    {
        val known = Set(transmutedSpellMetamagicFact)
        all {
          assert(transmutedSpellDamageTypeProjection(
            TransmutedSaveGatedDamageProcedure,
            Fire,
            Lightning,
            known,
            Set(transmutedSpellMetamagicFact),
            1,
          ) == Lightning),
          assert(transmutedSpellDamageTypeProjection(
            TransmutedSpellAttackDamageProcedure,
            Cold,
            Acid,
            known,
            Set(transmutedSpellMetamagicFact),
            1,
          ) == Acid),
          assert(transmutedSpellDamageTypeProjection(
            TransmutedSpellAttackSequenceProcedure,
            Fire,
            Poison,
            known,
            Set(),
            1,
          ) == Fire),
        }
      },
    {
        val result = resolveTwinnedTargetCountProjection(
          TwinnedOneAdditionalCreatureTargetProcedure,
          1,
          2,
          3,
          4,
          Set(twinnedSpellMetamagicFact),
          Set(twinnedSpellMetamagicFact),
          4,
        )
        all {
          assert(result.actualSlotLevel == 1),
          assert(result.effectiveSpellLevel == 2),
          assert(result.maximumTargets == 4),
          assert(result.sorceryPointsRemaining == 3),
        }
      },
    {
        val result = resolveTwinnedTargetCountProjection(
          NonTwinnedTargetCountProcedure,
          1,
          2,
          1,
          1,
          Set(twinnedSpellMetamagicFact),
          Set(twinnedSpellMetamagicFact),
          4,
        )
        all {
          assert(result.actualSlotLevel == 1),
          assert(result.effectiveSpellLevel == 1),
          assert(result.maximumTargets == 1),
          assert(result.sorceryPointsRemaining == 4),
        }
      },
{
        val wounded = {
          ...initialState,
          fighter: { ...initialState.fighter, hp: 4 },
        }
        val result = resolveQuickenedDirectHitPointRestoration(
          wounded,
          CureWoundsRestoration,
          1,
          7,
          3,
          Set(quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          4,
        )
        all {
          assert(result.state.fighter.hp == 12),
          assert(result.state.actionAvailable),
          assert(not(result.state.bonusActionAvailable)),
          assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
          assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(result.sorceryPointsRemaining == 2),
        }
      },
    {
        val concentrating = {
          ...initialState,
          fighter: { ...initialState.fighter, concentrating: true },
        }
        val result = interruptedQuickenedActionSpellResult(concentrating, true, 2, 4)
        all {
          assert(result.state.actionAvailable),
          assert(not(result.state.bonusActionAvailable)),
          assert(not(result.state.fighter.concentrating)),
          assert(not(battleActorHasCommittedSpellSlotUse(result.state, Fighter))),
          assert(not(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter))),
          assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(result.sorceryPointsRemaining == 2),
        }
      },
    {
        val concentrating = {
          ...initialState,
          fighter: { ...initialState.fighter, concentrating: true },
        }
        val result = interruptedQuickenedActionSpellResult(concentrating, false, 2, 4)
        all {
          assert(result.state.fighter.concentrating),
          assert(not(result.state.bonusActionAvailable)),
          assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(result.sorceryPointsRemaining == 2),
        }
      },
    {
        val priorSpell = commitActorSpellSlotUse(initialState, Fighter)
        val result = resolveQuickenedDirectHitPointRestoration(
          priorSpell,
          CureWoundsRestoration,
          1,
          7,
          3,
          Set(quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          4,
        )
        assert(result == { state: priorSpell, sorceryPointsRemaining: 4 })
      },
    {
        val priorFreeSpell = commitActorLevelOnePlusSpellCast(initialState, Fighter)
        val result = resolveQuickenedDirectHitPointRestoration(
          priorFreeSpell,
          CureWoundsRestoration,
          1,
          7,
          3,
          Set(quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          4,
        )
        assert(result == { state: priorFreeSpell, sorceryPointsRemaining: 4 })
      },
    {
        val result = resolveQuickenedScalarBuffSpell(
          initialState,
          FalseLifeScalarBuff,
          Set(Fighter),
          Set(),
          1,
          7,
          Set(quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          4,
        )
        all {
          assert(result.state.fighter.tempHp == 11),
          assert(result.state.actionAvailable),
          assert(not(result.state.bonusActionAvailable)),
          assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
          assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(result.sorceryPointsRemaining == 2),
        }
      },
    {
        val result = resolveQuickenedRollModifierChoiceSpell(
          initialState,
          BlessRollModifier,
          Set(Fighter),
          Set(),
          1,
          StrAbility,
          StealthSkill,
          Set(quickenedSpellMetamagicFact),
          Set(quickenedSpellMetamagicFact),
          4,
        )
        all {
          assert(result.state.fighter.activeEffects.contains(BlessD20RollBonus)),
          assert(not(result.state.goblin.activeEffects.contains(BlessD20RollBonus))),
          assert(result.state.fighter.concentrating),
          assert(result.state.actionAvailable),
          assert(not(result.state.bonusActionAvailable)),
          assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
          assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
          assert(result.sorceryPointsRemaining == 2),
        }
      },
  }
}
