// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-damage-reduction spell.invocation-roll-modifier spell.invocation-self-ability-check-advantage

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-creature-size-change

module battleRuntimeSpellFactsTests {
  // Sorcerous Burst damage-type variants are used directly in the module body
  // below; import the leaf that defines them (Quint `.*` imports are not
  // re-exported transitively through battleRuntime).
  import battleRuntimeSorcerousBurstDamageChoice.* from "./battle-runtime-sorcerous-burst-damage-choice"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFindFamiliar.* from "./battle-runtime-find-familiar"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeCreatureTypeProtection.* from "./battle-runtime-creature-type-protection"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeThaumaturgy.* from "./battle-runtime-thaumaturgy"
  import battleRuntimeRollModifierChoice.* from "./battle-runtime-roll-modifier-choice"
  import battleRuntimeBardicInspiration.* from "./battle-runtime-bardic-inspiration"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"
  import battleRuntimeChainedSpellAttack.* from "./battle-runtime-chained-spell-attack"
  import battleRuntimeSaveGatedSpell.* from "./battle-runtime-save-gated-spell"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeMarkedSpells.* from "./battle-runtime-marked-spells"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeCombatantSide.* from "./battle-runtime-combatant-side"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"
  import battleRuntimeFeatherFall.* from "./battle-runtime-feather-fall"
  import battleRuntimeJumpMovement.* from "./battle-runtime-jump-movement"
  import battleRuntimeSelfTeleport.* from "./battle-runtime-self-teleport"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeGroundCommand.* from "./battle-runtime-ground-command"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeCreatureSizeChange.* from "./battle-runtime-creature-size-change"

