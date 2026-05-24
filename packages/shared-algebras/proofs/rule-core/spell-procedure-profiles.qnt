// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-damage-save-or-attack spell.hit-point-restoration spell.reaction-shield spell.readied-action-time-spell
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.SPELL.HIT_POINT_RESTORATION

module spellProcedureProfiles {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import spellDefinitionProfiles.* from "./spell-definition-profiles"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"
  import spellInvocationTargetCardinalityCore.* from "./spell-invocation-target-cardinality-core"
  import spellDamageProjectionCore.* from "./spell-damage-projection-core"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots, cantrips, Casting Time,
  //   targets, Saving Throws, Attack Rolls, and spell effects.
  // - Rules-Glossary.md: Ready, Magic, Concentration, Spell Attack, Target.
  // - Spells/Descriptions-A-D.md: Acid Splash, Aid, and Cure Wounds.
  // - Spells/Descriptions-E-L.md: Healing Word.
  // - Spells/Descriptions-M-P.md: Mage Armor, Magic Missile, Mass Cure
  //   Wounds, Mass Healing Word, and Mind Spike.
  // - Spells/Descriptions-Q-R.md: Ray of Frost.

  type SpellAttackDamageProfile =
    | RayOfFrostSpellAttackProfile
    | PoisonSpraySpellAttackProfile
    | ChillTouchSpellAttackProfile
    | StarryWispSpellAttackProfile
    | FireBoltSpellAttackProfile
    | ShockingGraspSpellAttackProfile
    | GuidingBoltSpellAttackProfile
    | RayOfSicknessSpellAttackProfile
    | ProduceFlameHurlSpellAttackProfile

  type SpellAttackDamageHitEffect =
    | RayOfFrostSpeedReductionHitEffect
    | ChillTouchHitPointRegainPreventionHitEffect
    | StarryWispInvisibleBenefitDeniedHitEffect
    | ShockingGraspOpportunityAttackDeniedHitEffect
    | GuidingBoltNextAttackAdvantageHitEffect
    | RayOfSicknessPoisonedHitEffect

  type SpellSaveGatedTargeting =
    | SpellSingleSaveTarget
    | SpellAreaSaveTargets
    | SpellTargetListSaveTargets({
        minTargets: int,
        baseSlotLevel: int,
        baseTargets: int,
        additionalTargetsPerSlotLevel: int,
      })

  type SpellSaveGatedDamageSuccess =
    | SpellNoDamageOnSaveSuccess
    | SpellHalfDamageOnSaveSuccess

  type SpellSavingThrowAbility =
    | SpellStrengthSavingThrow
    | SpellDexteritySavingThrow
    | SpellConstitutionSavingThrow
    | SpellWisdomSavingThrow

  type SpellSaveGatedDamageProfile =
    | AcidSplashSaveDamageProfile
    | SacredFlameSaveDamageProfile
    | InflictWoundsSaveDamageProfile
    | BurningHandsSaveDamageProfile
    | FireballSaveDamageProfile
    | LightningBoltSaveDamageProfile
    | ViciousMockerySaveDamageProfile
    | ThunderwaveSaveDamageProfile
    | DissonantWhispersSaveDamageProfile
    | HellishRebukeSaveDamageProfile
    | MindSpikeSaveDamageProfile

  type SpellSaveGatedConditionProfile =
    | ColorSpraySaveConditionProfile
    | EntangleSaveConditionProfile
    | AnimalFriendshipSaveConditionProfile
    | CharmPersonSaveConditionProfile
    | BlindnessDeafnessSaveConditionProfile
    | HoldPersonSaveConditionProfile
    | FaerieFireSaveAttackRollAdvantageProfile

  type SpellSaveGatedFailedEffect =
    | ViciousMockeryNextAttackDisadvantageEffect
    | ThunderwavePush10FeetEffect
    | DissonantWhispersForcedReactionMovementEffect
    | ColorSprayBlindedEffect
    | EntangleRestrainedEffect
    | AnimalFriendshipCharmedEffect({ durationTicks: int })
    | CharmPersonCharmedEffect({ durationTicks: int })
    | BlindnessDeafnessBlindedEffect({ durationTicks: int })
    | BlindnessDeafnessDeafenedEffect({ durationTicks: int })
    | HoldPersonParalyzedEffect({ durationTicks: int })
    | FaerieFireOutlineEffect

  type ScalarBuffSpellProfile =
    | FalseLifeScalarBuffProfile
    | LongstriderScalarBuffProfile
    | ShieldOfFaithScalarBuffProfile
    | SpiderClimbScalarBuffProfile
    | FlyScalarBuffProfile
    | BarkskinScalarBuffProfile
    | HeroismScalarBuffProfile
    | AidScalarBuffProfile

  type ScalarBuffEffect =
    | LongstriderSpeedIncreaseEffect
    | ShieldOfFaithArmorClassBonusEffect
    | SpiderClimbClimbSpeedGrantEffect
    | FlySpeedHoverGrantEffect
    | BarkskinArmorClassFloorEffect
    | HeroismFrightenedImmunityEffect
    | HeroismTurnStartTemporaryHitPointsEffect({ amount: int })
    | AidHitPointMaximumIncreaseEffect({ amount: int })

  type DamageRiderSpellProfile =
    | DivineFavorWeaponDamageRiderProfile
    | DivineSmiteAfterHitDamageProfile
    | HuntersMarkMarkedDamageRiderProfile
    | EnsnaringStrikeAfterHitConditionProfile
    | SearingSmiteAfterHitTimedDamageProfile
    | ShiningSmiteAfterHitDamageIlluminationProfile

  type ChainedSpellAttackDamageProfile =
    | ChromaticOrbChainedSpellAttackProfile

  type ChainedSpellAttackDamageTypeChoice =
    | ChainedSpellAttackAcidDamage
    | ChainedSpellAttackColdDamage
    | ChainedSpellAttackFireDamage
    | ChainedSpellAttackLightningDamage
    | ChainedSpellAttackPoisonDamage
    | ChainedSpellAttackThunderDamage

  type ChainedSpellAttackD8FaceCounts = {
    face1: int,
    face2: int,
    face3: int,
    face4: int,
    face5: int,
    face6: int,
    face7: int,
    face8: int,
  }

  type AttackBurstSaveDamageProfile =
    | IceKnifeAttackBurstSaveDamageProfile

  type SpellAttackSequenceProfile =
    | EldritchBlastBeamSequenceProfile
    | ScorchingRaySequenceProfile

