// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-damage-reduction
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-ray-of-enfeeblement-damage-penalty

module battleRuntimeSpellSaveAndRiderFactsTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"
  import battleRuntimeSorcerousBurstDamageChoice.* from "./battle-runtime-sorcerous-burst-damage-choice"
  import battleRuntimeSpellAttackRollAndVisibilityFacts.* from "./battle-runtime-spell-attack-roll-and-visibility-facts"
  import battleRuntimeChainedSpellAttack.* from "./battle-runtime-chained-spell-attack"
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"
  import battleRuntimeSaveGatedObjectFacts.* from "./battle-runtime-save-gated-object-facts"
  import battleRuntimeSaveConditionEntangle.* from "./battle-runtime-save-condition-entangle"
  import battleRuntimeCreatureTypeProtection.* from "./battle-runtime-creature-type-protection"
  import battleRuntimeCreatureTypeProtectionAttackRoll.* from "./battle-runtime-creature-type-protection-attack-roll"
  import battleRuntimeSaveConditionTargetList.* from "./battle-runtime-save-condition-target-list"
  import battleRuntimeRayOfEnfeeblement.* from "./battle-runtime-ray-of-enfeeblement"
  import battleRuntimeRayOfEnfeeblementFacts.* from "./battle-runtime-ray-of-enfeeblement-facts"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeRayOfEnfeeblementDamageResolution.* from "./battle-runtime-ray-of-enfeeblement-damage-resolution"
  import battleRuntimeSpellSlotClassification.* from "./battle-runtime-spell-slot-classification"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"

  run test_spell_save_and_rider_facts = all {
{

        all {
          assert(saveGatedAreaObjectIgnitionOutcomes(FireballSaveGate, FireballObjectTarget, Fighter, ObjectFlammableUnattended) == Set(ObjectStartsBurning({
            object: FireballObjectTarget,
            source: Fighter,
            sourceSpell: Fireball,
          }))),
          assert(saveGatedAreaObjectIgnitionOutcomes(FireballSaveGate, FireballObjectTarget, Fighter, ObjectWornOrCarried) == Set()),
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
        }
      },
    {

        all {
          assert(attackBurstSaveDamageSpendsLevelOneSlot(IceKnifeAttackBurstSaveDamage)),
          assert(attackBurstSaveDamageAttackType(IceKnifeAttackBurstSaveDamage) == Piercing),
          assert(attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage) == Cold),
        }
      },
    {

        all {
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
        }
      },
    {
        val shiningSmiteIllumination = ShiningSmiteIllumination({ durationTicks: 10 })
        val rayFailure = resolveRayOfEnfeeblementD20Lifecycle(initialState, Goblin, false)
        val rayAfterRepeatSaveEffects =
          rayOfEnfeeblementD20LifecycleActiveEffectsAfterRepeatSave(rayFailure.goblin.activeEffects, Fighter, true)
        all {
          assert(not(rayOfEnfeeblementD20LifecycleConcentratingAfterEffectsChange(rayAfterRepeatSaveEffects, Fighter, rayFailure.fighter.concentrating))),
          assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(ProtectionFromEvilAndGoodCreatureTypeProtection), true) == DisadvantageSpellAttackRoll),
          assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(GuidingBoltNextAttackAdvantage, ProtectionFromEvilAndGoodCreatureTypeProtection), false) == NormalSpellAttackRoll),
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
        }
      },
    {
        val raySuccess = resolveRayOfEnfeeblementD20Lifecycle(initialState, Goblin, true)
        val rayAfterNextAttackEffects =
          rayOfEnfeeblementD20LifecycleActiveEffectsAfterNextAttack(raySuccess.goblin.activeEffects, Fighter)
        all {
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
          assert(not(rayAfterNextAttackEffects.contains(RayOfEnfeeblementNextAttackDisadvantage({ source: Fighter })))),
        }
      },
    {
        val shiningSmiteIllumination = ShiningSmiteIllumination({ durationTicks: 10 })
        all {
          assert(not(saveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveGate, BeastCreature))),
          assert(saveGatedConditionTargetCreatureTypeIsLegal(HoldMonsterSaveGate, HumanoidCreature)),
          assert(saveGatedConditionTargetCreatureTypeIsLegal(HoldMonsterSaveGate, BeastCreature)),
          assert(saveGatedConditionTargetCreatureTypeIsLegal(HoldMonsterSaveGate, UndeadCreature)),
          assert(not(saveGatedConditionRequiresConditionChoice(HoldPersonSaveGate))),
          assert(not(saveGatedConditionRequiresConditionChoice(HoldMonsterSaveGate))),
          assert(spellAttackRollModeFromActiveEffects(Set(), Set(GuidingBoltNextAttackAdvantage), false) == AdvantageSpellAttackRoll),
          assert(spellAttackRollModeFromActiveEffects(Set(), Set(shiningSmiteIllumination), true) == AdvantageSpellAttackRoll),
          assert(spellAttackRollModeFromActiveEffects(Set(), Set(shiningSmiteIllumination), false) == AdvantageSpellAttackRoll),
          assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(), true) == DisadvantageSpellAttackRoll),
          assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(GuidingBoltNextAttackAdvantage), true) == NormalSpellAttackRoll),
          assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(shiningSmiteIllumination), true) == NormalSpellAttackRoll),
          assert(spellAttackRollModeFromBlurredActiveEffects(Set(), Set(Blurred), true, false) == DisadvantageSpellAttackRoll),
          assert(spellAttackRollModeFromBlurredActiveEffects(Set(), Set(Blurred), true, true) == NormalSpellAttackRoll),
          assert(activeEffectsWithoutSpellEffectConcentration(Set(Blurred)) == Set()),
          assert(activeEffectsWithoutSpellEffectConcentration(Set(RayOfEnfeeblementNextAttackDisadvantage({ source: Fighter }))) == Set()),
        }
      },
    {
        val animalFriendshipCharmed = AnimalFriendshipCharmed({ source: Fighter, durationTicks: 24 * 60 })
        val goblinAnimalFriendshipCharmed = AnimalFriendshipCharmed({ source: Goblin, durationTicks: 24 * 60 })
        val shiningSmiteIllumination = ShiningSmiteIllumination({ durationTicks: 10 })
        all {
          assert(saveGatedConditionFailedSaveActiveEffects(EntangleSaveGate, initialState, Fighter) == Set(EntangleRestrained)),
          assert(activeEffectsDenyInvisibleBenefit(Set(shiningSmiteIllumination))),
          assert(activeEffectsDenyInvisibleBenefit(Set(StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 2 })))),
          assert(not(activeEffectsDenyInvisibleBenefit(Set(GuidingBoltNextAttackAdvantage)))),
          assert(saveGatedConditionTargeting(AnimalFriendshipSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
          assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(AnimalFriendshipSaveGate), 1) == 1),
          assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(AnimalFriendshipSaveGate), 2) == 2),
          assert(saveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveGate, BeastCreature)),
          assert(not(saveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveGate, HumanoidCreature))),
          assert(saveGatedConditionFailedSaveActiveEffects(AnimalFriendshipSaveGate, initialState, Fighter) == Set(animalFriendshipCharmed)),
          assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed), Fighter, Set()) == Set()),
          assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed), Goblin, Set(Fighter)) == Set()),
          assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed), Goblin, Set()) == Set(animalFriendshipCharmed)),
          assert(activeEffectsAfterTargetDamagedByCasterOrAlly(Set(animalFriendshipCharmed, goblinAnimalFriendshipCharmed), Fighter, Set()) == Set(goblinAnimalFriendshipCharmed)),
          assert(saveGatedConditionTargeting(CharmPersonSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
          assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(CharmPersonSaveGate), 1) == 1),
          assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(CharmPersonSaveGate), 2) == 2),
        }
      },
{
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
        all {
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
        }
      },
    {

        all {
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
        }
      },
    {

        all {
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
        }
      },
    {

        all {
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
        }
      },
    {
        all {
          assert(saveGatedConditionTargeting(HoldPersonSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 2, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
          assert(saveGatedConditionTargeting(HoldMonsterSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 5, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
          assert(saveGatedConditionSavingThrowAbility(HoldPersonSaveGate) == WisAbility),
          assert(saveGatedConditionSavingThrowAbility(HoldMonsterSaveGate) == WisAbility),
          assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(HoldPersonSaveGate), 2) == 1),
          assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(HoldPersonSaveGate), 3) == 2),
          assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(HoldMonsterSaveGate), 5) == 1),
          assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(HoldMonsterSaveGate), 6) == 2),
          assert(saveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveGate, HumanoidCreature)),
        }
      },
  }
}
