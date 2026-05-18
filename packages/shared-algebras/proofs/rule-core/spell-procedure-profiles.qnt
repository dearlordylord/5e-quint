// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-damage-save-or-attack spell.hit-point-restoration spell.reaction-shield spell.readied-action-time-spell

module spellProcedureProfiles {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots, cantrips, Casting Time,
  //   targets, Saving Throws, Attack Rolls, and spell effects.
  // - Rules-Glossary.md: Ready, Magic, Concentration, Spell Attack, Target.
  // - Spells/Descriptions-A-D.md: Acid Splash, Aid, and Cure Wounds.
  // - Spells/Descriptions-E-L.md: Healing Word.
  // - Spells/Descriptions-M-P.md: Mage Armor, Magic Missile, Mass Cure
  //   Wounds, and Mass Healing Word.
  // - Spells/Descriptions-Q-R.md: Ray of Frost.

  type SpellInvocationAction =
    | ActionTimeSpellInvocation
    | BonusActionSpellInvocation

  type SpellSlotLedger = {
    slotLevel: int,
    slotsRemaining: int,
  }

  type SpellDefinitionProfile =
    | MagicMissileSpellProfile
    | RayOfFrostSpellProfile
    | AcidSplashSpellProfile
    | HealingWordSpellProfile
    | CureWoundsSpellProfile
    | MassCureWoundsSpellProfile
    | MassHealingWordSpellProfile
    | MageArmorSpellProfile

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
    | ViciousMockerySaveDamageProfile
    | ThunderwaveSaveDamageProfile
    | DissonantWhispersSaveDamageProfile
    | HellishRebukeSaveDamageProfile

  type SpellSaveGatedConditionProfile =
    | ColorSpraySaveConditionProfile
    | EntangleSaveConditionProfile
    | AnimalFriendshipSaveConditionProfile
    | CharmPersonSaveConditionProfile
    | FaerieFireSaveAttackRollAdvantageProfile

  type SpellSaveGatedFailedEffect =
    | ViciousMockeryNextAttackDisadvantageEffect
    | ThunderwavePush10FeetEffect
    | DissonantWhispersForcedReactionMovementEffect
    | ColorSprayBlindedEffect
    | EntangleRestrainedEffect
    | AnimalFriendshipCharmedEffect({ durationMinutes: int })
    | CharmPersonCharmedEffect({ durationMinutes: int })
    | FaerieFireOutlineEffect

  type ScalarBuffSpellProfile =
    | FalseLifeScalarBuffProfile
    | LongstriderScalarBuffProfile
    | ShieldOfFaithScalarBuffProfile
    | BarkskinScalarBuffProfile
    | HeroismScalarBuffProfile
    | AidScalarBuffProfile

  type ScalarBuffEffect =
    | LongstriderSpeedIncreaseEffect
    | ShieldOfFaithArmorClassBonusEffect
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

  type SpellAttackBeamSequenceProfile =
    | EldritchBlastBeamSequenceProfile

  type SpellAttackBeamSequenceStep =
    | BeamSequenceUnavailable
    | BeamSequenceNeedsTargets
    | BeamSequenceNeedsAttackRoll
    | BeamSequenceNeedsDamageRoll
    | BeamSequenceComplete

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

  type SpellcastingProcedureState = {
    turn: TurnProcedureState,
    slotLedger: SpellSlotLedger,
    slotSpellCastThisTurn: bool,
  }