  type SpellAttackSequenceStep =
    | SpellAttackSequenceUnavailable
    | SpellAttackSequenceNeedsTargets
    | SpellAttackSequenceNeedsAttackRoll
    | SpellAttackSequenceNeedsDamageRoll
    | SpellAttackSequenceComplete

  type SleepRepeatSaveLifecycle =
    | NoSleepRepeatSaveLifecycle
    | PendingSleepRepeatSaveLifecycle({ hadIncapacitated: bool })
    | UnconsciousSleepRepeatSaveLifecycle({
        hadIncapacitated: bool,
        hadUnconscious: bool,
      })

  type ObjectHitPointDamageFacts = {
    rolledDamage: int,
    priorHitPoints: int,
    damageThreshold: int,
  }

  type ObjectHitPointDamageResult = {
    effectiveDamage: int,
    priorHitPoints: int,
    nextHitPoints: int,
    destroyed: bool,
  }

  type SpellAreaProfile =
    | NoSpellAreaProfile
    | MassCureWoundsPointOriginSphereArea

  type ReadiedSpellProfile =
    | ReadiedMagicMissileSpellProfile
    | ReadiedRayOfFrostSpellProfile
    | ReadiedAcidSplashSpellProfile
    | ReadiedMageArmorSpellProfile

  type SpellInvocationFacts = {
    profile: SpellDefinitionProfile,
    hasSpellAccess: bool,
    selectedSlotLevel: int,
    targetCount: int,
    targetsAreValid: bool,
  }

  type MagicMissileEffectFacts = {
    slotLevel: int,
    allocatedDarts: int,
    dartDamageRoll: int,
  }

  type RayOfFrostEffectFacts = {
    attackRoll: AttackRollProcedureFacts,
    baseDamageDice: int,
    rolledDamageDiceCount: int,
    damageRoll: int,
  }

  type SaveDamageSpellEffectFacts = {
    savingThrowFailed: bool,
    damageRoll: int,
  }

  type DirectHitPointRestorationEffectFacts = {
    profile: SpellDefinitionProfile,
    slotLevel: int,
    healingDiceRoll: int,
    spellcastingAbilityModifier: int,
  }

  type MageArmorEffectFacts = {
    willingTarget: bool,
    targetWearingArmor: bool,
    dexterityModifier: int,
  }

  type SpellEffect =
    | NoSpellEffect
    | RayOfFrostSpeedReductionEffect
    | MageArmorActiveEffect

  type ReadiedSpellHeldEffect =
    | NoReadiedSpellHeldEffect
    | HeldReadiedSpellEffect({ profile: ReadiedSpellProfile })

  type DamageSpellEffectResult = {
    damageAmount: int,
    damageType: RuleDamageType,
    effect: SpellEffect,
  }

  type MageArmorResult = {
    effect: SpellEffect,
    baseArmorClass: int,
  }

  type ReadiedSpellProcedureState = {
    reaction: ReactionProtocolState,
    heldEffect: ReadiedSpellHeldEffect,
  }

  type ReadiedSpellRelease =
    | NoReadiedSpellRelease
    | ReleasedMagicMissileSpell
    | ReleasedRayOfFrostSpell
    | ReleasedAcidSplashSpell
    | ReleasedMageArmorSpell

  type ReadiedSpellReleaseResult = {
    readiedSpell: ReadiedSpellProcedureState,
    released: ReadiedSpellRelease,
  }

  type ReadiedSpellHoldResult = {
    spellcasting: SpellcastingProcedureState,
    readiedSpell: ReadiedSpellProcedureState,
    held: bool,
    slotExpended: bool,
  }

  pure def initialReadiedSpellProcedureState: ReadiedSpellProcedureState = {
    reaction: initialReactionProtocolState,
    heldEffect: NoReadiedSpellHeldEffect,
  }

  pure def legalSpellEffects: Set[SpellEffect] = Set(
    NoSpellEffect,
    RayOfFrostSpeedReductionEffect,
    MageArmorActiveEffect
  )

  pure def legalReadiedSpellHeldEffects: Set[ReadiedSpellHeldEffect] = Set(
    NoReadiedSpellHeldEffect,
    HeldReadiedSpellEffect({ profile: ReadiedMagicMissileSpellProfile }),
    HeldReadiedSpellEffect({ profile: ReadiedRayOfFrostSpellProfile }),
    HeldReadiedSpellEffect({ profile: ReadiedAcidSplashSpellProfile }),
    HeldReadiedSpellEffect({ profile: ReadiedMageArmorSpellProfile })
  )

  pure def legalSpellEffect(effect: SpellEffect): bool =
    effect.in(legalSpellEffects)

  pure def legalReadiedSpellHeldEffect(effect: ReadiedSpellHeldEffect): bool =
    effect.in(legalReadiedSpellHeldEffects)

  pure def legalReadiedSpellProcedureState(state: ReadiedSpellProcedureState): bool = all {
    legalReactionProtocolState(state.reaction),
    legalReadiedSpellHeldEffect(state.heldEffect),
  }

  pure def legalReadiedSpellRelease(release: ReadiedSpellRelease): bool =
    release.in(Set(
      NoReadiedSpellRelease,
      ReleasedMagicMissileSpell,
      ReleasedRayOfFrostSpell,
      ReleasedAcidSplashSpell,
      ReleasedMageArmorSpell
    ))

  pure def spellProfileAction(profile: SpellDefinitionProfile): SpellInvocationAction =
    if (profile == HealingWordSpellProfile or profile == MassHealingWordSpellProfile) BonusActionSpellInvocation
    else ActionTimeSpellInvocation

  pure def spellProfileMinimumSlotLevel(profile: SpellDefinitionProfile): int =
    if (profile == RayOfFrostSpellProfile or profile == AcidSplashSpellProfile) 0
    else if (profile == MassHealingWordSpellProfile) 3
    else if (profile == MassCureWoundsSpellProfile) 5
    else 1

  pure def spellProfileArea(profile: SpellDefinitionProfile): SpellAreaProfile =
    if (profile == MassCureWoundsSpellProfile) MassCureWoundsPointOriginSphereArea else NoSpellAreaProfile

  val massCureWoundsPointOriginSphereRadiusFeet = 30