  run test_spell_invocation_executable_spell_facts = {
    val animalFriendshipCharmed = AnimalFriendshipCharmed({ source: Fighter, durationTicks: 24 * 60 })
    val blindnessDeafnessDeafened = BlindnessDeafnessDeafened({
      source: Fighter,
      heightenedRepeatSaveDisadvantage: false,
      durationTicks: blindnessDeafnessDurationTicks,
    })
    val shiningSmiteIllumination = ShiningSmiteIllumination({ durationTicks: 10 })
    val raySuccessEffects = rayOfEnfeeblementD20LifecycleSuccessActiveEffects(Fighter)
    val rayFailedEffects = rayOfEnfeeblementD20LifecycleFailedSaveActiveEffects(Fighter)
    val raySuccess = resolveRayOfEnfeeblementD20Lifecycle(initialState, Goblin, true)
    val rayFailure = resolveRayOfEnfeeblementD20Lifecycle(initialState, Goblin, false)
    val rayAfterNextAttackEffects =
      rayOfEnfeeblementD20LifecycleActiveEffectsAfterNextAttack(raySuccess.goblin.activeEffects, Fighter)
    val rayAfterRepeatSaveEffects =
      rayOfEnfeeblementD20LifecycleActiveEffectsAfterRepeatSave(rayFailure.goblin.activeEffects, Fighter, true)
    val rayDamagePenaltyEffects = Set(RayOfEnfeeblementDamageRollPenalty({ source: Fighter, durationTicks: rayOfEnfeeblementD20LifecycleDurationTicks }))
    val resistanceReductionEffects = Set(ResistanceDamageReduction({ damageType: Fire, usedThisTurn: false }))
    val resistantConcentratingTarget = {
      ...initialState.goblin,
      concentrating: true,
      activeEffects: resistanceReductionEffects,
    }
    val rayPenaltyResistedReducedTarget =
      saveGatedDamageTargetAfterRayPenaltyLifecycle(
        FireballSaveGate,
        resistantConcentratingTarget,
        rayDamagePenaltyEffects,
        Fighter,
        20,
        4,
        true,
        Set(Fire),
        Set(),
        Set(),
        3,
        false,
      )
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
    val expiringEnlarge = {
      ...enlarged,
      fighter: {
        ...enlarged.fighter,
        activeEffects: Set(CreatureSizeChange({
          source: Fighter,
          mode: EnlargeCreatureMode,
          durationTicks: 1,
        })),
      },
    }
    val expiredEnlarge = tickRoundDurationSpellEffects(expiringEnlarge)
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
      assert(not(breakConcentration(enlarged.fighter).activeEffects.contains(creatureSizeChangeActiveEffect(Fighter, EnlargeCreatureMode)))),
      assert(expiredEnlarge.fighter.concentrating == false),
      assert(not(expiredEnlarge.fighter.activeEffects.contains(creatureSizeChangeActiveEffect(Fighter, EnlargeCreatureMode)))),
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
      assert(not(mistyStepDestinationIsLegal(30, false))),
      assert(not(mistyStepTeleportSpendsMovement)),
      assert(not(mistyStepTeleportProvokesOpportunityAttacks)),
      assert(mistyStepTeleportTransportsWornAndCarriedEquipment),
      assert(featherFallMitigationActiveEffect == FeatherFallMitigation({ durationTicks: 10 })),
      assert(activeFeatherFallDescentRateCapFeetPerRound(Set(FeatherFallMitigation({ durationTicks: 10 }))) == 60),
      assert(rayOfFrostSpeedEffectActive(true, Goblin, Fighter)),
      assert(not(rayOfFrostSpeedEffectActive(true, Fighter, Fighter))),
      assert(spellAttackDamageType(PoisonSpraySpellAttack) == Poison),
      assert(spellAttackDamageType(ChillTouchSpellAttack) == Necrotic),
      assert(spellAttackDamageType(StarryWispSpellAttack) == Radiant),
      assert(spellAttackDamageType(FireBoltSpellAttack) == Fire),
      assert(spellAttackDamageType(ShockingGraspSpellAttack) == Lightning),
      assert(spellAttackDamageType(GuidingBoltSpellAttack) == Radiant),
      assert(spellAttackDamageType(RayOfSicknessSpellAttack) == Poison),
      assert(spellAttackDamageType(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstThunderDamage, spellcastingAbilityModifier: 3, characterLevel: 5 })) == Thunder),
      assert(battleRuntimeSorcerousBurstBaseDamageDice(5) == 2),
      assert(battleRuntimeSorcerousBurstCanRollAdditionalD8(1, 3, 0)),
      assert(not(battleRuntimeSorcerousBurstCanRollAdditionalD8(1, 3, 1))),
      assert(spellAttackDamageActiveEffects(RayOfSicknessSpellAttack) == Set(RayOfSicknessPoisoned)),
      assert(spellAttackDamageActiveEffects(ChillTouchSpellAttack) == Set(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 0 }))),
      assert(spellAttackDamageActiveEffects(StarryWispSpellAttack) == Set(StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 0 }))),
      assert(starryWispDimLightEmitter(initialState, Fighter, CombatantLightEmitter({ actor: Goblin })) == SpellLightEmitter({
        source: Fighter,
        sourceSpell: StarryWisp,
        attachment: CombatantLightEmitter({ actor: Goblin }),
        emission: DimLightEmission({ radiusFeet: 10 }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        ongoingSpellTracking: UntrackedSpellLightEmitter,
        expiresAt: EndOfTurnLightEmitterExpiration({ actor: Fighter, round: 2 }),
      })),
      assert(spellAttackDamageSupportsObjectTarget(StarryWispSpellAttack)),
      assert(spellAttackDamageSupportsObjectTarget(ChillTouchSpellAttack)),
      assert(spellAttackDamageSupportsObjectTarget(FireBoltSpellAttack)),
      assert(spellAttackDamageSupportsObjectTarget(ProduceFlameHurlSpellAttack)),
      assert(spellAttackDamageSupportsObjectTarget(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstPsychicDamage, spellcastingAbilityModifier: 3, characterLevel: 5 }))),
      assert(spellAttackSequenceDamageType(EldritchBlastBeamSequence) == Force),
      assert(spellAttackSequenceDamageType(ScorchingRaySequence) == Fire),
      assert(eldritchBlastBeamCount(1) == 1),
      assert(eldritchBlastBeamCount(5) == 2),
      assert(eldritchBlastBeamCount(11) == 3),
      assert(eldritchBlastBeamCount(17) == 4),
      assert(scorchingRayRayCount(1) == 0),
      assert(scorchingRayRayCount(2) == 3),
      assert(scorchingRayRayCount(3) == 4),
      assert(scorchingRayRayCount(5) == 6),
      assert(spellAttackSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 0, 0, 0, 0) == Set(TargetChoice, ObjectTargetChoice)),
      assert(spellAttackSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 2, 1, 0, 0) == Set(AttackRoll)),
      assert(spellAttackSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 2, 2, 2, 1) == Set(SpellDamageRoll)),
      assert(spellAttackSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 2, 2, 1, 1) == Set()),
      assert(spellAttackSequenceReplayHoles(ScorchingRaySequence, true, 3, 0, 0, 0, 0) == Set(TargetChoice, ObjectTargetChoice)),
      assert(spellAttackSequenceReplayHoles(ScorchingRaySequence, true, 3, 3, 2, 0, 0) == Set(AttackRoll)),
      assert(spellAttackSequenceReplayHoles(ScorchingRaySequence, true, 3, 3, 3, 2, 1) == Set(SpellDamageRoll)),
      assert(spellAttackSequenceReplayHoles(ScorchingRaySequence, true, 3, 3, 3, 1, 1) == Set()),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, true, false, false) == Set()),
      assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
      assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
      assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, true, true, false, false) == Set()),
      assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
      assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
      assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, true, true, false, false) == Set()),
      assert(spellAttackDamageObjectReplayHoles(ProduceFlameHurlSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellAttackDamageObjectReplayHoles(ProduceFlameHurlSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
      assert(spellAttackDamageObjectReplayHoles(ProduceFlameHurlSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
      assert(spellAttackDamageObjectReplayHoles(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstThunderDamage, spellcastingAbilityModifier: 3, characterLevel: 5 }), true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellObjectDamageOutcome(StarryWispSpellAttack, StarryWispObjectTarget, 6, ObjectHitPoints({ hitPoints: 5 })) == ObjectHitPointDamage({
        object: StarryWispObjectTarget,
        damageType: Radiant,
        rolledDamage: 6,
        effectiveDamage: 6,
        priorHitPoints: 5,
        nextHitPoints: 0,
        destroyed: true,
      })),
      assert(spellObjectDamageOutcome(ChillTouchSpellAttack, ChillTouchObjectTarget, 6, ObjectHitPoints({ hitPoints: 10 })) == ObjectHitPointDamage({
        object: ChillTouchObjectTarget,
        damageType: Necrotic,
        rolledDamage: 6,
        effectiveDamage: 6,
        priorHitPoints: 10,
        nextHitPoints: 4,
        destroyed: false,
      })),
      assert(spellObjectDamageOutcome(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstPsychicDamage, spellcastingAbilityModifier: 3, characterLevel: 5 }), FireBoltObjectTarget, 9, ObjectHitPoints({ hitPoints: 8 })) == ObjectHitPointDamage({
        object: FireBoltObjectTarget,
        damageType: Psychic,
        rolledDamage: 9,
        effectiveDamage: 0,
        priorHitPoints: 8,
        nextHitPoints: 8,
        destroyed: false,
      })),
      assert(spellObjectDamageOutcome(StarryWispSpellAttack, StarryWispObjectTarget, 6, ObjectHitPointsWithDamageThreshold({ hitPoints: 10, damageThreshold: 10 })) == ObjectHitPointDamage({
        object: StarryWispObjectTarget,
        damageType: Radiant,
        rolledDamage: 6,
        effectiveDamage: 0,
        priorHitPoints: 10,
        nextHitPoints: 10,
        destroyed: false,
      })),
      assert(spellObjectDamageOutcome(FireBoltSpellAttack, FireBoltObjectTarget, 9, ObjectHitPoints({ hitPoints: 8 })) == ObjectHitPointDamage({
        object: FireBoltObjectTarget,
        damageType: Fire,
        rolledDamage: 9,
        effectiveDamage: 9,
        priorHitPoints: 8,
        nextHitPoints: 0,
        destroyed: true,
      })),
      assert(spellObjectIgnitionOutcomes(FireBoltSpellAttack, FireBoltObjectTarget, Fighter, ObjectFlammableUnattended) == Set(ObjectStartsBurning({
        object: FireBoltObjectTarget,
        source: Fighter,
        sourceSpell: FireBolt,
      }))),
      assert(spellObjectIgnitionOutcomes(FireBoltSpellAttack, FireBoltObjectTarget, Fighter, ObjectWornOrCarried) == Set()),
      assert(spellObjectIgnitionOutcomes(StarryWispSpellAttack, StarryWispObjectTarget, Fighter, ObjectFlammableUnattended) == Set()),
      assert(saveGatedAreaObjectIgnitionOutcomes(FireballSaveGate, FireballObjectTarget, Fighter, ObjectFlammableUnattended) == Set(ObjectStartsBurning({
        object: FireballObjectTarget,
        source: Fighter,
        sourceSpell: Fireball,
      }))),
      assert(saveGatedAreaObjectIgnitionOutcomes(FireballSaveGate, FireballObjectTarget, Fighter, ObjectWornOrCarried) == Set()),
      assert(spellObjectDamageOutcome(ProduceFlameHurlSpellAttack, ProduceFlameObjectTarget, 6, ObjectHitPoints({ hitPoints: 5 })) == ObjectHitPointDamage({
        object: ProduceFlameObjectTarget,
        damageType: Fire,
        rolledDamage: 6,
        effectiveDamage: 6,
        priorHitPoints: 5,
        nextHitPoints: 0,
        destroyed: true,
      })),
      assert(spellAttackSequenceObjectDamageOutcome(EldritchBlastBeamSequence, EldritchBlastObjectTarget, 6, ObjectHitPoints({ hitPoints: 10 })) == ObjectHitPointDamage({
        object: EldritchBlastObjectTarget,
        damageType: Force,
        rolledDamage: 6,
        effectiveDamage: 6,
        priorHitPoints: 10,
        nextHitPoints: 4,
        destroyed: false,
      })),
      assert(spellAttackSequenceObjectDamageOutcome(ScorchingRaySequence, ScorchingRayObjectTarget, 7, ObjectHitPoints({ hitPoints: 10 })) == ObjectHitPointDamage({
        object: ScorchingRayObjectTarget,
        damageType: Fire,
        rolledDamage: 7,
        effectiveDamage: 7,
        priorHitPoints: 10,
        nextHitPoints: 3,
        destroyed: false,
      })),
      assert(spellAttackDamageActiveEffects(ShockingGraspSpellAttack) == Set(ShockingGraspOpportunityAttackDenied)),
      assert(spellAttackDamageActiveEffects(GuidingBoltSpellAttack) == Set(GuidingBoltNextAttackAdvantage)),
      assert(chainedSpellAttackDamageChoices(ChromaticOrbChainedSpellAttack) == Set(ChromaticOrbAcid, ChromaticOrbCold, ChromaticOrbFire, ChromaticOrbLightning, ChromaticOrbPoison, ChromaticOrbThunder)),
      assert(chainedSpellAttackDamageBaseSpellLevel(ChromaticOrbChainedSpellAttack) == 1),
      assert(chainedSpellAttackDamageDieSize(ChromaticOrbChainedSpellAttack) == 8),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttack, 1) == 3),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttack, 3) == 5),
      assert(saveGatedDamageFailedSaveActiveEffects(ViciousMockerySaveGate) == Set(ViciousMockeryNextAttackDisadvantage)),
      assert(saveGatedDamageFailedSaveActiveEffects(DissonantWhispersSaveGate) == Set()),
      assert(saveGatedDamageFailedSaveActiveEffects(FireballSaveGate) == Set()),
      assert(saveGatedConditionTargeting(ColorSpraySaveGate) == AreaSaveTargets),
      assert(saveGatedConditionSavingThrowAbility(ColorSpraySaveGate) == ConAbility),
      assert(saveGatedConditionFailedSaveActiveEffects(ColorSpraySaveGate, initialState, Fighter) == Set(ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 }))),
      assert(saveGatedConditionTargeting(EntangleSaveGate) == AreaSaveTargets),
      assert(saveGatedConditionSavingThrowAbility(EntangleSaveGate) == StrAbility),
      assert(saveGatedConditionFailedSaveActiveEffects(EntangleSaveGate, initialState, Fighter) == Set(EntangleRestrained)),
      assert(saveGatedAttackRollAdvantageTargeting(FaerieFireSaveGate) == AreaSaveTargets),
      assert(saveGatedAttackRollAdvantageFailedSaveActiveEffects(FaerieFireSaveGate) == Set(FaerieFireOutline)),
      assert(activeEffectsDenyInvisibleBenefit(Set(FaerieFireOutline))),
      assert(activeEffectsDenyInvisibleBenefit(Set(shiningSmiteIllumination))),
      assert(activeEffectsDenyInvisibleBenefit(Set(StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 2 })))),
      assert(not(activeEffectsDenyInvisibleBenefit(Set(GuidingBoltNextAttackAdvantage)))),
      assert(saveGatedConditionTargeting(AnimalFriendshipSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(AnimalFriendshipSaveGate), 1) == 1),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(AnimalFriendshipSaveGate), 2) == 2),
      assert(saveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveGate, BeastCreature)),
      assert(not(saveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveGate, HumanoidCreature))),
      assert(saveGatedConditionFailedSaveActiveEffects(AnimalFriendshipSaveGate, initialState, Fighter) == Set(animalFriendshipCharmed)),
      assert(actorDamageSource(Fighter) == FighterDamageSource),
      assert(damageSourceSide(FighterAllyDamageSource) == PartySide),
      assert(damageSourceIsCasterOrAlly(Fighter, FighterDamageSource)),
      assert(damageSourceIsCasterOrAlly(Fighter, FighterAllyDamageSource)),
      assert(not(damageSourceIsCasterOrAlly(Fighter, GoblinDamageSource))),
      assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed), FighterDamageSource) == Set()),
      assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed), FighterAllyDamageSource) == Set()),
      assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed), GoblinDamageSource) == Set(animalFriendshipCharmed)),
      assert(saveGatedConditionTargeting(CharmPersonSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(CharmPersonSaveGate), 1) == 1),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(CharmPersonSaveGate), 2) == 2),
      assert(saveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveGate, HumanoidCreature)),
      assert(not(saveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveGate, BeastCreature))),
      assert(saveGatedConditionFailedSaveActiveEffects(CharmPersonSaveGate, initialState, Fighter) == Set(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(saveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveGate, true)),
      assert(not(saveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveGate, false))),
      assert(saveGatedConditionTargeting(BlindnessDeafnessSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 2, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
      assert(saveGatedConditionSavingThrowAbility(BlindnessDeafnessSaveGate) == ConAbility),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(BlindnessDeafnessSaveGate), 2) == 1),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(BlindnessDeafnessSaveGate), 3) == 2),
      assert(saveGatedConditionRequiresConditionChoice(BlindnessDeafnessSaveGate)),
      assert(blindnessDeafnessActiveEffect(BlindnessDeafnessDeafenedChoice, Fighter) == blindnessDeafnessDeafened),
      assert(saveGatedConditionTargeting(HoldPersonSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 2, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
      assert(saveGatedConditionSavingThrowAbility(HoldPersonSaveGate) == WisAbility),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(HoldPersonSaveGate), 2) == 1),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(HoldPersonSaveGate), 3) == 2),
      assert(saveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveGate, HumanoidCreature)),
      assert(not(saveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveGate, BeastCreature))),
      assert(not(saveGatedConditionRequiresConditionChoice(HoldPersonSaveGate))),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(GuidingBoltNextAttackAdvantage), false) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(FaerieFireOutline), true) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(FaerieFireOutline), false) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(shiningSmiteIllumination), true) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(shiningSmiteIllumination), false) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(), true) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(GuidingBoltNextAttackAdvantage), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(FaerieFireOutline), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(shiningSmiteIllumination), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromBlurredActiveEffects(Set(), Set(Blurred), true, false) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromBlurredActiveEffects(Set(), Set(Blurred), true, true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromBlurredActiveEffects(Set(), Set(Blurred, FaerieFireOutline), true, false) == NormalSpellAttackRoll),
      assert(activeEffectsWithoutSpellEffectConcentration(Set(Blurred)) == Set()),
      assert(activeEffectsWithoutSpellEffectConcentration(Set(RayOfEnfeeblementNextAttackDisadvantage({ source: Fighter }))) == Set()),
      assert(activeEffectsWithoutSpellEffectConcentration(Set(RayOfEnfeeblementD20Lifecycle({ source: Fighter, durationTicks: 10 }))) == Set()),
      assert(rayOfEnfeeblementD20LifecycleTargeting == TargetListSaveTargets({
        minTargets: 1,
        baseSlotLevel: 2,
        baseTargets: 1,
        additionalTargetsPerSlotLevel: 0,
      })),
      assert(rayOfEnfeeblementD20LifecycleSavingThrowAbility == ConAbility),
      assert(rayOfEnfeeblementD20LifecycleEndTurnRepeatSaveAbility == ConAbility),
      assert(raySuccess.fighter.concentrating),
      assert(raySuccess.goblin.activeEffects.contains(RayOfEnfeeblementNextAttackDisadvantage({ source: Fighter }))),
      assert(spellAttackRollModeFromActiveEffects(raySuccess.goblin.activeEffects, Set(), true) == DisadvantageSpellAttackRoll),
      assert(activeEffectsWithoutExpiredSapStartOfTurnRiders(raySuccess.goblin.activeEffects, Fighter) == Set()),
      assert(activeEffectsWithoutExpiredSapStartOfTurnRiders(raySuccess.goblin.activeEffects, Goblin) == raySuccess.goblin.activeEffects),
      assert(not(rayAfterNextAttackEffects.contains(RayOfEnfeeblementNextAttackDisadvantage({ source: Fighter })))),
      assert(not(rayOfEnfeeblementD20LifecycleConcentratingAfterEffectsChange(rayAfterNextAttackEffects, Fighter, raySuccess.fighter.concentrating))),
      assert(rayFailure.fighter.concentrating),
      assert(rayFailure.goblin.activeEffects.contains(RayOfEnfeeblementD20Lifecycle({ source: Fighter, durationTicks: rayOfEnfeeblementD20LifecycleDurationTicks }))),
      assert(rayFailedEffects == rayOfEnfeeblementD20LifecycleFailedSaveActiveEffects(Fighter)),
      assert(raySuccessEffects == Set(RayOfEnfeeblementNextAttackDisadvantage({ source: Fighter }))),
      assert(rayOfEnfeeblementD20LifecycleAttackRollMode(rayFailure.goblin.activeEffects, StrAbility) == DisadvantageSpellAttackRoll),
      assert(rayOfEnfeeblementD20LifecycleAttackRollMode(rayFailure.goblin.activeEffects, DexAbility) == NormalSpellAttackRoll),
      assert(rayOfEnfeeblementD20LifecycleAbilityCheckRollMode(rayFailure.goblin.activeEffects, StrAbility) == DisadvantageAbilityCheck),
      assert(rayOfEnfeeblementD20LifecycleAbilityCheckRollMode(rayFailure.goblin.activeEffects, DexAbility) == NormalAbilityCheck),
      assert(rayOfEnfeeblementD20LifecycleSavingThrowRollMode(rayFailure.goblin.activeEffects, StrAbility) == DisadvantageSavingThrow),
      assert(rayOfEnfeeblementD20LifecycleSavingThrowRollMode(rayFailure.goblin.activeEffects, DexAbility) == NormalSavingThrow),
      assert(rayFailure.goblin.activeEffects.contains(RayOfEnfeeblementDamageRollPenalty({ source: Fighter, durationTicks: rayOfEnfeeblementD20LifecycleDurationTicks }))),
      assert(rayOfEnfeeblementD20LifecycleFailedSaveActiveEffects(Fighter) == Set(
        RayOfEnfeeblementD20Lifecycle({ source: Fighter, durationTicks: rayOfEnfeeblementD20LifecycleDurationTicks }),
        RayOfEnfeeblementDamageRollPenalty({ source: Fighter, durationTicks: rayOfEnfeeblementD20LifecycleDurationTicks }),
      )),
      assert(damageAfterRayOfEnfeeblementDamageRollPenalty(rayFailure.goblin.activeEffects, Fighter, 6, 4) == 2),
      assert(damageAfterRayOfEnfeeblementDamageRollPenalty(rayFailure.goblin.activeEffects, Fighter, 3, 8) == 0),
      assert(damageAfterRayOfEnfeeblementDamageRollPenalty(rayFailure.goblin.activeEffects, Goblin, 6, 4) == 6),
      assert(rayPenaltyResistedReducedTarget.hp == 9),
      assert(not(rayPenaltyResistedReducedTarget.concentrating)),
      assert(not(rayAfterRepeatSaveEffects.contains(RayOfEnfeeblementD20Lifecycle({ source: Fighter, durationTicks: rayOfEnfeeblementD20LifecycleDurationTicks })))),
      assert(not(rayAfterRepeatSaveEffects.contains(RayOfEnfeeblementDamageRollPenalty({ source: Fighter, durationTicks: rayOfEnfeeblementD20LifecycleDurationTicks })))),
      assert(not(rayOfEnfeeblementD20LifecycleConcentratingAfterEffectsChange(rayAfterRepeatSaveEffects, Fighter, rayFailure.fighter.concentrating))),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(ProtectionFromEvilAndGoodCreatureTypeProtection), true) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(GuidingBoltNextAttackAdvantage, ProtectionFromEvilAndGoodCreatureTypeProtection), false) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(FaerieFireOutline, ProtectionFromEvilAndGoodCreatureTypeProtection), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(FaerieFireOutline, ProtectionFromEvilAndGoodCreatureTypeProtection), false) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(shiningSmiteIllumination, ProtectionFromEvilAndGoodCreatureTypeProtection), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(shiningSmiteIllumination, ProtectionFromEvilAndGoodCreatureTypeProtection), false) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(HumanoidCreature, Set(), Set(ProtectionFromEvilAndGoodCreatureTypeProtection), true) == NormalSpellAttackRoll),
      assert(protectionFromEvilAndGoodPreventsConditionFromCreatureType(UndeadCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection), PreventedCharmed)),
      assert(protectionFromEvilAndGoodPreventsConditionFromCreatureType(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection), PreventedFrightened)),
      assert(not(protectionFromEvilAndGoodPreventsConditionFromCreatureType(HumanoidCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection), PreventedCharmed))),
      assert(not(protectionFromEvilAndGoodPreventsConditionFromCreatureType(UndeadCreature, Set(), PreventedFrightened))),
      assert(protectionFromEvilAndGoodPreventsPossessionFromCreatureType(UndeadCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection))),
      assert(not(protectionFromEvilAndGoodPreventsPossessionFromCreatureType(HumanoidCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection)))),
      assert(not(protectionFromEvilAndGoodPreventsPossessionFromCreatureType(FeyCreature, Set()))),
      assert(possessionAttemptDispositionFromCreatureTypeProtection(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection)) == PossessionPreventedByCreatureTypeProtection),
      assert(possessionAttemptDispositionFromCreatureTypeProtection(HumanoidCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection)) == PossessionUnprevented),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, ProtectionRelevantCharmed({ source: Fighter, durationTicks: 10 })), ProtectionRelevantCharmed({ source: Fighter, durationTicks: 10 })) == AdvantageSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, ProtectionRelevantFrightened({ source: Fighter, durationTicks: 10 })), ProtectionRelevantFrightened({ source: Fighter, durationTicks: 10 })) == AdvantageSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, ProtectionRelevantPossession({ source: Fighter, durationTicks: 10 })), ProtectionRelevantPossession({ source: Fighter, durationTicks: 10 })) == AdvantageSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(HumanoidCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, ProtectionRelevantCharmed({ source: Fighter, durationTicks: 10 })), ProtectionRelevantCharmed({ source: Fighter, durationTicks: 10 })) == NormalSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection), CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })) == NormalSavingThrow),
      assert(protectionFromEvilAndGoodRelevantEffectSaveRollMode(FeyCreature, Set(ProtectionFromEvilAndGoodCreatureTypeProtection, CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })), CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })) == NormalSavingThrow),
      assert(saveGatedConditionTarget(CharmPersonSaveGate, initialState, { ...initialState.goblin, activeEffects: Set(ProtectionFromEvilAndGoodCreatureTypeProtection) }, false, Fighter, Goblin, FeyCreature).activeEffects == Set(ProtectionFromEvilAndGoodCreatureTypeProtection)),
      assert(saveGatedConditionTarget(CharmPersonSaveGate, initialState, { ...initialState.goblin, activeEffects: Set(ProtectionFromEvilAndGoodCreatureTypeProtection) }, false, Fighter, Goblin, HumanoidCreature).activeEffects == Set(ProtectionFromEvilAndGoodCreatureTypeProtection, CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(saveGatedTargeting(SacredFlameSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(SacredFlameSaveGate) == NoDamageOnSaveSuccess),
      assert(saveGatedDamageType(SacredFlameSaveGate) == Radiant),
      assert(saveGatedTargeting(InflictWoundsSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(InflictWoundsSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(InflictWoundsSaveGate) == Necrotic),
      assert(saveGatedTargeting(BurningHandsSaveGate) == AreaSaveTargets),
      assert(saveGatedDamageSuccess(BurningHandsSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(BurningHandsSaveGate) == Fire),
      assert(saveGatedTargeting(FireballSaveGate) == AreaSaveTargets),
      assert(saveGatedDamageSuccess(FireballSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(FireballSaveGate) == Fire),
      assert(saveGatedTargeting(ViciousMockerySaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(ViciousMockerySaveGate) == NoDamageOnSaveSuccess),
      assert(saveGatedDamageType(ViciousMockerySaveGate) == Psychic),
      assert(saveGatedTargeting(DissonantWhispersSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(DissonantWhispersSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(DissonantWhispersSaveGate) == Psychic),
      assert(saveGatedTargeting(HellishRebukeSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(HellishRebukeSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(HellishRebukeSaveGate) == Fire),
      assert(saveGatedTargeting(MindSpikeSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(MindSpikeSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(MindSpikeSaveGate) == Psychic),
      assert(saveGatedDamageRequiresConcentration(MindSpikeSaveGate)),
      assert(saveGatedDamageFailedSaveActiveEffects(MindSpikeSaveGate) == Set()),
      assert(spellInvocationSpendsSpellSlot(DissonantWhispers)),
      assert(spellInvocationSpendsSpellSlot(Fireball)),
      assert(spellInvocationSpendsSpellSlot(HellishRebuke)),
      assert(spellInvocationSpendsSpellSlot(MindSpike)),
      assert(spellInvocationSpendsSpellSlot(IceKnife)),
      assert(spellInvocationSpendsSpellSlot(AnimalFriendship)),
      assert(spellInvocationSpendsSpellSlot(Blur)),
      assert(spellInvocationSpendsSpellSlot(MirrorImage)),
      assert(spellInvocationSpendsSpellSlot(CharmPerson)),
      assert(spellInvocationSpendsSpellSlot(ProtectionFromEvilAndGood)),
      assert(spellInvocationSpendsSpellSlot(DivineFavor)),
      assert(spellInvocationSpendsSpellSlot(MistyStep)),
      assert(spellInvocationSpendsSpellSlot(PassWithoutTrace)),
      assert(spellInvocationSpendsSpellSlot(DivineSmite)),
      assert(spellInvocationSpendsSpellSlot(ShiningSmite)),
      assert(spellInvocationSpendsSpellSlot(HuntersMark)),
      assert(spellInvocationSpendsSpellSlot(Hex)),
      assert(spellInvocationSpendsSpellSlot(EnhanceAbility)),
      assert(spellInvocationSpendsSpellSlot(FogCloud)),
      assert(spellInvocationSpendsSpellSlot(Darkness)),
      assert(spellInvocationSpendsSpellSlot(ScorchingRay)),
      assert(spellInvocationSpendsSpellSlot(ContinualFlame)),
      assert(spellInvocationSpendsSpellSlot(SpiderClimb)),
      assert(fighterDivineFavorDamage(3, Set(DivineFavorWeaponDamageRider({ durationTicks: 1 }))) == 3),
      assert(fighterDivineFavorDamage(3, Set()) == 0),
      assert(divineSmiteDamageDice(1, HumanoidCreature) == 2),
      assert(divineSmiteDamageDice(1, UndeadCreature) == 3),
      assert(divineSmiteDamageDice(3, FiendCreature) == 5),
      assert(huntersMarkDurationTicks(1) == 600),
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
      assert(resolveRayOfFrostWithDamageRoll({ ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })) }, goblin: { ...initialState.goblin, reactionAvailable: false } }, 15, 10, fighterSpellAttackDamageRollWithHuntersMark(4, 6), true).goblin.hp == 0),
      assert(attackBurstSaveDamageSpendsLevelOneSlot(IceKnifeAttackBurstSaveDamage)),
      assert(attackBurstSaveDamageAttackType(IceKnifeAttackBurstSaveDamage) == Piercing),
      assert(attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage) == Cold),
    }
  }

}