  type SpellInvocationResult = {
    state: SpellcastingProcedureState,
    admitted: bool,
    slotExpended: bool,
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

  pure def initialSpellSlotLedger: SpellSlotLedger = {
    slotLevel: 1,
    slotsRemaining: 2,
  }

  pure def initialSpellcastingProcedureState: SpellcastingProcedureState = {
    turn: initialTurnProcedureState,
    slotLedger: initialSpellSlotLedger,
    slotSpellCastThisTurn: false,
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

  pure def legalSpellInvocationTargetCount(
    profile: SpellDefinitionProfile,
    slotLevel: int,
    targetCount: int
  ): bool =
    if (targetCount < 1) false
    else if (profile == AcidSplashSpellProfile) true
    else if (profile == MagicMissileSpellProfile) targetCount <= magicMissileDartCount(slotLevel)
    else if (profile == MassHealingWordSpellProfile or profile == MassCureWoundsSpellProfile) targetCount <= 6
    else targetCount == 1

  pure def spellProfileArea(profile: SpellDefinitionProfile): SpellAreaProfile =
    if (profile == MassCureWoundsSpellProfile) MassCureWoundsPointOriginSphereArea else NoSpellAreaProfile

  val massCureWoundsPointOriginSphereRadiusFeet = 30

  pure def spellProfileRequiresSlot(profile: SpellDefinitionProfile): bool =
    spellProfileMinimumSlotLevel(profile) > 0

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
      | ViciousMockerySaveDamageProfile => SpellSingleSaveTarget
      | ThunderwaveSaveDamageProfile => SpellAreaSaveTargets
      | DissonantWhispersSaveDamageProfile => SpellSingleSaveTarget
      | HellishRebukeSaveDamageProfile => SpellSingleSaveTarget
    }

  pure def spellSaveGatedDamageSuccess(profile: SpellSaveGatedDamageProfile): SpellSaveGatedDamageSuccess =
    match profile {
      | AcidSplashSaveDamageProfile => SpellNoDamageOnSaveSuccess
      | SacredFlameSaveDamageProfile => SpellNoDamageOnSaveSuccess
      | InflictWoundsSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | BurningHandsSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | FireballSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | ViciousMockerySaveDamageProfile => SpellNoDamageOnSaveSuccess
      | ThunderwaveSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | DissonantWhispersSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | HellishRebukeSaveDamageProfile => SpellHalfDamageOnSaveSuccess
    }

  pure def spellSaveGatedDamageType(profile: SpellSaveGatedDamageProfile): RuleDamageType =
    match profile {
      | AcidSplashSaveDamageProfile => AcidDamage
      | SacredFlameSaveDamageProfile => RadiantDamage
      | InflictWoundsSaveDamageProfile => NecroticDamage
      | BurningHandsSaveDamageProfile => FireDamage
      | FireballSaveDamageProfile => FireDamage
      | ViciousMockerySaveDamageProfile => PsychicDamage
      | ThunderwaveSaveDamageProfile => ThunderDamage
      | DissonantWhispersSaveDamageProfile => PsychicDamage
      | HellishRebukeSaveDamageProfile => FireDamage
    }

  pure def spellSaveGatedDamageRequiresSlot(profile: SpellSaveGatedDamageProfile): bool =
    match profile {
      | AcidSplashSaveDamageProfile => false
      | SacredFlameSaveDamageProfile => false
      | InflictWoundsSaveDamageProfile => true
      | BurningHandsSaveDamageProfile => true
      | FireballSaveDamageProfile => true
      | ViciousMockerySaveDamageProfile => false
      | ThunderwaveSaveDamageProfile => true
      | DissonantWhispersSaveDamageProfile => true
      | HellishRebukeSaveDamageProfile => true
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
      | FaerieFireSaveAttackRollAdvantageProfile => SpellAreaSaveTargets
    }

  pure def spellSaveGatedConditionSavingThrowAbility(profile: SpellSaveGatedConditionProfile): SpellSavingThrowAbility =
    match profile {
      | ColorSpraySaveConditionProfile => SpellConstitutionSavingThrow
      | EntangleSaveConditionProfile => SpellStrengthSavingThrow
      | AnimalFriendshipSaveConditionProfile => SpellWisdomSavingThrow
      | CharmPersonSaveConditionProfile => SpellWisdomSavingThrow
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
      | AnimalFriendshipSaveConditionProfile => Set(AnimalFriendshipCharmedEffect({ durationMinutes: 24 * 60 }))
      | CharmPersonSaveConditionProfile => Set(CharmPersonCharmedEffect({ durationMinutes: 10 * 60 }))
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
      | BarkskinScalarBuffProfile => Set(BarkskinArmorClassFloorEffect)
      | HeroismScalarBuffProfile => Set(
          HeroismFrightenedImmunityEffect,
          HeroismTurnStartTemporaryHitPointsEffect({ amount: spellcastingAbilityModifier }),
        )
      | AidScalarBuffProfile => Set(AidHitPointMaximumIncreaseEffect({ amount: scalarBuffAidHitPointMaximumIncrease(slotLevel) }))
    }

  pure def scalarBuffRequiresConcentration(profile: ScalarBuffSpellProfile): bool =
    profile == ShieldOfFaithScalarBuffProfile or profile == HeroismScalarBuffProfile

  pure def damageRiderSpellAction(profile: DamageRiderSpellProfile): SpellInvocationAction =
    BonusActionSpellInvocation

  pure def damageRiderRequiresConcentration(profile: DamageRiderSpellProfile): bool =
    profile == HuntersMarkMarkedDamageRiderProfile
      or profile == EnsnaringStrikeAfterHitConditionProfile

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

  pure def spellAttackBeamSequenceDamageType(profile: SpellAttackBeamSequenceProfile): RuleDamageType =
    match profile {
      | EldritchBlastBeamSequenceProfile => ForceDamage
    }

  pure def spellAttackBeamSequenceSupportsObjectTargets(profile: SpellAttackBeamSequenceProfile): bool =
    match profile {
      | EldritchBlastBeamSequenceProfile => true
    }

  pure def spellAttackBeamSequenceBeamCount(profile: SpellAttackBeamSequenceProfile, characterLevel: int): int =
    match profile {
      | EldritchBlastBeamSequenceProfile =>
          if (characterLevel >= 17) 4
          else if (characterLevel >= 11) 3
          else if (characterLevel >= 5) 2
          else 1
    }

  pure def spellAttackBeamSequenceStep(
    profile: SpellAttackBeamSequenceProfile,
    canCastSpells: bool,
    beamCount: int,
    beamTargetsFilled: int,
    beamAttackRollsFilled: int,
    beamHits: int,
    beamDamageRollsFilled: int,
  ): SpellAttackBeamSequenceStep =
    match profile {
      | EldritchBlastBeamSequenceProfile =>
          if (not(canCastSpells) or beamCount <= 0)
            BeamSequenceUnavailable
          else if (beamTargetsFilled < beamCount)
            BeamSequenceNeedsTargets
          else if (beamAttackRollsFilled < beamCount)
            BeamSequenceNeedsAttackRoll
          else if (beamDamageRollsFilled < beamHits)
            BeamSequenceNeedsDamageRoll
          else
            BeamSequenceComplete
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

  pure def spellActionCost(invocationAction: SpellInvocationAction): ActionCost =
    if (invocationAction == BonusActionSpellInvocation) BonusActionCost
    else StandardActionCost(MagicAction)

  pure def legalSpellSlotLedger(ledger: SpellSlotLedger): bool = all {
    ledger.slotLevel >= 1,
    ledger.slotLevel <= 9,
    ledger.slotsRemaining >= 0,
    ledger.slotsRemaining <= 6,
  }

  pure def legalSpellcastingProcedureState(state: SpellcastingProcedureState): bool = all {
    legalTurnProcedureState(state.turn),
    legalSpellSlotLedger(state.slotLedger),
    state.slotSpellCastThisTurn.in(Set(true, false)),
  }

  pure def legalSpellInvocationFacts(facts: SpellInvocationFacts): bool = {
    val minimumSlot = spellProfileMinimumSlotLevel(facts.profile)
    all {
      facts.hasSpellAccess.in(Set(true, false)),
      facts.targetsAreValid.in(Set(true, false)),
      facts.selectedSlotLevel >= minimumSlot,
      facts.selectedSlotLevel <= 9,
      if (minimumSlot == 0) facts.selectedSlotLevel == 0
      else facts.selectedSlotLevel >= minimumSlot,
      legalSpellInvocationTargetCount(facts.profile, facts.selectedSlotLevel, facts.targetCount),
    }
  }

  pure def canSpendSpellSlot(
    ledger: SpellSlotLedger,
    facts: SpellInvocationFacts,
    slotSpellCastThisTurn: bool
  ): bool =
    if (not(spellProfileRequiresSlot(facts.profile))) true
    else all {
      not(slotSpellCastThisTurn),
      facts.selectedSlotLevel == ledger.slotLevel,
      ledger.slotsRemaining > 0,
    }

  pure def spendSpellSlot(
    ledger: SpellSlotLedger,
    facts: SpellInvocationFacts
  ): SpellSlotLedger =
    if (not(spellProfileRequiresSlot(facts.profile))) ledger
    else ledger.with("slotsRemaining", ledger.slotsRemaining - 1)

  pure def resolveSpellInvocation(
    state: SpellcastingProcedureState,
    facts: SpellInvocationFacts
  ): SpellInvocationResult = {
    val spentTurn = spendActionCost(state.turn, spellActionCost(spellProfileAction(facts.profile)))
    val admitted = all {
      facts.hasSpellAccess,
      legalSpellInvocationFacts(facts),
      legalSpellcastingProcedureState(state),
      spentTurn != state.turn,
      canSpendSpellSlot(state.slotLedger, facts, state.slotSpellCastThisTurn),
    }
    val slotExpended = admitted and spellProfileRequiresSlot(facts.profile)
    {
      state:
        if (not(admitted)) state
        else {
          turn: spentTurn,
          slotLedger: spendSpellSlot(state.slotLedger, facts),
          slotSpellCastThisTurn: state.slotSpellCastThisTurn or slotExpended,
        },
      admitted: admitted,
      slotExpended: slotExpended,
    }
  }

  pure def spellInvocationCanAffectTargets(
    invocation: SpellInvocationResult,
    facts: SpellInvocationFacts
  ): bool =
    invocation.admitted and facts.targetsAreValid

  pure def magicMissileDartCount(slotLevel: int): int =
    if (slotLevel <= 1) 3 else slotLevel + 2

  pure def legalMagicMissileEffectFacts(facts: MagicMissileEffectFacts): bool = all {
    facts.slotLevel >= 1,
    facts.slotLevel <= 9,
    facts.allocatedDarts >= 1,
    facts.allocatedDarts <= magicMissileDartCount(facts.slotLevel),
    facts.dartDamageRoll >= 2,
    facts.dartDamageRoll <= 5,
  }

  pure def resolveMagicMissileDamage(facts: MagicMissileEffectFacts): DamageSpellEffectResult =
    if (not(legalMagicMissileEffectFacts(facts))) {
      damageAmount: 0,
      damageType: ForceDamage,
      effect: NoSpellEffect,
    } else {
      damageAmount: facts.allocatedDarts * facts.dartDamageRoll,
      damageType: ForceDamage,
      effect: NoSpellEffect,
    }

  pure def resolveRayOfFrostEffect(facts: RayOfFrostEffectFacts): DamageSpellEffectResult = {
    val outcome = resolveAttackRoll(facts.attackRoll)
    val damageDiceMatch = damageDiceCountMatchesCritical(
      facts.baseDamageDice,
      facts.rolledDamageDiceCount,
      outcome.critical
    )
    val legalDamageDice = all {
      facts.baseDamageDice >= 1,
      facts.baseDamageDice <= 4,
      damageDiceMatch,
      facts.damageRoll >= facts.rolledDamageDiceCount,
      facts.damageRoll <= facts.rolledDamageDiceCount * 8,
    }
    if (not(legalAttackRollProcedureFacts(facts.attackRoll)) or not(legalDamageDice) or not(outcome.hits)) {
      damageAmount: 0,
      damageType: ColdDamage,
      effect: NoSpellEffect,
    } else {
      damageAmount: nonnegative(facts.damageRoll),
      damageType: ColdDamage,
      effect: RayOfFrostSpeedReductionEffect,
    }
  }

  pure def resolveAcidSplashEffect(facts: SaveDamageSpellEffectFacts): DamageSpellEffectResult =
    if (facts.savingThrowFailed) {
      damageAmount: nonnegative(facts.damageRoll),
      damageType: AcidDamage,
      effect: NoSpellEffect,
    } else {
      damageAmount: 0,
      damageType: AcidDamage,
      effect: NoSpellEffect,
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
    val spent = spendActionCost(spellcasting.turn, StandardActionCost(ReadyAction))
    val admitted = all {
      triggerSelected,
      canConcentrate,
      isHeldReadiedSpellEffect(held),
      facts.hasSpellAccess,
      legalSpellInvocationFacts(facts),
      legalSpellcastingProcedureState(spellcasting),
      spent != spellcasting.turn,
      canSpendSpellSlot(spellcasting.slotLedger, facts, spellcasting.slotSpellCastThisTurn),
    }
    val slotExpended = admitted and spellProfileRequiresSlot(facts.profile)
    if (not(admitted)) {
      spellcasting: spellcasting,
      readiedSpell: state,
      held: false,
      slotExpended: false,
    } else {
      spellcasting: {
        turn: spent,
        slotLedger: spendSpellSlot(spellcasting.slotLedger, facts),
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

  run test_magic_missile_profile_spends_slot_and_allocates_darts = {
    val higherSlotState = initialSpellcastingProcedureState.with(
      "slotLedger",
      initialSpellSlotLedger.with("slotLevel", 2)
    )
    val invocation = resolveSpellInvocation(higherSlotState, {
      profile: MagicMissileSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 2,
      targetCount: 4,
      targetsAreValid: true,
    })
    val damage = resolveMagicMissileDamage({
      slotLevel: 2,
      allocatedDarts: 4,
      dartDamageRoll: 5,
    })
    all {
      assert(invocation.admitted),
      assert(invocation.slotExpended),
      assert(invocation.state.slotLedger.slotsRemaining == 1),
      assert(invocation.state.slotSpellCastThisTurn),
      assert(damage.damageAmount == 20),
      assert(damage.damageType == ForceDamage),
    }
  }

  run test_cantrip_profile_spends_magic_action_without_slot = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: RayOfFrostSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 0,
      targetCount: 1,
      targetsAreValid: true,
    })
    all {
      assert(invocation.admitted),
      assert(not(invocation.slotExpended)),
      assert(invocation.state.slotLedger == initialSpellSlotLedger),
      assert(not(invocation.state.slotSpellCastThisTurn)),
      assert(invocation.state.turn.actionQuota == ActionSpent),
    }
  }

  run test_spell_attack_damage_profiles_project_damage_and_hit_effects = {
    all {
      assert(spellAttackDamageProfileDamageType(RayOfFrostSpellAttackProfile) == ColdDamage),
      assert(spellAttackDamageProfileDamageType(PoisonSpraySpellAttackProfile) == PoisonDamage),
      assert(spellAttackDamageProfileDamageType(ChillTouchSpellAttackProfile) == NecroticDamage),
      assert(spellAttackDamageProfileDamageType(StarryWispSpellAttackProfile) == RadiantDamage),
      assert(spellAttackDamageProfileDamageType(FireBoltSpellAttackProfile) == FireDamage),
      assert(spellAttackDamageProfileDamageType(ShockingGraspSpellAttackProfile) == LightningDamage),
      assert(spellAttackDamageProfileDamageType(GuidingBoltSpellAttackProfile) == RadiantDamage),
      assert(spellAttackDamageProfileDamageType(RayOfSicknessSpellAttackProfile) == PoisonDamage),
      assert(spellAttackDamageProfileDamageType(ProduceFlameHurlSpellAttackProfile) == FireDamage),
      assert(spellAttackDamageProfileHitEffects(RayOfFrostSpellAttackProfile) == Set(RayOfFrostSpeedReductionHitEffect)),
      assert(spellAttackDamageProfileHitEffects(ChillTouchSpellAttackProfile) == Set(ChillTouchHitPointRegainPreventionHitEffect)),
      assert(spellAttackDamageProfileHitEffects(ShockingGraspSpellAttackProfile) == Set(ShockingGraspOpportunityAttackDeniedHitEffect)),
      assert(spellAttackDamageProfileHitEffects(GuidingBoltSpellAttackProfile) == Set(GuidingBoltNextAttackAdvantageHitEffect)),
      assert(spellAttackDamageProfileHitEffects(RayOfSicknessSpellAttackProfile) == Set(RayOfSicknessPoisonedHitEffect)),
      assert(spellAttackDamageProfileHitEffects(StarryWispSpellAttackProfile) == Set(StarryWispInvisibleBenefitDeniedHitEffect)),
      assert(spellAttackDamageProfileSupportsObjectTarget(StarryWispSpellAttackProfile)),
      assert(spellAttackDamageProfileSupportsObjectTarget(FireBoltSpellAttackProfile)),
      assert(spellAttackDamageProfileSupportsObjectTarget(ProduceFlameHurlSpellAttackProfile)),
      assert(not(spellAttackDamageProfileSupportsObjectTarget(RayOfFrostSpellAttackProfile))),
    }
  }

  run test_save_gated_spell_profiles_project_damage_targeting_and_effects = {
    val animalTargets = spellSaveGatedConditionTargeting(AnimalFriendshipSaveConditionProfile)
    all {
      assert(spellSaveGatedDamageTargeting(SacredFlameSaveDamageProfile) == SpellSingleSaveTarget),
      assert(spellSaveGatedDamageTargeting(BurningHandsSaveDamageProfile) == SpellAreaSaveTargets),
      assert(spellSaveGatedDamageTargeting(FireballSaveDamageProfile) == SpellAreaSaveTargets),
      assert(spellSaveGatedDamageSuccess(InflictWoundsSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(FireballSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(ViciousMockerySaveDamageProfile) == SpellNoDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(ThunderwaveSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(DissonantWhispersSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(HellishRebukeSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageType(ViciousMockerySaveDamageProfile) == PsychicDamage),
      assert(spellSaveGatedDamageType(FireballSaveDamageProfile) == FireDamage),
      assert(spellSaveGatedDamageType(ThunderwaveSaveDamageProfile) == ThunderDamage),
      assert(spellSaveGatedDamageType(DissonantWhispersSaveDamageProfile) == PsychicDamage),
      assert(spellSaveGatedDamageType(HellishRebukeSaveDamageProfile) == FireDamage),
      assert(spellSaveGatedDamageRequiresSlot(BurningHandsSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(FireballSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(ThunderwaveSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(DissonantWhispersSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(HellishRebukeSaveDamageProfile)),
      assert(not(spellSaveGatedDamageRequiresSlot(AcidSplashSaveDamageProfile))),
      assert(spellSaveGatedDamageFailedSaveEffects(ThunderwaveSaveDamageProfile) == Set(ThunderwavePush10FeetEffect)),
      assert(spellSaveGatedDamageFailedSaveEffects(DissonantWhispersSaveDamageProfile) == Set(DissonantWhispersForcedReactionMovementEffect)),
      assert(spellSaveGatedDamageFailedSaveEffects(FireballSaveDamageProfile) == Set()),
      assert(spellSaveGatedDamageFailedSaveEffects(HellishRebukeSaveDamageProfile) == Set()),
      assert(spellSaveGatedDamageFailedSaveEffects(ViciousMockerySaveDamageProfile) == Set(ViciousMockeryNextAttackDisadvantageEffect)),
      assert(spellSaveGatedConditionTargeting(ColorSpraySaveConditionProfile) == SpellAreaSaveTargets),
      assert(spellSaveGatedConditionSavingThrowAbility(ColorSpraySaveConditionProfile) == SpellConstitutionSavingThrow),
      assert(spellSaveGatedConditionSavingThrowAbility(EntangleSaveConditionProfile) == SpellStrengthSavingThrow),
      assert(spellSaveGatedTargetMaxTargets(animalTargets, 1) == 1),
      assert(spellSaveGatedTargetMaxTargets(animalTargets, 2) == 2),
      assert(spellSaveGatedConditionFailedSaveEffects(EntangleSaveConditionProfile) == Set(EntangleRestrainedEffect)),
      assert(spellSaveGatedConditionFailedSaveEffects(FaerieFireSaveAttackRollAdvantageProfile) == Set(FaerieFireOutlineEffect)),
      assert(spellSaveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveConditionProfile, true, false)),
      assert(not(spellSaveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveConditionProfile, false, true))),
      assert(spellSaveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveConditionProfile, false, true)),
      assert(not(spellSaveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveConditionProfile, true, false))),
      assert(spellSaveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveConditionProfile, true)),
      assert(not(spellSaveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveConditionProfile, false))),
    }
  }

  run test_scalar_buff_profiles_project_action_targets_effects_and_temporary_hit_points = {
    all {
      assert(scalarBuffSpellAction(ShieldOfFaithScalarBuffProfile) == BonusActionSpellInvocation),
      assert(scalarBuffSpellAction(BarkskinScalarBuffProfile) == BonusActionSpellInvocation),
      assert(scalarBuffSpellAction(LongstriderScalarBuffProfile) == ActionTimeSpellInvocation),
      assert(scalarBuffMaximumTargets(LongstriderScalarBuffProfile, 3) == 3),
      assert(scalarBuffMaximumTargets(AidScalarBuffProfile, 3) == 3),
      assert(scalarBuffMaximumTargets(BarkskinScalarBuffProfile, 3) == 1),
      assert(scalarBuffMaximumTargets(FalseLifeScalarBuffProfile, 3) == 1),
      assert(scalarBuffTemporaryHitPoints(FalseLifeScalarBuffProfile, 1, 4) == 8),
      assert(scalarBuffTemporaryHitPoints(FalseLifeScalarBuffProfile, 3, 4) == 18),
      assert(scalarBuffEffects(LongstriderScalarBuffProfile, 3, 1) == Set(LongstriderSpeedIncreaseEffect)),
      assert(scalarBuffEffects(ShieldOfFaithScalarBuffProfile, 3, 1) == Set(ShieldOfFaithArmorClassBonusEffect)),
      assert(scalarBuffEffects(BarkskinScalarBuffProfile, 3, 2) == Set(BarkskinArmorClassFloorEffect)),
      assert(scalarBuffEffects(HeroismScalarBuffProfile, 3, 1) == Set(HeroismFrightenedImmunityEffect, HeroismTurnStartTemporaryHitPointsEffect({ amount: 3 }))),
      assert(scalarBuffEffects(AidScalarBuffProfile, 3, 3) == Set(AidHitPointMaximumIncreaseEffect({ amount: 10 }))),
      assert(scalarBuffRequiresConcentration(ShieldOfFaithScalarBuffProfile)),
      assert(scalarBuffRequiresConcentration(HeroismScalarBuffProfile)),
      assert(not(scalarBuffRequiresConcentration(BarkskinScalarBuffProfile))),
      assert(not(scalarBuffRequiresConcentration(LongstriderScalarBuffProfile))),
    }
  }

  run test_damage_rider_spell_profiles_project_damage_dice_duration_and_concentration = {
    all {
      assert(damageRiderSpellAction(DivineFavorWeaponDamageRiderProfile) == BonusActionSpellInvocation),
      assert(damageRiderSpellAction(DivineSmiteAfterHitDamageProfile) == BonusActionSpellInvocation),
      assert(damageRiderRequiresConcentration(HuntersMarkMarkedDamageRiderProfile)),
      assert(damageRiderRequiresConcentration(EnsnaringStrikeAfterHitConditionProfile)),
      assert(not(damageRiderRequiresConcentration(DivineFavorWeaponDamageRiderProfile))),
      assert(divineFavorDamageType == RadiantDamage),
      assert(divineFavorDurationTicks == 10),
      assert(divineSmiteDamageType == RadiantDamage),
      assert(divineSmiteDamageDice(1, false) == 2),
      assert(divineSmiteDamageDice(1, true) == 3),
      assert(divineSmiteDamageDice(3, true) == 5),
      assert(huntersMarkDamageType == ForceDamage),
      assert(huntersMarkRangeFeet == 90),
      assert(ensnaringStrikeDamageType == PiercingDamage),
      assert(ensnaringStrikeDamageDice(3) == 3),
      assert(ensnaringStrikeTargetHasSaveAdvantage(true)),
      assert(not(ensnaringStrikeTargetHasSaveAdvantage(false))),
      assert(searingSmiteDamageType == FireDamage),
      assert(searingSmiteDamageDice(3) == 3),
      assert(searingSmiteDurationTicks == 10),
    }
  }

  run test_chained_spell_attack_damage_profile_projects_chromatic_orb_math = {
    val duplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 0,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val noDuplicateFaces = {
      face1: 1,
      face2: 1,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    all {
      assert(chainedSpellAttackDamageChoices(ChromaticOrbChainedSpellAttackProfile).contains(ChainedSpellAttackLightningDamage)),
      assert(chainedSpellAttackDamageType(ChainedSpellAttackThunderDamage) == ThunderDamage),
      assert(chainedSpellAttackDamageBaseSpellLevel(ChromaticOrbChainedSpellAttackProfile) == 1),
      assert(chainedSpellAttackDamageDieSize(ChromaticOrbChainedSpellAttackProfile) == 8),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttackProfile, 1) == 3),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttackProfile, 3) == 5),
      assert(chainedSpellAttackD8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttackProfile, 1, false, duplicateFaces)),
      assert(chainedSpellAttackDamageRollHasDuplicateD8Face(duplicateFaces)),
      assert(not(chainedSpellAttackDamageRollHasDuplicateD8Face(noDuplicateFaces))),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttackProfile, 1, 0, false, duplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttackProfile, 1, 1, false, duplicateFaces))),
    }
  }

  run test_attack_burst_save_damage_profile_projects_ice_knife_facts = {
    all {
      assert(attackBurstSaveDamageRequiresSlot(IceKnifeAttackBurstSaveDamageProfile)),
      assert(attackBurstSaveDamageAttackType(IceKnifeAttackBurstSaveDamageProfile) == PiercingDamage),
      assert(attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamageProfile) == ColdDamage),
      assert(attackBurstSaveDamageBurstDice(IceKnifeAttackBurstSaveDamageProfile, 1) == 2),
      assert(attackBurstSaveDamageBurstDice(IceKnifeAttackBurstSaveDamageProfile, 3) == 4),
      assert(attackBurstSaveDamageBurstAmount(6, false) == 6),
      assert(attackBurstSaveDamageBurstAmount(6, true) == 0),
    }
  }

  run test_spell_attack_beam_sequence_projects_eldritch_blast_facts = {
    all {
      assert(spellAttackBeamSequenceDamageType(EldritchBlastBeamSequenceProfile) == ForceDamage),
      assert(spellAttackBeamSequenceSupportsObjectTargets(EldritchBlastBeamSequenceProfile)),
      assert(spellAttackBeamSequenceBeamCount(EldritchBlastBeamSequenceProfile, 1) == 1),
      assert(spellAttackBeamSequenceBeamCount(EldritchBlastBeamSequenceProfile, 5) == 2),
      assert(spellAttackBeamSequenceBeamCount(EldritchBlastBeamSequenceProfile, 11) == 3),
      assert(spellAttackBeamSequenceBeamCount(EldritchBlastBeamSequenceProfile, 17) == 4),
      assert(spellAttackBeamSequenceStep(EldritchBlastBeamSequenceProfile, false, 2, 0, 0, 0, 0) == BeamSequenceUnavailable),
      assert(spellAttackBeamSequenceStep(EldritchBlastBeamSequenceProfile, true, 2, 0, 0, 0, 0) == BeamSequenceNeedsTargets),
      assert(spellAttackBeamSequenceStep(EldritchBlastBeamSequenceProfile, true, 2, 2, 1, 0, 0) == BeamSequenceNeedsAttackRoll),
      assert(spellAttackBeamSequenceStep(EldritchBlastBeamSequenceProfile, true, 2, 2, 2, 2, 1) == BeamSequenceNeedsDamageRoll),
      assert(spellAttackBeamSequenceStep(EldritchBlastBeamSequenceProfile, true, 2, 2, 2, 1, 1) == BeamSequenceComplete),
    }
  }

  run test_sleep_repeat_save_lifecycle_projects_pending_and_unconscious = {
    val pending = sleepInitialSaveLifecycle(false, true)
    val saved = sleepRepeatSaveLifecycle(pending, true, false)
    val unconscious = sleepRepeatSaveLifecycle(pending, false, false)
    all {
      assert(sleepSavingThrowAutomaticallySucceeds(true, false)),
      assert(sleepSavingThrowAutomaticallySucceeds(false, true)),
      assert(not(sleepSavingThrowAutomaticallySucceeds(false, false))),
      assert(sleepInitialSaveLifecycle(true, true) == NoSleepRepeatSaveLifecycle),
      assert(pending == PendingSleepRepeatSaveLifecycle({ hadIncapacitated: true })),
      assert(saved == NoSleepRepeatSaveLifecycle),
      assert(unconscious == UnconsciousSleepRepeatSaveLifecycle({
        hadIncapacitated: true,
        hadUnconscious: false,
      })),
      assert(sleepEffectEndsOnDamage),
      assert(sleepEffectEndsOnAdjacentShakeAwakeAction),
    }
  }

  run test_object_hit_point_damage_projects_threshold_and_destruction = {
    val destroyed = objectHitPointDamageResult({
      rolledDamage: 6,
      priorHitPoints: 5,
      damageThreshold: 0,
    })
    val thresholdBlocked = objectHitPointDamageResult({
      rolledDamage: 6,
      priorHitPoints: 10,
      damageThreshold: 10,
    })
    all {
      assert(destroyed.effectiveDamage == 6),
      assert(destroyed.priorHitPoints == 5),
      assert(destroyed.nextHitPoints == 0),
      assert(destroyed.destroyed),
      assert(thresholdBlocked.effectiveDamage == 0),
      assert(thresholdBlocked.nextHitPoints == 10),
      assert(not(thresholdBlocked.destroyed)),
    }
  }

  run test_spell_turn_hook_semantics_project_temporary_hit_points_and_duration = {
    all {
      assert(turnStartTemporaryHitPoints(2, 5) == 5),
      assert(turnStartTemporaryHitPoints(7, 5) == 7),
      assert(not(oncePerTurnSpellEffectUsedAtTurnStart)),
      assert(oneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn),
      assert(timedSpellEffectDurationAfterRoundTick(2) == 1),
      assert(timedSpellEffectDurationAfterRoundTick(1) == 0),
      assert(timedSpellEffectRemainsActive(1)),
      assert(not(timedSpellEffectRemainsActive(0))),
    }
  }

  run test_invalid_spell_targets_still_spend_resources_without_target_effect = {
    val facts = {
      profile: MagicMissileSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: false,
    }
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, facts)
    all {
      assert(invocation.admitted),
      assert(invocation.slotExpended),
      assert(not(spellInvocationCanAffectTargets(invocation, facts))),
    }
  }

  run test_second_slot_spell_in_same_turn_is_rejected = {
    val first = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: MageArmorSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    val second = resolveSpellInvocation(first.state.with(
      "turn",
      first.state.turn.with("actionQuota", ActionAvailable)
    ), {
      profile: MagicMissileSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    all {
      assert(first.admitted),
      assert(not(second.admitted)),
      assert(second.state == first.state.with("turn", first.state.turn.with("actionQuota", ActionAvailable))),
    }
  }

  run test_ray_of_frost_hit_deals_cold_damage_and_reduces_speed = {
    val result = resolveRayOfFrostEffect({
      attackRoll: {
        naturalD20: 12,
        total: 17,
        armorClass: 15,
        criticalThreshold: 20,
      },
      baseDamageDice: 1,
      rolledDamageDiceCount: 1,
      damageRoll: 6,
    })
    all {
      assert(result.damageAmount == 6),
      assert(result.damageType == ColdDamage),
      assert(result.effect == RayOfFrostSpeedReductionEffect),
    }
  }

  run test_ray_of_frost_critical_hit_requires_doubled_damage_dice = {
    val criticalResult = resolveRayOfFrostEffect({
      attackRoll: {
        naturalD20: 20,
        total: 1,
        armorClass: 30,
        criticalThreshold: 20,
      },
      baseDamageDice: 1,
      rolledDamageDiceCount: 2,
      damageRoll: 12,
    })
    val ordinaryDiceOnCritical = resolveRayOfFrostEffect({
      attackRoll: {
        naturalD20: 20,
        total: 1,
        armorClass: 30,
        criticalThreshold: 20,
      },
      baseDamageDice: 1,
      rolledDamageDiceCount: 1,
      damageRoll: 6,
    })
    all {
      assert(criticalResult.damageAmount == 12),
      assert(criticalResult.effect == RayOfFrostSpeedReductionEffect),
      assert(ordinaryDiceOnCritical.damageAmount == 0),
      assert(ordinaryDiceOnCritical.effect == NoSpellEffect),
    }
  }

  run test_acid_splash_failed_dexterity_save_deals_acid_damage = {
    val result = resolveAcidSplashEffect({
      savingThrowFailed: true,
      damageRoll: 4,
    })
    all {
      assert(result.damageAmount == 4),
      assert(result.damageType == AcidDamage),
    }
  }

  run test_acid_splash_accepts_caller_supplied_area_target_count = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: AcidSplashSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 0,
      targetCount: 5,
      targetsAreValid: true,
    })
    all {
      assert(invocation.admitted),
      assert(not(invocation.slotExpended)),
    }
  }

  run test_direct_hit_point_restoration_spends_action_cost_and_recovers_hit_points = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: CureWoundsSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    val healing = resolveDirectHitPointRestorationEffect(
      {
        kind: PlayerCharacter,
        hitPoints: 0,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: true,
      },
      { successes: 1, failures: 1, stable: false, hpRegained: false },
      NoPositiveHitPointUnconsciousRecovery,
      {
        profile: CureWoundsSpellProfile,
        slotLevel: 1,
        healingDiceRoll: 5,
        spellcastingAbilityModifier: 3,
      }
    )
    all {
      assert(invocation.admitted),
      assert(invocation.state.turn.actionQuota == ActionSpent),
      assert(healing.vitals.hitPoints == 8),
      assert(not(healing.vitals.unconscious)),
      assert(healing.deathSavingThrows == resetDeathSavingThrowLifecycle),
    }
  }

  run test_mass_cure_wounds_area_hit_point_restoration_facts = {
    val invocation = resolveSpellInvocation({
      turn: initialSpellcastingProcedureState.turn,
      slotLedger: { slotLevel: 5, slotsRemaining: 1 },
      slotSpellCastThisTurn: false,
    }, {
      profile: MassCureWoundsSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 5,
      targetCount: 6,
      targetsAreValid: true,
    })
    val healing = resolveDirectHitPointRestorationEffect(
      {
        kind: PlayerCharacter,
        hitPoints: 4,
        hitPointMaximum: 20,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      resetDeathSavingThrowLifecycle,
      NoPositiveHitPointUnconsciousRecovery,
      {
        profile: MassCureWoundsSpellProfile,
        slotLevel: 5,
        healingDiceRoll: 25,
        spellcastingAbilityModifier: 3,
      }
    )
    all {
      assert(invocation.admitted),
      assert(invocation.state.turn.actionQuota == ActionSpent),
      assert(invocation.state.slotLedger.slotsRemaining == 0),
      assert(spellProfileArea(MassCureWoundsSpellProfile) == MassCureWoundsPointOriginSphereArea),
      assert(spellProfileArea(CureWoundsSpellProfile) == NoSpellAreaProfile),
      assert(massCureWoundsPointOriginSphereRadiusFeet == 30),
      assert(healing.hitPointsRegained == 16),
      assert(healing.vitals.hitPoints == 20),
    }
  }

  run test_mage_armor_creates_persistent_effect_and_donning_armor_ends_it = {
    val result = resolveMageArmorEffect({
      willingTarget: true,
      targetWearingArmor: false,
      dexterityModifier: 2,
    })
    all {
      assert(result.effect == MageArmorActiveEffect),
      assert(result.baseArmorClass == 15),
      assert(endMageArmorIfTargetDonsArmor(result.effect, true) == NoSpellEffect),
    }
  }

  run test_readied_spell_response_holds_energy_then_releases_with_reaction = {
    val held = holdReadiedSpellResponse(
      initialSpellcastingProcedureState,
      initialReadiedSpellProcedureState,
      {
        profile: RayOfFrostSpellProfile,
        hasSpellAccess: true,
        selectedSlotLevel: 0,
        targetCount: 1,
        targetsAreValid: true,
      },
      true,
      true
    )
    val offered = offerReadiedSpellReaction(held.readiedSpell)
    val released = releaseReadiedSpellReaction(offered)
    all {
      assert(held.held),
      assert(not(held.slotExpended)),
      assert(held.spellcasting.turn.actionQuota == ActionSpent),
      assert(isHeldReadiedSpellEffect(held.readiedSpell.heldEffect)),
      assert(held.readiedSpell.reaction.concentration.reactor == Concentrating),
      assert(reactionWindowIsKind(offered.reaction.reactionWindow, ReadiedSpellReactionWindow)),
      assert(not(released.readiedSpell.reaction.reactor.turn.reactionAvailable)),
      assert(released.readiedSpell.reaction.concentration.reactor == NoConcentration),
      assert(released.readiedSpell.heldEffect == NoReadiedSpellHeldEffect),
      assert(released.readiedSpell.reaction.reactionWindow == NoReactionWindow),
      assert(released.released == ReleasedRayOfFrostSpell),
    }
  }

  run test_readied_spell_response_dissipates_if_concentration_breaks = {
    val held = holdReadiedSpellResponse(
      initialSpellcastingProcedureState,
      initialReadiedSpellProcedureState,
      {
        profile: MagicMissileSpellProfile,
        hasSpellAccess: true,
        selectedSlotLevel: 1,
        targetCount: 1,
        targetsAreValid: true,
      },
      true,
      true
    )
    val broken = held.readiedSpell.with(
      "reaction",
      held.readiedSpell.reaction.with(
        "concentration",
        endConcentration(held.readiedSpell.reaction.concentration, Reactor)
      )
    )
    val offered = offerReadiedSpellReaction(broken)
    val releaseResult = releaseReadiedSpellReaction(offered)
    all {
      assert(held.slotExpended),
      assert(held.spellcasting.slotLedger.slotsRemaining == 1),
      assert(isHeldReadiedSpellEffect(held.readiedSpell.heldEffect)),
      assert(broken.reaction.concentration.reactor == NoConcentration),
      assert(offered.heldEffect == NoReadiedSpellHeldEffect),
      assert(offered.reaction.reactionWindow == NoReactionWindow),
      assert(releaseResult.readiedSpell == offered),
      assert(releaseResult.released == NoReadiedSpellRelease),
    }
  }
}