  pure def spellProfileSlotSpend(profile: SpellDefinitionProfile): SpellInvocationSlotSpend = {
    val minimumSlot = spellProfileMinimumSlotLevel(profile)
    if (minimumSlot == 0) SpellInvocationWithoutSlot
    else SpellInvocationWithSlot({ minimumSlotLevel: minimumSlot })
  }

  pure def spellProfileRequiresSlot(profile: SpellDefinitionProfile): bool =
    spellInvocationSlotSpendRequiresSlot(spellProfileSlotSpend(profile))

  pure def spellAttackDamageProfileDamageType(profile: SpellAttackDamageProfile): RuleDamageType =
    match profile {
      | RayOfFrostSpellAttackProfile => ColdDamage
      | PoisonSpraySpellAttackProfile => PoisonDamage
      | ChillTouchSpellAttackProfile => NecroticDamage
      | StarryWispSpellAttackProfile => RadiantDamage
      | FireBoltSpellAttackProfile => FireDamage
      | ShockingGraspSpellAttackProfile => LightningDamage
      | GuidingBoltSpellAttackProfile => RadiantDamage
      | RayOfSicknessSpellAttackProfile => PoisonDamage
      | ProduceFlameHurlSpellAttackProfile => FireDamage
    }

  pure def spellAttackDamageProfileHitEffects(profile: SpellAttackDamageProfile): Set[SpellAttackDamageHitEffect] =
    match profile {
      | RayOfFrostSpellAttackProfile => Set(RayOfFrostSpeedReductionHitEffect)
      | PoisonSpraySpellAttackProfile => Set()
      | ChillTouchSpellAttackProfile => Set(ChillTouchHitPointRegainPreventionHitEffect)
      | StarryWispSpellAttackProfile => Set(StarryWispInvisibleBenefitDeniedHitEffect)
      | FireBoltSpellAttackProfile => Set()
      | ShockingGraspSpellAttackProfile => Set(ShockingGraspOpportunityAttackDeniedHitEffect)
      | GuidingBoltSpellAttackProfile => Set(GuidingBoltNextAttackAdvantageHitEffect)
      | RayOfSicknessSpellAttackProfile => Set(RayOfSicknessPoisonedHitEffect)
      | ProduceFlameHurlSpellAttackProfile => Set()
    }

  pure def spellAttackDamageProfileSupportsObjectTarget(profile: SpellAttackDamageProfile): bool =
    profile == StarryWispSpellAttackProfile or profile == FireBoltSpellAttackProfile or profile == ProduceFlameHurlSpellAttackProfile

  pure def spellSaveGatedDamageTargeting(profile: SpellSaveGatedDamageProfile): SpellSaveGatedTargeting =
    match profile {
      | AcidSplashSaveDamageProfile => SpellAreaSaveTargets
      | SacredFlameSaveDamageProfile => SpellSingleSaveTarget
      | InflictWoundsSaveDamageProfile => SpellSingleSaveTarget
      | BurningHandsSaveDamageProfile => SpellAreaSaveTargets
      | FireballSaveDamageProfile => SpellAreaSaveTargets
      | LightningBoltSaveDamageProfile => SpellAreaSaveTargets
      | ViciousMockerySaveDamageProfile => SpellSingleSaveTarget
      | ThunderwaveSaveDamageProfile => SpellAreaSaveTargets
      | DissonantWhispersSaveDamageProfile => SpellSingleSaveTarget
      | HellishRebukeSaveDamageProfile => SpellSingleSaveTarget
      | MindSpikeSaveDamageProfile => SpellSingleSaveTarget
    }

  pure def spellSaveGatedDamageSuccess(profile: SpellSaveGatedDamageProfile): SpellSaveGatedDamageSuccess =
    match profile {
      | AcidSplashSaveDamageProfile => SpellNoDamageOnSaveSuccess
      | SacredFlameSaveDamageProfile => SpellNoDamageOnSaveSuccess
      | InflictWoundsSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | BurningHandsSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | FireballSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | LightningBoltSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | ViciousMockerySaveDamageProfile => SpellNoDamageOnSaveSuccess
      | ThunderwaveSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | DissonantWhispersSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | HellishRebukeSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | MindSpikeSaveDamageProfile => SpellHalfDamageOnSaveSuccess
    }

  pure def spellSaveGatedDamageType(profile: SpellSaveGatedDamageProfile): RuleDamageType =
    match profile {
      | AcidSplashSaveDamageProfile => AcidDamage
      | SacredFlameSaveDamageProfile => RadiantDamage
      | InflictWoundsSaveDamageProfile => NecroticDamage
      | BurningHandsSaveDamageProfile => FireDamage
      | FireballSaveDamageProfile => FireDamage
      | LightningBoltSaveDamageProfile => LightningDamage
      | ViciousMockerySaveDamageProfile => PsychicDamage
      | ThunderwaveSaveDamageProfile => ThunderDamage
      | DissonantWhispersSaveDamageProfile => PsychicDamage
      | HellishRebukeSaveDamageProfile => FireDamage
      | MindSpikeSaveDamageProfile => PsychicDamage
    }

  pure def spellSaveGatedDamageRequiresSlot(profile: SpellSaveGatedDamageProfile): bool =
    match profile {
      | AcidSplashSaveDamageProfile => false
      | SacredFlameSaveDamageProfile => false
      | InflictWoundsSaveDamageProfile => true
      | BurningHandsSaveDamageProfile => true
      | FireballSaveDamageProfile => true
      | LightningBoltSaveDamageProfile => true
      | ViciousMockerySaveDamageProfile => false
      | ThunderwaveSaveDamageProfile => true
      | DissonantWhispersSaveDamageProfile => true
      | HellishRebukeSaveDamageProfile => true
      | MindSpikeSaveDamageProfile => true
    }

  pure def spellSaveGatedDamageRequiresConcentration(profile: SpellSaveGatedDamageProfile): bool =
    match profile {
      | AcidSplashSaveDamageProfile => false
      | SacredFlameSaveDamageProfile => false
      | InflictWoundsSaveDamageProfile => false
      | BurningHandsSaveDamageProfile => false
      | FireballSaveDamageProfile => false
      | LightningBoltSaveDamageProfile => false
      | ViciousMockerySaveDamageProfile => false
      | ThunderwaveSaveDamageProfile => false
      | DissonantWhispersSaveDamageProfile => false
      | HellishRebukeSaveDamageProfile => false
      | MindSpikeSaveDamageProfile => true
    }

