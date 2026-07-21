// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-roll-modifier
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-self-ability-check-advantage

module battleRuntimeSpellcastingAndUtilityFactsTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"
  import battleRuntimeMagicMissileArithmetic.* from "./battle-runtime-magic-missile-arithmetic"
  import battleRuntimeSpellcastingFacts.* from "./battle-runtime-spellcasting-facts"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeJumpMovement.* from "./battle-runtime-jump-movement"
  import battleRuntimeSelfTeleport.* from "./battle-runtime-self-teleport"
  import battleRuntimeCreatureSizeChange.* from "./battle-runtime-creature-size-change"
  import battleRuntimeRollModifierChoice.* from "./battle-runtime-roll-modifier-choice"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeThaumaturgy.* from "./battle-runtime-thaumaturgy"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellSlotClassification.* from "./battle-runtime-spell-slot-classification"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeMarkedSpells.* from "./battle-runtime-marked-spells"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeFeatherFall.* from "./battle-runtime-feather-fall"

  run test_spellcasting_and_utility_facts = all {
{
        val enlarged = resolveCreatureSizeChange(initialState, Fighter, EnlargeCreatureMode, true, false, 2)
        all {
          assert(not(breakConcentration(enlarged.fighter).activeEffects.contains(creatureSizeChangeActiveEffect(Fighter, EnlargeCreatureMode)))),
          assert(spellAttackModifier(3, 2) == 5),
          assert(sorcererSpellSaveDcWithInnateSorcery(13, true, SorcererSpellSource) == 14),
          assert(sorcererSpellSaveDcWithInnateSorcery(13, false, SorcererSpellSource) == 13),
          assert(sorcererSpellSaveDcWithInnateSorcery(13, true, NonSorcererSpellSource) == 13),
          assert(sorcererSpellAttackRollModeWithInnateSorcery(NormalSpellAttackRoll, true, SorcererSpellSource) == AdvantageSpellAttackRoll),
          assert(sorcererSpellAttackRollModeWithInnateSorcery(DisadvantageSpellAttackRoll, true, SorcererSpellSource) == NormalSpellAttackRoll),
          assert(sorcererSpellAttackRollModeWithInnateSorcery(NormalSpellAttackRoll, true, NonSorcererSpellSource) == NormalSpellAttackRoll),
          assert(magicMissileDartCount(1) == 3),
          assert(magicMissileDartCount(2) == 4),
          assert(magicMissileAllocatedDamage(3, 3, 1) == 6),
          assert(magicMissileAllocatedDamage(4, 1, 1) == 5),
          assert(jumpMovementReplacementMaxTargets(1) == 1),
          assert(jumpMovementReplacementMaxTargets(2) == 2),
          assert(jumpMovementReplacementActiveEffect == JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false })),
          assert(mistyStepMaxTeleportFeet == 30),
          assert(mistyStepDestinationIsLegal(30, true)),
          assert(not(mistyStepDestinationIsLegal(31, true))),
        }
      },
    {
        val enlarged = resolveCreatureSizeChange(initialState, Fighter, EnlargeCreatureMode, true, false, 2)
        all {
          assert(rollModifierChoiceMaximumTargets(BlessRollModifier, 2) == 4),
          assert(rollModifierChoiceMaximumTargets(BaneRollModifier, 3) == 5),
          assert(rollModifierChoiceMaximumTargets(GuidanceRollModifier, 0) == 1),
          assert(rollModifierChoiceMaximumTargets(PassWithoutTraceRollModifier, 2) == 2),
          assert(rollModifierChoiceMaximumTargets(EnthrallRollModifier, 2) == 2),
          assert(rollModifierChoiceRequiresFailedSave(BaneRollModifier)),
          assert(rollModifierChoiceRequiresFailedSave(EnthrallRollModifier)),
          assert(not(rollModifierChoiceRequiresFailedSave(BlessRollModifier))),
          assert(rollModifierChoiceMaximumTargets(EnhanceAbilityRollModifier, 2) == 1),
          assert(rollModifierChoiceMaximumTargets(EnhanceAbilityRollModifier, 3) == 2),
          assert(rollModifierChoiceActiveEffect(BaneRollModifier, StrAbility, StealthSkill) == BaneD20RollPenalty),
          assert(rollModifierChoiceActiveEffect(BlessRollModifier, StrAbility, StealthSkill) == BlessD20RollBonus),
          assert(rollModifierChoiceActiveEffect(GuidanceRollModifier, StrAbility, StealthSkill) == GuidanceAbilityCheckBonus({ skill: StealthSkill })),
          assert(rollModifierChoiceActiveEffect(PassWithoutTraceRollModifier, StrAbility, StealthSkill) == PassWithoutTraceStealthBonus),
          assert(rollModifierChoiceActiveEffect(EnhanceAbilityRollModifier, DexAbility, StealthSkill) == EnhanceAbilityCheckAdvantage({ ability: DexAbility })),
          assert(rollModifierChoiceActiveEffect(EnthrallRollModifier, DexAbility, StealthSkill) == EnthrallPerceptionPenalty),
          assert(passivePerceptionModifierDelta(Set(EnthrallPerceptionPenalty)) == -10),
          assert(creatureSizeChangeActiveEffect(Fighter, EnlargeCreatureMode) == CreatureSizeChange({
            source: Fighter,
            mode: EnlargeCreatureMode,
            durationTicks: creatureSizeChangeDurationTicks,
          })),
          assert(enlarged.actionAvailable == false),
          assert(enlarged.fighter.concentrating),
        }
      },
    {
        val enlarged = resolveCreatureSizeChange(initialState, Fighter, EnlargeCreatureMode, true, false, 2)
        val reduced = resolveCreatureSizeChange(initialState, Fighter, ReduceCreatureMode, true, false, 2)
        val saveSucceeded = resolveCreatureSizeChange(initialState, Goblin, ReduceCreatureMode, false, true, 2)
        val priorSizeChangeConcentration = {
          ...initialState,
          fighter: {
            ...initialState.fighter,
            concentrating: true,
            activeEffects: Set(creatureSizeChangeActiveEffect(Fighter, EnlargeCreatureMode)),
          },
        }
        val oppositeModeRecast = resolveCreatureSizeChange(priorSizeChangeConcentration, Fighter, ReduceCreatureMode, true, false, 2)
        val savedAfterPriorConcentration = resolveCreatureSizeChange(priorSizeChangeConcentration, Goblin, ReduceCreatureMode, false, true, 2)
        all {
          assert(enlarged.fighter.activeEffects.contains(creatureSizeChangeActiveEffect(Fighter, EnlargeCreatureMode))),
          assert(effectiveCreatureSize(Medium, enlarged.fighter.activeEffects) == Large),
          assert(effectiveCreatureSize(Tiny, reduced.fighter.activeEffects) == Tiny),
          assert(creatureSizeChangeStrengthAbilityCheckRollMode(enlarged.fighter.activeEffects, StrAbility) == AdvantageAbilityCheck),
          assert(creatureSizeChangeStrengthAbilityCheckRollMode(enlarged.fighter.activeEffects, DexAbility) == NormalAbilityCheck),
          assert(creatureSizeChangeStrengthSavingThrowRollMode(reduced.fighter.activeEffects, StrAbility) == DisadvantageSavingThrow),
          assert(creatureSizeChangeStrengthSavingThrowRollMode(reduced.fighter.activeEffects, ConAbility) == NormalSavingThrow),
          assert(creatureSizeChangeAttackDamageTotal(4, enlarged.fighter.activeEffects, SizeChangeWeaponAttack, 3) == 7),
          assert(creatureSizeChangeAttackDamageTotal(4, enlarged.fighter.activeEffects, SizeChangeUnarmedStrike, 3) == 7),
          assert(creatureSizeChangeAttackDamageTotal(4, enlarged.fighter.activeEffects, SizeChangeOtherAttack, 3) == 4),
          assert(creatureSizeChangeAttackDamageTotal(1, reduced.fighter.activeEffects, SizeChangeUnarmedStrike, 4) == 1),
          assert(saveSucceeded.actionAvailable == false),
          assert(saveSucceeded.fighter.concentrating == false),
          assert(not(saveSucceeded.goblin.activeEffects.contains(creatureSizeChangeActiveEffect(Fighter, ReduceCreatureMode)))),
          assert(oppositeModeRecast.fighter.activeEffects.contains(creatureSizeChangeActiveEffect(Fighter, ReduceCreatureMode))),
          assert(not(oppositeModeRecast.fighter.activeEffects.contains(creatureSizeChangeActiveEffect(Fighter, EnlargeCreatureMode)))),
          assert(effectiveCreatureSize(Medium, oppositeModeRecast.fighter.activeEffects) == Small),
          assert(savedAfterPriorConcentration.fighter.concentrating == false),
          assert(not(savedAfterPriorConcentration.fighter.activeEffects.contains(creatureSizeChangeActiveEffect(Fighter, EnlargeCreatureMode)))),
          assert(not(savedAfterPriorConcentration.goblin.activeEffects.contains(creatureSizeChangeActiveEffect(Fighter, ReduceCreatureMode)))),
        }
      },
{
      val thaumaturgyPriorEffect = {
        ...initialState,
        fighter: {
          ...initialState.fighter,
          activeEffects: Set(thaumaturgyBoomingVoiceActiveEffect(Fighter)),
        },
      }
      val thaumaturgyActor = currentActor(initialState)
      val thaumaturgyRagePreventsSpellcasting = fighterHasRage(initialState)
      all {
        assert(enhanceAbilityCheckRollMode(Set(EnhanceAbilityCheckAdvantage({ ability: DexAbility })), StrAbility) == NormalAbilityCheck),
        assert(thaumaturgyBoomingVoiceDurationTicks == 10),
        assert(thaumaturgyMaxActiveOneMinuteEffects == 3),
        assert(not(spellInvocationSpendsSpellSlot(Thaumaturgy))),
        assert(thaumaturgyBoomingVoiceAbilityCheckRollMode(Set(thaumaturgyBoomingVoiceActiveEffect(Fighter)), Fighter, ChaAbility, IntimidationSkill) == AdvantageAbilityCheck),
        assert(thaumaturgyBoomingVoiceAbilityCheckRollMode(Set(thaumaturgyBoomingVoiceActiveEffect(Fighter)), Fighter, WisAbility, IntimidationSkill) == NormalAbilityCheck),
        assert(thaumaturgyBoomingVoiceAbilityCheckRollMode(Set(thaumaturgyBoomingVoiceActiveEffect(Fighter)), Fighter, ChaAbility, PerceptionSkill) == NormalAbilityCheck),
        assert(requiredAbilityCheckRollMode(DisadvantageAbilityCheck, AdvantageAbilityCheck) == NormalAbilityCheck),
        assert(resolveFighterThaumaturgyBoomingVoice(initialState, thaumaturgyActor, 2, thaumaturgyRagePreventsSpellcasting).fighter.activeEffects.contains(thaumaturgyBoomingVoiceActiveEffect(Fighter))),
        assert(not(resolveFighterThaumaturgyBoomingVoice(initialState, thaumaturgyActor, 3, thaumaturgyRagePreventsSpellcasting).fighter.activeEffects.contains(thaumaturgyBoomingVoiceActiveEffect(Fighter)))),
        assert(resolveFighterThaumaturgyBoomingVoice(thaumaturgyPriorEffect, thaumaturgyActor, 3, thaumaturgyRagePreventsSpellcasting).fighter.activeEffects.contains(thaumaturgyBoomingVoiceActiveEffect(Fighter))),
        assert(resolveFighterThaumaturgyBoomingVoice(thaumaturgyPriorEffect, thaumaturgyActor, 0, thaumaturgyRagePreventsSpellcasting).actionAvailable),
        assert(hexDurationTicks(1) == 3600),
        assert(hexDurationTicks(2) == 14400),
        assert(hexDurationTicks(3) == 28800),
        assert(hexDurationTicks(4) == 28800),
        assert(hexDurationTicks(5) == 86400),
        assert(activeEffectsContainTransferableHex(
          { ...initialState, initiative: { ...initialState.initiative, round: 1, stillToAct: { actor: Fighter, waiting: List(Goblin) }, alreadyActed: List() } },
          Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: TransferAvailableAfterTurn({ actor: Fighter, round: 1 }), durationTicks: 600 }))
        ) == false),
        assert(activeEffectsContainTransferableHex(
          { ...initialState, initiative: { ...initialState.initiative, round: 1, stillToAct: { actor: Goblin, waiting: List() }, alreadyActed: List(Fighter) } },
          Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: TransferAvailableAfterTurn({ actor: Fighter, round: 1 }), durationTicks: 600 }))
        )),
      }
    },
    {
      all {
        assert(not(mistyStepDestinationIsLegal(30, false))),
        assert(not(mistyStepTeleportSpendsMovement)),
        assert(not(mistyStepTeleportProvokesOpportunityAttacks)),
        assert(mistyStepTeleportTransportsWornAndCarriedEquipment),
        assert(featherFallMitigationActiveEffect == FeatherFallMitigation({ durationTicks: 10 })),
        assert(activeFeatherFallDescentRateCapFeetPerRound(Set(FeatherFallMitigation({ durationTicks: 10 }))) == 60),
      }
    },
    {

        all {
          assert(huntersMarkDurationTicks(2) == 600),
          assert(huntersMarkDurationTicks(3) == 4800),
          assert(huntersMarkDurationTicks(4) == 4800),
          assert(huntersMarkDurationTicks(5) == 14400),
          assert(resolveFavoredEnemyHuntersMark(initialState, Goblin, 2).favoredEnemyUsesRemaining == 1),
          assert(not(battleActorHasSpellSlotUse(resolveFavoredEnemyHuntersMark(initialState, Goblin, 2).state, Fighter))),
          assert(activeEffectsContainHuntersMark(resolveFavoredEnemyHuntersMark(initialState, Goblin, 2).state.fighter.activeEffects)),
          assert(resolveFavoredEnemyHuntersMark(initialState, Goblin, 0).state == initialState),
          assert(fighterHuntersMarkDamage(4, Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin) == 4),
          assert(fighterHuntersMarkDamage(4, Set(HuntersMarkDamageRider({ target: Fighter, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin) == 0),
          assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, WisAbility, PerceptionSkill) == AdvantageAbilityCheck),
          assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, WisAbility, SurvivalSkill) == AdvantageAbilityCheck),
          assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, WisAbility, AthleticsSkill) == NormalAbilityCheck),
          assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Fighter, WisAbility, PerceptionSkill) == NormalAbilityCheck),
          assert(huntersMarkFindingAbilityCheckRollMode(Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, StrAbility, PerceptionSkill) == NormalAbilityCheck),
          assert(fighterHexDamage(4, Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin) == 4),
          assert(fighterHexDamage(4, Set(HexDamageRider({ target: Fighter, ability: WisAbility, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin) == 0),
          assert(hexAbilityCheckRollMode(Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, WisAbility) == DisadvantageAbilityCheck),
          assert(hexAbilityCheckRollMode(Set(HexDamageRider({ target: Goblin, ability: WisAbility, transfer: AwaitingTargetDrop, durationTicks: 600 })), Goblin, StrAbility) == NormalAbilityCheck),
          assert(enhanceAbilityCheckRollMode(Set(EnhanceAbilityCheckAdvantage({ ability: DexAbility })), DexAbility) == AdvantageAbilityCheck),
        }
      },
  }
}