  pure def spellSaveGatedDamageFailedSaveEffects(profile: SpellSaveGatedDamageProfile): Set[SpellSaveGatedFailedEffect] =
    match profile {
      | ViciousMockerySaveDamageProfile => Set(ViciousMockeryNextAttackDisadvantageEffect)
      | ThunderwaveSaveDamageProfile => Set(ThunderwavePush10FeetEffect)
      | DissonantWhispersSaveDamageProfile => Set(DissonantWhispersForcedReactionMovementEffect)
      | _ => Set()
    }

  pure def spellSaveGatedConditionTargeting(profile: SpellSaveGatedConditionProfile): SpellSaveGatedTargeting =
    match profile {
      | ColorSpraySaveConditionProfile => SpellAreaSaveTargets
      | EntangleSaveConditionProfile => SpellAreaSaveTargets
      | AnimalFriendshipSaveConditionProfile => SpellTargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
      | CharmPersonSaveConditionProfile => SpellTargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
      | BlindnessDeafnessSaveConditionProfile => SpellTargetListSaveTargets({ minTargets: 1, baseSlotLevel: 2, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
      | HoldPersonSaveConditionProfile => SpellTargetListSaveTargets({ minTargets: 1, baseSlotLevel: 2, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
      | FaerieFireSaveAttackRollAdvantageProfile => SpellAreaSaveTargets
    }

  pure def spellSaveGatedConditionSavingThrowAbility(profile: SpellSaveGatedConditionProfile): SpellSavingThrowAbility =
    match profile {
      | ColorSpraySaveConditionProfile => SpellConstitutionSavingThrow
      | EntangleSaveConditionProfile => SpellStrengthSavingThrow
      | AnimalFriendshipSaveConditionProfile => SpellWisdomSavingThrow
      | CharmPersonSaveConditionProfile => SpellWisdomSavingThrow
      | BlindnessDeafnessSaveConditionProfile => SpellConstitutionSavingThrow
      | HoldPersonSaveConditionProfile => SpellWisdomSavingThrow
      | FaerieFireSaveAttackRollAdvantageProfile => SpellDexteritySavingThrow
    }

  pure def spellSaveGatedTargetMaxTargets(targeting: SpellSaveGatedTargeting, slotLevel: int): int =
    match targeting {
      | SpellTargetListSaveTargets(data) =>
        data.baseTargets +
          (if (slotLevel > data.baseSlotLevel)
            (slotLevel - data.baseSlotLevel) * data.additionalTargetsPerSlotLevel
          else
            0)
      | _ => 1
    }

  pure def spellSaveGatedConditionFailedSaveEffects(profile: SpellSaveGatedConditionProfile): Set[SpellSaveGatedFailedEffect] =
    match profile {
      | ColorSpraySaveConditionProfile => Set(ColorSprayBlindedEffect)
      | EntangleSaveConditionProfile => Set(EntangleRestrainedEffect)
      | AnimalFriendshipSaveConditionProfile => Set(AnimalFriendshipCharmedEffect({ durationTicks: 24 * 60 }))
      | CharmPersonSaveConditionProfile => Set(CharmPersonCharmedEffect({ durationTicks: 10 * 60 }))
      | BlindnessDeafnessSaveConditionProfile => Set(
          BlindnessDeafnessBlindedEffect({ durationTicks: 10 }),
          BlindnessDeafnessDeafenedEffect({ durationTicks: 10 })
        )
      | HoldPersonSaveConditionProfile => Set(HoldPersonParalyzedEffect({ durationTicks: 10 }))
      | FaerieFireSaveAttackRollAdvantageProfile => Set(FaerieFireOutlineEffect)
    }

  pure def spellSaveGatedConditionTargetCreatureTypeIsLegal(
    profile: SpellSaveGatedConditionProfile,
    targetIsBeast: bool,
    targetIsHumanoid: bool
  ): bool =
    match profile {
      | AnimalFriendshipSaveConditionProfile => targetIsBeast
      | CharmPersonSaveConditionProfile => targetIsHumanoid
      | BlindnessDeafnessSaveConditionProfile => true
      | HoldPersonSaveConditionProfile => targetIsHumanoid
      | _ => true
    }

  pure def spellSaveGatedConditionSavingThrowHasAdvantage(
    profile: SpellSaveGatedConditionProfile,
    targetIsHostile: bool
  ): bool =
    profile == CharmPersonSaveConditionProfile and targetIsHostile

  pure def scalarBuffSpellAction(profile: ScalarBuffSpellProfile): SpellInvocationAction =
    if (profile == ShieldOfFaithScalarBuffProfile or profile == BarkskinScalarBuffProfile) BonusActionSpellInvocation else ActionTimeSpellInvocation

  pure def scalarBuffMaximumTargets(profile: ScalarBuffSpellProfile, slotLevel: int): int =
    if (profile == LongstriderScalarBuffProfile) slotLevel
    else if (profile == SpiderClimbScalarBuffProfile) 1 + (if (slotLevel > 2) slotLevel - 2 else 0)
    else if (profile == FlyScalarBuffProfile) 1 + (if (slotLevel > 3) slotLevel - 3 else 0)
    else if (profile == AidScalarBuffProfile) 3
    else 1

  pure def scalarBuffTemporaryHitPoints(profile: ScalarBuffSpellProfile, slotLevel: int, rolledDice: int): int =
    if (profile == FalseLifeScalarBuffProfile) rolledDice + 4 + ((if (slotLevel > 1) slotLevel - 1 else 0) * 5)
    else 0

  pure def scalarBuffAidHitPointMaximumIncrease(slotLevel: int): int =
    5 + ((if (slotLevel > 2) slotLevel - 2 else 0) * 5)

  pure def scalarBuffEffects(
    profile: ScalarBuffSpellProfile,
    spellcastingAbilityModifier: int,
    slotLevel: int,
  ): Set[ScalarBuffEffect] =
    match profile {
      | FalseLifeScalarBuffProfile => Set()
      | LongstriderScalarBuffProfile => Set(LongstriderSpeedIncreaseEffect)
      | ShieldOfFaithScalarBuffProfile => Set(ShieldOfFaithArmorClassBonusEffect)
      | SpiderClimbScalarBuffProfile => Set(SpiderClimbClimbSpeedGrantEffect)
      | FlyScalarBuffProfile => Set(FlySpeedHoverGrantEffect)
      | BarkskinScalarBuffProfile => Set(BarkskinArmorClassFloorEffect)
      | HeroismScalarBuffProfile => Set(
          HeroismFrightenedImmunityEffect,
          HeroismTurnStartTemporaryHitPointsEffect({ amount: spellcastingAbilityModifier }),
        )
      | AidScalarBuffProfile => Set(AidHitPointMaximumIncreaseEffect({ amount: scalarBuffAidHitPointMaximumIncrease(slotLevel) }))
    }

  pure def scalarBuffRequiresConcentration(profile: ScalarBuffSpellProfile): bool =
    profile == ShieldOfFaithScalarBuffProfile or profile == SpiderClimbScalarBuffProfile or profile == FlyScalarBuffProfile or profile == HeroismScalarBuffProfile

  pure def damageRiderSpellAction(profile: DamageRiderSpellProfile): SpellInvocationAction =
    BonusActionSpellInvocation

  pure def damageRiderRequiresConcentration(profile: DamageRiderSpellProfile): bool =
    profile == HuntersMarkMarkedDamageRiderProfile
      or profile == EnsnaringStrikeAfterHitConditionProfile
      or profile == ShiningSmiteAfterHitDamageIlluminationProfile

  pure def divineFavorDamageType: RuleDamageType = RadiantDamage

  pure def divineFavorDurationTicks: int = 10

  pure def divineSmiteDamageType: RuleDamageType = RadiantDamage

  pure def divineSmiteDamageDice(slotLevel: int, targetFiendOrUndead: bool): int =
    2 + (if (slotLevel > 1) slotLevel - 1 else 0) + (if (targetFiendOrUndead) 1 else 0)

  pure def huntersMarkDamageType: RuleDamageType = ForceDamage

  pure def huntersMarkRangeFeet: int = 90

  pure def ensnaringStrikeDamageType: RuleDamageType = PiercingDamage

  pure def ensnaringStrikeDamageDice(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def ensnaringStrikeTargetHasSaveAdvantage(targetLargeOrLarger: bool): bool =
    targetLargeOrLarger

  pure def searingSmiteDamageType: RuleDamageType = FireDamage

  pure def searingSmiteDamageDice(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def searingSmiteDurationTicks: int = 10

  pure def shiningSmiteDamageType: RuleDamageType = RadiantDamage

  pure def shiningSmiteDamageDice(slotLevel: int): int =
    if (slotLevel < 2) 0 else slotLevel

  pure def shiningSmiteBrightLightRadiusFeet: int = 5

  pure def shiningSmiteDurationTicks: int = 10

  pure def chainedSpellAttackDamageChoices(
    profile: ChainedSpellAttackDamageProfile
  ): Set[ChainedSpellAttackDamageTypeChoice] =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile => Set(
          ChainedSpellAttackAcidDamage,
          ChainedSpellAttackColdDamage,
          ChainedSpellAttackFireDamage,
          ChainedSpellAttackLightningDamage,
          ChainedSpellAttackPoisonDamage,
          ChainedSpellAttackThunderDamage,
        )
    }

  pure def chainedSpellAttackDamageType(choice: ChainedSpellAttackDamageTypeChoice): RuleDamageType =
    match choice {
      | ChainedSpellAttackAcidDamage => AcidDamage
      | ChainedSpellAttackColdDamage => ColdDamage
      | ChainedSpellAttackFireDamage => FireDamage
      | ChainedSpellAttackLightningDamage => LightningDamage
      | ChainedSpellAttackPoisonDamage => PoisonDamage
      | ChainedSpellAttackThunderDamage => ThunderDamage
    }

  pure def chainedSpellAttackDamageBaseSpellLevel(profile: ChainedSpellAttackDamageProfile): int =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile => 1
    }

  pure def chainedSpellAttackDamageDieSize(profile: ChainedSpellAttackDamageProfile): int =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile => 8
    }

  pure def chainedSpellAttackDamageSlotLevelIsLegal(profile: ChainedSpellAttackDamageProfile, slotLevel: int): bool =
    slotLevel >= chainedSpellAttackDamageBaseSpellLevel(profile)

  pure def chainedSpellAttackDamageLeapCountIsLegal(
    profile: ChainedSpellAttackDamageProfile,
    slotLevel: int,
    leapsUsed: int,
  ): bool =
    chainedSpellAttackDamageSlotLevelIsLegal(profile, slotLevel) and
    leapsUsed >= 0 and
    leapsUsed <= slotLevel

  pure def chainedSpellAttackDamageDice(profile: ChainedSpellAttackDamageProfile, slotLevel: int): int =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile => 3 + (slotLevel - chainedSpellAttackDamageBaseSpellLevel(profile))
    }

  pure def chainedSpellAttackDamageRolledD8Count(
    profile: ChainedSpellAttackDamageProfile,
    slotLevel: int,
    criticalHit: bool,
  ): int = {
    val ordinaryDice = chainedSpellAttackDamageDice(profile, slotLevel)
    if (criticalHit) ordinaryDice * 2 else ordinaryDice
  }

  pure def chainedSpellAttackD8FaceCountTotal(counts: ChainedSpellAttackD8FaceCounts): int =
    counts.face1 +
    counts.face2 +
    counts.face3 +
    counts.face4 +
    counts.face5 +
    counts.face6 +
    counts.face7 +
    counts.face8

  pure def chainedSpellAttackD8FaceCountsAreNonNegative(counts: ChainedSpellAttackD8FaceCounts): bool =
    counts.face1 >= 0 and
    counts.face2 >= 0 and
    counts.face3 >= 0 and
    counts.face4 >= 0 and
    counts.face5 >= 0 and
    counts.face6 >= 0 and
    counts.face7 >= 0 and
    counts.face8 >= 0

  pure def chainedSpellAttackD8FaceCountsMatchRolledDice(
    profile: ChainedSpellAttackDamageProfile,
    slotLevel: int,
    criticalHit: bool,
    counts: ChainedSpellAttackD8FaceCounts,
  ): bool =
    chainedSpellAttackDamageSlotLevelIsLegal(profile, slotLevel) and
    chainedSpellAttackD8FaceCountsAreNonNegative(counts) and
    chainedSpellAttackD8FaceCountTotal(counts) == chainedSpellAttackDamageRolledD8Count(profile, slotLevel, criticalHit)

  pure def chainedSpellAttackDamageRollHasDuplicateD8Face(counts: ChainedSpellAttackD8FaceCounts): bool =
    counts.face1 >= 2 or
    counts.face2 >= 2 or
    counts.face3 >= 2 or
    counts.face4 >= 2 or
    counts.face5 >= 2 or
    counts.face6 >= 2 or
    counts.face7 >= 2 or
    counts.face8 >= 2

  pure def chainedSpellAttackDamageCanLeap(
    profile: ChainedSpellAttackDamageProfile,
    slotLevel: int,
    leapsUsed: int,
    criticalHit: bool,
    counts: ChainedSpellAttackD8FaceCounts,
  ): bool =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile =>
          chainedSpellAttackD8FaceCountsMatchRolledDice(profile, slotLevel, criticalHit, counts) and
          chainedSpellAttackDamageRollHasDuplicateD8Face(counts) and
          leapsUsed >= 0 and
          leapsUsed < slotLevel
    }

  pure def attackBurstSaveDamageRequiresSlot(profile: AttackBurstSaveDamageProfile): bool =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => true
    }

  pure def attackBurstSaveDamageAttackType(profile: AttackBurstSaveDamageProfile): RuleDamageType =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => PiercingDamage
    }

  pure def attackBurstSaveDamageBurstType(profile: AttackBurstSaveDamageProfile): RuleDamageType =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => ColdDamage
    }

  pure def attackBurstSaveDamageBurstDice(profile: AttackBurstSaveDamageProfile, slotLevel: int): int =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => if (slotLevel < 1) 0 else 2 + (slotLevel - 1)
    }

  pure def attackBurstSaveDamageBurstAmount(damageRoll: int, savingThrowSucceeded: bool): int =
    if (savingThrowSucceeded) 0 else damageRoll

  pure def spellAttackSequenceDamageType(profile: SpellAttackSequenceProfile): RuleDamageType =
    match profile {
      | EldritchBlastBeamSequenceProfile => ForceDamage
      | ScorchingRaySequenceProfile => FireDamage
    }

  pure def spellAttackSequenceSupportsObjectTargets(profile: SpellAttackSequenceProfile): bool =
    match profile {
      | EldritchBlastBeamSequenceProfile => true
      | ScorchingRaySequenceProfile => true
    }

  pure def spellAttackSequenceAttackCount(profile: SpellAttackSequenceProfile, scalingLevel: int): int =
    match profile {
      | EldritchBlastBeamSequenceProfile =>
          if (scalingLevel >= 17) 4
          else if (scalingLevel >= 11) 3
          else if (scalingLevel >= 5) 2
          else 1
      | ScorchingRaySequenceProfile =>
          if (scalingLevel < 2) 0
          else 3 + (scalingLevel - 2)
    }

  pure def spellAttackSequenceStepFromCounts(
    canCastSpells: bool,
    attackCount: int,
    targetsFilled: int,
    attackRollsFilled: int,
    hits: int,
    damageRollsFilled: int,
  ): SpellAttackSequenceStep =
    if (not(canCastSpells) or attackCount <= 0)
      SpellAttackSequenceUnavailable
    else if (targetsFilled < attackCount)
      SpellAttackSequenceNeedsTargets
    else if (attackRollsFilled < attackCount)
      SpellAttackSequenceNeedsAttackRoll
    else if (damageRollsFilled < hits)
      SpellAttackSequenceNeedsDamageRoll
    else
      SpellAttackSequenceComplete

  pure def spellAttackSequenceStep(
    profile: SpellAttackSequenceProfile,
    canCastSpells: bool,
    attackCount: int,
    targetsFilled: int,
    attackRollsFilled: int,
    hits: int,
    damageRollsFilled: int,
  ): SpellAttackSequenceStep =
    match profile {
      | EldritchBlastBeamSequenceProfile =>
          spellAttackSequenceStepFromCounts(canCastSpells, attackCount, targetsFilled, attackRollsFilled, hits, damageRollsFilled)
      | ScorchingRaySequenceProfile =>
          spellAttackSequenceStepFromCounts(canCastSpells, attackCount, targetsFilled, attackRollsFilled, hits, damageRollsFilled)
    }

  pure def sleepInitialSaveLifecycle(
    savingThrowSucceeded: bool,
    hadIncapacitated: bool,
  ): SleepRepeatSaveLifecycle =
    if (savingThrowSucceeded)
      NoSleepRepeatSaveLifecycle
    else
      PendingSleepRepeatSaveLifecycle({ hadIncapacitated: hadIncapacitated })

  pure def sleepSavingThrowAutomaticallySucceeds(
    targetDoesNotSleep: bool,
    targetHasExhaustionImmunity: bool,
  ): bool =
    targetDoesNotSleep or targetHasExhaustionImmunity

  pure def sleepRepeatSaveLifecycle(
    pending: SleepRepeatSaveLifecycle,
    savingThrowSucceeded: bool,
    hadUnconscious: bool,
  ): SleepRepeatSaveLifecycle =
    match pending {
      | PendingSleepRepeatSaveLifecycle(data) =>
          if (savingThrowSucceeded)
            NoSleepRepeatSaveLifecycle
          else
            UnconsciousSleepRepeatSaveLifecycle({
              hadIncapacitated: data.hadIncapacitated,
              hadUnconscious: hadUnconscious,
            })
      | _ => pending
    }

  pure def sleepEffectEndsOnDamage: bool = true

  pure def sleepEffectEndsOnAdjacentShakeAwakeAction: bool = true

  pure def objectHitPointEffectiveDamage(rolledDamage: int, damageThreshold: int): int =
    if (damageThreshold > 0 and rolledDamage < damageThreshold) 0 else rolledDamage

  pure def objectHitPointDamageResult(facts: ObjectHitPointDamageFacts): ObjectHitPointDamageResult = {
    val effectiveDamage = objectHitPointEffectiveDamage(facts.rolledDamage, facts.damageThreshold)
    val nextHitPoints = if (facts.priorHitPoints - effectiveDamage < 0) 0 else facts.priorHitPoints - effectiveDamage
    {
      effectiveDamage: effectiveDamage,
      priorHitPoints: facts.priorHitPoints,
      nextHitPoints: nextHitPoints,
      destroyed: nextHitPoints == 0,
    }
  }

  pure def turnStartTemporaryHitPoints(
    existingTemporaryHitPoints: int,
    grantedTemporaryHitPoints: int
  ): int =
    if (existingTemporaryHitPoints > grantedTemporaryHitPoints)
      existingTemporaryHitPoints
    else
      grantedTemporaryHitPoints

  pure def oncePerTurnSpellEffectUsedAtTurnStart: bool = false

  pure def oneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn: bool = true

  pure def timedSpellEffectDurationAfterRoundTick(durationTicks: int): int =
    durationTicks - 1

  pure def timedSpellEffectRemainsActive(durationTicks: int): bool =
    durationTicks > 0

  pure def spellInvocationResourceFacts(
    facts: SpellInvocationFacts
  ): SpellInvocationResourceFacts = {
    invocationAction: spellProfileAction(facts.profile),
    hasSpellAccess: facts.hasSpellAccess,
    slotSpend: spellProfileSlotSpend(facts.profile),
    selectedSlotLevel: facts.selectedSlotLevel,
    targetCount: facts.targetCount,
    targetCardinality: spellInvocationTargetCardinality(facts.profile, facts.selectedSlotLevel),
    targetsAreValid: facts.targetsAreValid,
  }

  pure def legalSpellInvocationFacts(facts: SpellInvocationFacts): bool =
    legalSpellInvocationResourceFacts(spellInvocationResourceFacts(facts))

  pure def resolveSpellInvocation(
    state: SpellcastingProcedureState,
    facts: SpellInvocationFacts
  ): SpellInvocationResult =
    resolveSpellInvocationResource(state, spellInvocationResourceFacts(facts))

  pure def spellInvocationCanAffectTargets(
    invocation: SpellInvocationResult,
    facts: SpellInvocationFacts
  ): bool =
    spellInvocationResourceCanAffectTargets(
      invocation,
      spellInvocationResourceFacts(facts)
    )

  pure def rayOfFrostMaximumBaseDamageDice: int = 4

  pure def magicMissileDirectDamageFacts(
    facts: MagicMissileEffectFacts
  ): DirectSpellDamageFacts = {
    damageType: ForceDamage,
    instanceCount: facts.allocatedDarts,
    damagePerInstance: facts.dartDamageRoll,
    minimumInstanceCount: 1,
    maximumInstanceCount: magicMissileDartCount(facts.slotLevel),
    minimumDamagePerInstance: 2,
    maximumDamagePerInstance: 5,
  }

  pure def legalMagicMissileEffectFacts(facts: MagicMissileEffectFacts): bool = all {
    facts.slotLevel >= 1,
    facts.slotLevel <= 9,
    legalDirectSpellDamageFacts(magicMissileDirectDamageFacts(facts)),
  }

  pure def resolveMagicMissileDamage(facts: MagicMissileEffectFacts): DamageSpellEffectResult = {
    val result = resolveDirectSpellDamage(magicMissileDirectDamageFacts(facts))
    if (facts.slotLevel < 1 or facts.slotLevel > 9) {
      damageAmount: 0,
      damageType: ForceDamage,
      effect: NoSpellEffect,
    } else {
      damageAmount: result.damageAmount,
      damageType: result.damageType,
      effect: NoSpellEffect,
    }
  }

  pure def resolveRayOfFrostEffect(facts: RayOfFrostEffectFacts): DamageSpellEffectResult = {
    val result = resolveSpellAttackDamageBranch({
      attackRoll: facts.attackRoll,
      damageType: ColdDamage,
      hitProjections: Set(SpellAttackSpeedReductionHitProjection),
      baseDamageDice: facts.baseDamageDice,
      maximumBaseDamageDice: rayOfFrostMaximumBaseDamageDice,
      rolledDamageDiceCount: facts.rolledDamageDiceCount,
      damageDieSize: 8,
      damageRoll: facts.damageRoll,
    })
    {
      damageAmount: result.damageAmount,
      damageType: result.damageType,
      effect:
        if (result.hitProjections.contains(SpellAttackSpeedReductionHitProjection))
          RayOfFrostSpeedReductionEffect
        else
          NoSpellEffect,
    }
  }

  pure def resolveAcidSplashEffect(facts: SaveDamageSpellEffectFacts): DamageSpellEffectResult = {
    val result = resolveSpellSaveDamageBranch({
      damageType: AcidDamage,
      successPolicy: SpellNoDamageOnSuccessfulSave,
      failedSaveProjections: Set(),
      savingThrowFailed: facts.savingThrowFailed,
      damageRoll: facts.damageRoll,
    })
    {
      damageAmount: result.damageAmount,
      damageType: result.damageType,
      effect: NoSpellEffect,
    }
  }

  pure def directHitPointRestorationDiceCount(
    profile: SpellDefinitionProfile,
    slotLevel: int
  ): int =
    if (profile == CureWoundsSpellProfile) 2 + (2 * (slotLevel - 1))
    else if (profile == MassHealingWordSpellProfile) 2 + (slotLevel - 3)
    else if (profile == MassCureWoundsSpellProfile) 5 + (slotLevel - 5)
    else 2 + (2 * (slotLevel - 1))

  pure def directHitPointRestorationDieSize(profile: SpellDefinitionProfile): int =
    if (profile == CureWoundsSpellProfile or profile == MassCureWoundsSpellProfile) 8 else 4

  pure def legalDirectHitPointRestorationEffectFacts(facts: DirectHitPointRestorationEffectFacts): bool = {
    val diceCount = directHitPointRestorationDiceCount(facts.profile, facts.slotLevel)
    val dieSize = directHitPointRestorationDieSize(facts.profile)
    all {
      facts.profile.in(Set(HealingWordSpellProfile, CureWoundsSpellProfile, MassHealingWordSpellProfile, MassCureWoundsSpellProfile)),
      facts.slotLevel >= spellProfileMinimumSlotLevel(facts.profile),
      facts.slotLevel <= 9,
      facts.healingDiceRoll >= diceCount,
      facts.healingDiceRoll <= diceCount * dieSize,
      facts.spellcastingAbilityModifier >= -5,
      facts.spellcastingAbilityModifier <= 10,
    }
  }

  pure def resolveDirectHitPointRestorationEffect(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery,
    facts: DirectHitPointRestorationEffectFacts
  ): HitPointRecoveryResult =
    if (not(legalDirectHitPointRestorationEffectFacts(facts))) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      positiveHitPointUnconsciousRecovery: recovery,
      hitPointsRegained: 0,
    } else {
      applyHitPointHealing(
        vitals,
        lifecycle,
        recovery,
        facts.healingDiceRoll + facts.spellcastingAbilityModifier
      )
    }

  pure def resolveMageArmorEffect(facts: MageArmorEffectFacts): MageArmorResult =
    if (facts.willingTarget and not(facts.targetWearingArmor) and facts.dexterityModifier >= -5 and facts.dexterityModifier <= 10) {
      effect: MageArmorActiveEffect,
      baseArmorClass: 13 + facts.dexterityModifier,
    } else {
      effect: NoSpellEffect,
      baseArmorClass: 0,
    }

  pure def endMageArmorIfTargetDonsArmor(effect: SpellEffect, targetDonsArmor: bool): SpellEffect =
    if (effect == MageArmorActiveEffect and targetDonsArmor) NoSpellEffect else effect

  pure def asReadiedSpellProfile(profile: SpellDefinitionProfile): ReadiedSpellHeldEffect =
    if (profile == MagicMissileSpellProfile) {
      HeldReadiedSpellEffect({ profile: ReadiedMagicMissileSpellProfile })
    } else if (profile == RayOfFrostSpellProfile) {
      HeldReadiedSpellEffect({ profile: ReadiedRayOfFrostSpellProfile })
    } else if (profile == AcidSplashSpellProfile) {
      HeldReadiedSpellEffect({ profile: ReadiedAcidSplashSpellProfile })
    } else if (profile == MageArmorSpellProfile) {
      HeldReadiedSpellEffect({ profile: ReadiedMageArmorSpellProfile })
    } else {
      NoReadiedSpellHeldEffect
    }

  pure def isHeldReadiedSpellEffect(effect: ReadiedSpellHeldEffect): bool =
    match effect {
      | HeldReadiedSpellEffect(_) => true
      | NoReadiedSpellHeldEffect => false
    }

  pure def readiedSpellReleaseForHeldEffect(effect: ReadiedSpellHeldEffect): ReadiedSpellRelease =
    match effect {
      | HeldReadiedSpellEffect(v) =>
        if (v.profile == ReadiedMagicMissileSpellProfile) ReleasedMagicMissileSpell
        else if (v.profile == ReadiedRayOfFrostSpellProfile) ReleasedRayOfFrostSpell
        else if (v.profile == ReadiedAcidSplashSpellProfile) ReleasedAcidSplashSpell
        else ReleasedMageArmorSpell
      | NoReadiedSpellHeldEffect => NoReadiedSpellRelease
    }

  pure def readiedSpellDissipationWindow(window: ReactionWindowState): ReactionWindowState =
    if (reactionWindowIsKind(window, ReadiedSpellReactionWindow)) {
      advanceContinuation(window)
    } else window

  pure def dissipateReadiedSpellIfConcentrationBroken(
    state: ReadiedSpellProcedureState
  ): ReadiedSpellProcedureState =
    if (isHeldReadiedSpellEffect(state.heldEffect)
      and state.reaction.concentration.reactor == NoConcentration) {
      {
        reaction: state.reaction.with(
          "reactionWindow",
          readiedSpellDissipationWindow(state.reaction.reactionWindow)
        ),
        heldEffect: NoReadiedSpellHeldEffect,
      }
    } else state

  pure def holdReadiedSpellResponse(
    spellcasting: SpellcastingProcedureState,
    state: ReadiedSpellProcedureState,
    facts: SpellInvocationFacts,
    triggerSelected: bool,
    canConcentrate: bool
  ): ReadiedSpellHoldResult = {
    val held = asReadiedSpellProfile(facts.profile)
    val resourceFacts = spellInvocationResourceFacts(facts)
    val spent = spendActionCost(spellcasting.turn, StandardActionCost(ReadyAction))
    val admitted = all {
      triggerSelected,
      canConcentrate,
      isHeldReadiedSpellEffect(held),
      facts.hasSpellAccess,
      legalSpellInvocationFacts(facts),
      legalSpellcastingProcedureState(spellcasting),
      spent != spellcasting.turn,
      canSpendSpellSlot(spellcasting.slotLedger, resourceFacts, spellcasting.slotSpellCastThisTurn),
    }
    val slotExpended = admitted and spellInvocationResourceRequiresSlot(resourceFacts)
    if (not(admitted)) {
      spellcasting: spellcasting,
      readiedSpell: state,
      held: false,
      slotExpended: false,
    } else {
      spellcasting: {
        turn: spent,
        slotLedger: spendSpellSlot(spellcasting.slotLedger, resourceFacts),
        slotSpellCastThisTurn: spellcasting.slotSpellCastThisTurn or slotExpended,
      },
      readiedSpell: {
        reaction: state.reaction.with(
          "reactor",
          state.reaction.reactor.with("turn", spent)
        ).with(
          "concentration",
          startConcentration(state.reaction.concentration, Reactor, canConcentrate)
        ),
        heldEffect: held,
      },
      held: true,
      slotExpended: slotExpended,
    }
  }

  pure def offerReadiedSpellReaction(state: ReadiedSpellProcedureState): ReadiedSpellProcedureState = {
    val current = dissipateReadiedSpellIfConcentrationBroken(state)
    if (isHeldReadiedSpellEffect(current.heldEffect) and current.reaction.concentration.reactor == Concentrating) {
      current.with("reaction", current.reaction.with(
        "reactionWindow",
        offerReactionWindow(current.reaction.reactionWindow, ReadiedSpellReactionWindow)
      ))
    } else current
  }

  pure def releaseReadiedSpellReaction(state: ReadiedSpellProcedureState): ReadiedSpellReleaseResult = {
    val current = dissipateReadiedSpellIfConcentrationBroken(state)
    val canRelease = all {
      isHeldReadiedSpellEffect(current.heldEffect),
      current.reaction.concentration.reactor == Concentrating,
      reactionWindowIsKind(current.reaction.reactionWindow, ReadiedSpellReactionWindow),
    }
    val choice = resolveReactionChoice(
      current.reaction.reactor.turn,
      current.reaction.reactionWindow,
      TakeReadiedSpellReaction
    )
    if (not(canRelease) or choice.reactionWindow == current.reaction.reactionWindow) {
      readiedSpell: current,
      released: NoReadiedSpellRelease,
    }
    else {
      readiedSpell: {
        reaction: {
          interruptedActor: current.reaction.interruptedActor,
          reactor: current.reaction.reactor.with("turn", choice.turn),
          reactionWindow: choice.reactionWindow,
          concentration: endConcentration(current.reaction.concentration, Reactor),
        },
        heldEffect: NoReadiedSpellHeldEffect,
      },
      released: readiedSpellReleaseForHeldEffect(current.heldEffect),
    }
  }

}
