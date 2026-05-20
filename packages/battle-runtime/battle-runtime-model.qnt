// -*- mode: Bluespec; -*-

module battleRuntimeModel {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"

  type Actor = Fighter | Goblin
  type CombatantSide = PartySide | OppositionSide
  type DamageSourceActor = FighterDamageSource | FighterAllyDamageSource | GoblinDamageSource

  // FIXME: damage type is not only about battle (you can get damaged out of battle). similar with creature size, hand use, maybe more common domain truths. make sure there's shared module for it
  type DamageType = Acid | Bludgeoning | Poison | Force | Cold | Slashing | Piercing | Radiant | Necrotic | Lightning | Psychic | Fire | Thunder
  type Ability = StrAbility | DexAbility | ConAbility | IntAbility | WisAbility | ChaAbility

  type SpellInvocation = MagicMissile | RayOfFrost | AcidSplash | PoisonSpray | ChillTouch | StarryWisp | FireBolt | EldritchBlast | ScorchingRay | SacredFlame | InflictWounds | BurningHands | Fireball | ColorSpray | Entangle | EnsnaringStrike | SearingSmite | ShiningSmite | FaerieFire | AnimalFriendship | CharmPerson | CalmEmotions | BlindnessDeafness | ProtectionFromEvilAndGood | ProtectionFromPoison | LesserRestoration | IceKnife | HealingWord | CureWounds | MassHealingWord | Shield | Counterspell | FalseLife | Longstrider | ShieldOfFaith | SpiderClimb | Barkskin | Heroism | Aid | Bane | Bless | Guidance | PassWithoutTrace | EnhanceAbility | Thaumaturgy | DivineFavor | DivineSmite | HuntersMark | Hex | ShockingGrasp | GuidingBolt | RayOfSickness | ViciousMockery | ProduceFlame | DancingLightsSpell | Light | ContinualFlame | FlameBlade | TrueStrike | Grease | FogCloud | Command | DissonantWhispers | FeatherFall | HellishRebuke | SorcerousBurst | SpareTheDying | HideousLaughter | MistyStep | Blur | MirrorImage | HoldPerson | MindSpike | AlterSelf
  type SpellAttackDamageInvocation = RayOfFrostSpellAttack | PoisonSpraySpellAttack | ChillTouchSpellAttack | StarryWispSpellAttack | FireBoltSpellAttack | ShockingGraspSpellAttack | GuidingBoltSpellAttack | RayOfSicknessSpellAttack | ProduceFlameHurlSpellAttack | SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstDamageTypeChoice, spellcastingAbilityModifier: int, characterLevel: int })
  type FixedSpellAttackDamageInvocation = RayOfFrostFixedSpellAttack | PoisonSprayFixedSpellAttack | ChillTouchFixedSpellAttack | StarryWispFixedSpellAttack | FireBoltFixedSpellAttack | ShockingGraspFixedSpellAttack | GuidingBoltFixedSpellAttack | RayOfSicknessFixedSpellAttack | ProduceFlameHurlFixedSpellAttack
  type SpellAttackSequenceInvocation =
    | EldritchBlastBeamSequence
    | ScorchingRaySequence
  type ChainedSpellAttackDamageInvocation =
    | ChromaticOrbChainedSpellAttack
  type ChromaticOrbDamageTypeChoice = ChromaticOrbAcid | ChromaticOrbCold | ChromaticOrbFire | ChromaticOrbLightning | ChromaticOrbPoison | ChromaticOrbThunder
  type SaveGatedDamageInvocation = AcidSplashSaveGate | SacredFlameSaveGate | InflictWoundsSaveGate | BurningHandsSaveGate | FireballSaveGate | ViciousMockerySaveGate | DissonantWhispersSaveGate | HellishRebukeSaveGate | MindSpikeSaveGate
  type AttackBurstSaveDamageInvocation =
    | IceKnifeAttackBurstSaveDamage
  type SaveGatedConditionInvocation =
    | ColorSpraySaveGate
    | EntangleSaveGate
    | AnimalFriendshipSaveGate
    | CharmPersonSaveGate
    | BlindnessDeafnessSaveGate
    | HoldPersonSaveGate
  type BlindnessDeafnessConditionChoice =
    | BlindnessDeafnessBlindedChoice
    | BlindnessDeafnessDeafenedChoice
  type SaveGatedAttackRollAdvantageInvocation =
    | FaerieFireSaveGate
  type SaveGatedTargeting =
    | AreaSaveTargets
    | SingleSaveTarget
    | TargetListSaveTargets({ minTargets: int, baseSlotLevel: int, baseTargets: int, additionalTargetsPerSlotLevel: int })
  type SaveGatedDamageSuccess = NoDamageOnSaveSuccess | HalfDamageOnSaveSuccess
  type MovementSpeedKind = WalkSpeedKind | ClimbSpeedKind | SwimSpeedKind
  type SelfTransformationMode = AquaticAdaptationMode | ChangeAppearanceMode | NaturalWeaponsMode({ damageType: DamageType, spellcastingAbilityModifier: int, attackBonus: int })
  type JumpMovementLandingFact = JumpLegalLandingNoCheck | JumpLegalLandingAcrobaticsPassed | JumpLegalLandingAcrobaticsFailed | JumpIllegalLanding
  type DirectHitPointRestorationSpell = HealingWordRestoration | CureWoundsRestoration | MassHealingWordRestoration
  type ScalarBuffSpell = FalseLifeScalarBuff | LongstriderScalarBuff | ShieldOfFaithScalarBuff | SpiderClimbScalarBuff | BarkskinScalarBuff | AidScalarBuff
  type RollModifierSpell = BaneRollModifier | BlessRollModifier | GuidanceRollModifier | PassWithoutTraceRollModifier | EnhanceAbilityRollModifier
  type SpellActionCost = SpellMagicAction | SpellBonusAction
  type CommandOption = CommandGrovelOption | CommandHaltOption | CommandDropOption | CommandApproachOption | CommandFleeOption
  type SanctuaryTargetingTrigger = SanctuaryAttackRollTargeting | SanctuaryDamagingSpellTargeting | SanctuaryAreaOfEffectTargeting
  type SanctuaryInterdictionOutcome = SanctuarySaveSucceeded | SanctuaryLoseAttackOrSpell | SanctuaryChooseNewTarget({ target: Actor })
  type AbilityCheckSkill =
    | AcrobaticsSkill
    | AnimalHandlingSkill
    | ArcanaSkill
    | AthleticsSkill
    | DeceptionSkill
    | HistorySkill
    | InsightSkill
    | IntimidationSkill
    | InvestigationSkill
    | MedicineSkill
    | NatureSkill
    | PerceptionSkill
    | PerformanceSkill
    | PersuasionSkill
    | ReligionSkill
    | SleightOfHandSkill
    | StealthSkill
    | SurvivalSkill

  type MarkedDamageRiderTransfer = AwaitingTargetDrop | TransferAvailable | TransferAvailableAfterTurn({ actor: Actor, round: int })
  type ShillelaghWeapon = ShillelaghClub | ShillelaghQuarterstaff
  type HeldWeaponForShillelagh = HeldClub | HeldQuarterstaff | HeldOtherWeapon | HeldNoWeapon
  type FindFamiliarForm = FindFamiliarCat | FindFamiliarRat | FindFamiliarBat
  type FindFamiliarCreatureTypeOverride = FindFamiliarCelestial | FindFamiliarFey | FindFamiliarFiend
  type FindFamiliarPlacement = FindFamiliarUnoccupiedSpaceWithinSpellRange | FindFamiliarUnoccupiedSpaceWithin30Feet
  type FindFamiliarLifecycle =
    | NoFindFamiliar
    | PresentFindFamiliar({
        owner: Actor,
        familiar: Actor,
        form: FindFamiliarForm,
        creatureTypeOverride: FindFamiliarCreatureTypeOverride,
        initiative: int,
        placement: FindFamiliarPlacement,
      })
    | TemporarilyDismissedFindFamiliar({
        owner: Actor,
        form: FindFamiliarForm,
        creatureTypeOverride: FindFamiliarCreatureTypeOverride,
      })
    | DisappearedAtZeroHitPointsFindFamiliar({
        owner: Actor,
        form: FindFamiliarForm,
        creatureTypeOverride: FindFamiliarCreatureTypeOverride,
      })
  type FindFamiliarItemDropBoundaryEvent = {
    owner: Actor,
    familiar: Actor,
    objectId: int,
  }
  type FindFamiliarTelepathicConnection = {
    owner: Actor,
    familiar: Actor,
    rangeFeet: int,
    sharedLanguageRequired: bool,
  }
  type FindFamiliarSharedSenses = {
    owner: Actor,
    familiar: Actor,
    expiresAtStartOfOwnerNextTurn: bool,
    gainsSight: bool,
    gainsHearing: bool,
    gainsSpecialSenses: bool,
  }
  type FindFamiliarTouchSpellDelivery = {
    spellCast: bool,
    familiarReactionSpent: bool,
  }
  type PactOfTheChainFamiliarReactionAttack =
    | PactFamiliarReactionAttackResolved
    | PactFamiliarReactionAttackRejected
  type FindFamiliarLifecycleResult = {
    lifecycle: FindFamiliarLifecycle,
    itemDropBoundaryEvents: Set[FindFamiliarItemDropBoundaryEvent],
    magicActionSpent: bool,
  }
  type FlameBladeObjectState = FlameBladeHeldObject | FlameBladeReleasedObject
  type ActiveEffect = BardicInspirationDie({ source: Actor, dieSize: int, durationTicks: int }) | MageArmor({ durationTicks: int }) | RayOfFrostSpeedDelta | ShieldArmorClassBonus | LongstriderSpeedDelta | ShieldOfFaithArmorClassBonus | SpiderClimbClimbSpeedGrant({ durationTicks: int }) | BarkskinArmorClassFloor({ durationTicks: int }) | AidHitPointMaximumIncrease({ amount: int, durationTicks: int }) | HeroismFrightenedImmunity | HeroismTurnStartTemporaryHitPoints({ amount: int }) | CalmEmotionsCharmedImmunity | CalmEmotionsFrightenedImmunity | BaneD20RollPenalty | BlessD20RollBonus | GuidanceAbilityCheckBonus({ skill: AbilityCheckSkill }) | PassWithoutTraceStealthBonus | EnhanceAbilityCheckAdvantage({ ability: Ability }) | ThaumaturgyBoomingVoice({ source: Actor, durationTicks: int }) | ResistanceDamageReduction({ damageType: DamageType, usedThisTurn: bool }) | ProtectionFromPoisonSavingThrowAdvantage({ durationTicks: int }) | ProtectionFromPoisonPoisonResistance({ durationTicks: int }) | DivineFavorWeaponDamageRider({ durationTicks: int }) | HuntersMarkDamageRider({ target: Actor, transfer: MarkedDamageRiderTransfer, durationTicks: int }) | HexDamageRider({ target: Actor, ability: Ability, transfer: MarkedDamageRiderTransfer, durationTicks: int }) | RayOfSicknessPoisoned | ChillTouchHitPointRegainPrevented({ source: Actor, expiresAtRound: int }) | StarryWispInvisibleBenefitDenied({ source: Actor, expiresAtRound: int }) | ShockingGraspOpportunityAttackDenied | GuidingBoltNextAttackAdvantage | ViciousMockeryNextAttackDisadvantage | WeaponMasterySapNextAttackDisadvantage({ source: Actor }) | Blurred | MirrorImageDuplicates({ durationTicks: int, remainingDuplicates: int }) | ColorSprayBlinded({ source: Actor, expiresAtRound: int }) | EntangleRestrained | EnsnaringStrikeRestrained({ damageDice: int }) | SearingSmiteBurning({ damageDice: int, durationTicks: int }) | ShiningSmiteIllumination({ durationTicks: int }) | FaerieFireOutline | AnimalFriendshipCharmed({ source: Actor, durationTicks: int }) | CharmPersonCharmed({ source: Actor, durationTicks: int }) | BlindnessDeafnessBlinded({ source: Actor, durationTicks: int }) | BlindnessDeafnessDeafened({ source: Actor, durationTicks: int }) | ProtectionRelevantCharmed({ source: Actor, durationTicks: int }) | ProtectionRelevantFrightened({ source: Actor, durationTicks: int }) | ProtectionRelevantPossession({ source: Actor, durationTicks: int }) | ProtectionFromEvilAndGoodCreatureTypeProtection | DancingLightsEffect({ combined: bool, lightCount: int, light1Position: int, light2Position: int, light3Position: int, light4Position: int, durationTicks: int }) | ProduceFlameHeldLight({ durationTicks: int }) | FlameBladeEffect({ durationTicks: int, slotLevel: int, spellcastingAbilityModifier: int, objectState: FlameBladeObjectState }) | ShillelaghWeaponAttackOverride({ weapon: ShillelaghWeapon, damageDice: int, damageDieSize: int, spellcastingAbilityModifier: int, durationTicks: int }) | ExpeditiousRetreatDashBonusAction | JumpMovementReplacement({ durationTicks: int, usedThisTurn: bool }) | FeatherFallMitigation({ durationTicks: int }) | SanctuaryWard({ source: Actor, durationTicks: int }) | SleepPendingRepeatSave({ source: Actor, repeatAtActor: Actor, repeatAtRound: int, hadIncapacitated: bool }) | SleepUnconscious({ source: Actor, hadUnconscious: bool, hadIncapacitated: bool }) | HideousLaughterEffect({ source: Actor, target: Actor, hadProne: bool, hadIncapacitated: bool, durationTicks: int }) | GreaseGroundHazard({ areaId: int, durationTicks: int }) | FogCloudObscurement({ areaId: int, radiusFeet: int, durationTicks: int }) | FlamingSphere({ areaId: int, damageDice: int, durationTicks: int, ramMaxMoveFeet: int }) | HeatMetalObjectContactDamage({ objectId: int, damageDice: int, durationTicks: int, startedRound: int }) | CommandPending({ source: Actor, option: CommandOption, expiresAtActor: Actor, expiresAtRound: int }) | HoldPersonParalyzed({ source: Actor, hadIncapacitated: bool, durationTicks: int }) | InvisibilityCondition({ source: Actor, durationTicks: int }) | MindSpikeConcentrationDuration({ durationTicks: int }) | SelfTransformationModeEffect({ source: Actor, mode: SelfTransformationMode, durationTicks: int })

  pure def aidHitPointMaximumIncreaseAppliedAmount(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | AidHitPointMaximumIncrease(data) => data.amount
        | _ => 0
      })
      .fold(0, (highest, amount) => if (highest > amount) highest else amount)
  type PreventedProtectionCondition = PreventedCharmed | PreventedFrightened
  type PossessionAttemptDisposition = PossessionPreventedByCreatureTypeProtection | PossessionUnprevented
  type SpellAttackRollMode = NormalSpellAttackRoll | AdvantageSpellAttackRoll | DisadvantageSpellAttackRoll
  type SavingThrowRollMode = NormalSavingThrow | AdvantageSavingThrow | DisadvantageSavingThrow
  type AbilityCheckRollMode = NormalAbilityCheck | AdvantageAbilityCheck | DisadvantageAbilityCheck
  type SpellSourceClass = SorcererSpellSource | NonSorcererSpellSource
  type RuntimeCreatureType = HumanoidCreature | BeastCreature | AberrationCreature | CelestialCreature | ElementalCreature | FeyCreature | FiendCreature | UndeadCreature
  type ObjectTarget =
    | StarryWispObjectTarget
    | ChillTouchObjectTarget
    | EldritchBlastObjectTarget
    | ScorchingRayObjectTarget
    | FireBoltObjectTarget
    | FireballObjectTarget
    | ProduceFlameObjectTarget
    | LightObjectTarget
    | PriorLightObjectTarget
    | FaerieFireObjectTarget
  type ObjectOutline =
    | FaerieFireObjectOutline({ source: Actor, object: ObjectTarget })
  type ObjectSize = ObjectTiny | ObjectSmall | ObjectMedium | ObjectLarge | ObjectHuge | ObjectGargantuan
  type ObjectWearCarry = ObjectNotWornOrCarriedBySomeoneElse | ObjectWornOrCarriedByCaster | ObjectWornBySomeoneElse | ObjectCarriedBySomeoneElse
  type ObjectDamageDisposition =
    | ObjectHitPoints({ hitPoints: int })
    | ObjectHitPointsWithDamageThreshold({ hitPoints: int, damageThreshold: int })
    | ObjectTableResolved
  type ObjectDamageOutcome =
    | ObjectHitPointDamage({
        object: ObjectTarget,
        damageType: DamageType,
        rolledDamage: int,
        effectiveDamage: int,
        priorHitPoints: int,
        nextHitPoints: int,
        destroyed: bool,
      })
    | ObjectTableResolvedDamage({
        object: ObjectTarget,
        damageType: DamageType,
        rolledDamage: int,
      })
  type ObjectIgnitionDisposition =
    | ObjectFlammableUnattended
    | ObjectNotFlammable
    | ObjectWornOrCarried
  type ObjectIgnitionOutcome =
    | ObjectStartsBurning({
        object: ObjectTarget,
        source: Actor,
        sourceSpell: SpellInvocation,
      })
  type LightEmitterAttachment =
    | CombatantLightEmitter({ actor: Actor })
    | ObjectLightEmitter({ object: ObjectTarget })
    | DancingLightEmitter({ light: int, position: int, combined: bool })
  type LightEmitterProjectionFact =
    | CombatantLightEmitterProjectionFact({ actor: Actor, distanceFeet: int })
    | ObjectLightEmitterProjectionFact({ object: ObjectTarget, distanceFeet: int, opaqueCover: bool })
    | DancingLightEmitterProjectionFact({ light: int, position: int, combined: bool, distanceFeet: int })
  type LightEmission =
    | DimLightEmission({ radiusFeet: int })
    | BrightAndDimLightEmission({ brightRadiusFeet: int, dimAdditionalFeet: int })
  type LightEmitterOpaqueCoverInteraction =
    | LightEmitterBlocksOpaqueCover
    | LightEmitterDoesNotBlockOpaqueCover
  type Illumination =
    | BrightLightIllumination
    | DimLightIllumination
    | DarknessIllumination
  type SightObscurement =
    | UnobscuredSight
    | LightlyObscuredSight
    | HeavilyObscuredSight
  type SightObserver =
    | OrdinarySight
    | DarkvisionSight({ rangeFeet: int, distanceFeet: int })
  type LightEmitterExpiration =
    | EndOfTurnLightEmitterExpiration({ actor: Actor, round: int })
    | ConcentrationLightEmitterExpiration({ actor: Actor })
    | DurationLightEmitterExpiration({ durationTicks: int })
    | UntilDispelledLightEmitterExpiration
  type LightEmitter =
    | SpellLightEmitter({
        source: Actor,
        sourceSpell: SpellInvocation,
        attachment: LightEmitterAttachment,
        emission: LightEmission,
        opaqueCoverInteraction: LightEmitterOpaqueCoverInteraction,
        expiresAt: LightEmitterExpiration,
      })
    | ObjectInvisibleRevealLightEmitter({
        source: Actor,
        sourceSpell: SpellInvocation,
        object: ObjectTarget,
        dimLightRadiusFeet: int,
        expiresAtActor: Actor,
        expiresAtRound: int,
      })

  type ChainedSpellAttackDamageHole =
    | ChainedSpellDamageTypeChoice
    | ChainedStepTargetChoice({ stepIndex: int })
    | ChainedStepAttackRoll({ stepIndex: int })
    | ChainedStepDamageRoll({ stepIndex: int })

  type D8FaceCounts = {
    face1: int,
    face2: int,
    face3: int,
    face4: int,
    face5: int,
    face6: int,
    face7: int,
    face8: int,
  }

  type ChainedSpellAttackDamageReplay =
    | ChainedNeedsDamageType
    | ChainedNeedsInitialTarget({ slotLevel: int, selectedDamageType: ChromaticOrbDamageTypeChoice })
    | ChainedNeedsLeapTarget({
        slotLevel: int,
        selectedDamageType: ChromaticOrbDamageTypeChoice,
        previousTarget: Actor,
        targeted: Set[Actor],
        leapsUsed: int,
      })
    | ChainedNeedsAttackRoll({
        slotLevel: int,
        selectedDamageType: ChromaticOrbDamageTypeChoice,
        stepIndex: int,
        target: Actor,
        targeted: Set[Actor],
        leapsUsed: int,
      })
    | ChainedNeedsDamageRoll({
        slotLevel: int,
        selectedDamageType: ChromaticOrbDamageTypeChoice,
        stepIndex: int,
        target: Actor,
        targeted: Set[Actor],
        leapsUsed: int,
        criticalHit: bool,
      })
    | ChainedComplete

  type CreatureSize = Tiny | Small | Medium | Large | Huge | Gargantuan

  type HandUse = HFree | HMainWeapon | HOffWeapon | HShield | HGrapple | HSpellCreatedHeldObject

  pure def creatureSizeRank(creatureSize: CreatureSize): int =
    match creatureSize {
      | Tiny => 0
      | Small => 1
      | Medium => 2
      | Large => 3
      | Huge => 4
      | Gargantuan => 5
    }

  type Hole =
    | TargetChoice
    | ObjectTargetChoice
    | SpellTargetAllocation
    | SpellTargetList
    | AttackRoll
    | MirrorImageDuplicateRoll
    | DamageRoll
    | SpellDamageRoll
    | DeathSavingThrow
    | SavingThrowOutcome
    | GrappleOutcome
    | EscapeGrappleOutcome
    | AbilityCheck
    | ReactionDecision
    | StatBlockRechargeRoll
    | ConditionChoice

  type FighterWeaponAttackDamageRoll = {
    weaponDamageRoll: int,
    divineFavorDamageRoll: int,
    divineSmiteDamageRoll: int,
    huntersMarkDamageRoll: int,
  }
  type FighterSpellAttackDamageRoll = {
    spellDamageRoll: int,
    huntersMarkDamageRoll: int,
  }

  type ReactionTrigger = AttackHit | AttackDamage | SpellCast | SaveFailed | AfterDamage | OpportunityAttack

  type HellishRebukeAfterDamageTrigger =
    | HellishRebukeDamageFromVisibleCreatureWithin60Feet
    | HellishRebukeNoDamageTaken
    | HellishRebukeDamageNotFromCreature
    | HellishRebukeDamagerNotVisible
    | HellishRebukeDamagerOutside60Feet

  type HellishRebukeAfterDamageContinuation = {
    damager: Actor,
    damaged: Actor,
    slotLevel: int,
  }

  type HellishRebukeAfterDamageAvailability = {
    hellishRebukeAvailable: bool,
    reactionAvailable: bool,
    spellSlotAvailable: bool,
  }

  type CounterspellCastingResource =
    | CounterspellMagicAction
    | CounterspellBonusAction
    | CounterspellReaction

  type BattleTurnSpellSlotUse =
    | BattlePendingSpellSlotUse(Actor)
    | BattleCommittedSpellSlotUse(Actor)

  // This package-local Quint battle model has exactly two actors. Since a
  // creature spends its Reaction to cast Counterspell before that spell can be
  // countered, the only recursive Counterspell spell-cast opportunity
  // representable in this two-actor model is the other actor countering that
  // Counterspell. The TypeScript runtime keeps the general interrupt stack for
  // wider battle projections; this bounded summary is the two-actor parity
  // projection, not an SRD limit.
  type PendingCounterspellSpellCastReaction =
    | CounterspellSpellCastNotCountered
    | CounterspellSpellCastCounteredByReaction({
        reactor: Actor,
        counterspellSlotLevel: int,
        counterspellCasterConSaveSucceeded: bool,
      })

  type PendingCounterspellReaction = {
    triggeringCaster: Actor,
    triggeringCastingResource: CounterspellCastingResource,
    triggeringSpellLevel: int,
    triggeringSpellUsesSlot: bool,
    counterspellSlotLevel: int,
    triggeringCasterConSaveSucceeded: bool,
    counterspellSpellCastReaction: PendingCounterspellSpellCastReaction,
  }

  type PendingReactionProcedure =
    | ShieldReactionProcedure
    | CounterspellReactionProcedure(PendingCounterspellReaction)
    | OpportunityAttackReactionProcedure
    | ReadiedSpellReleaseReactionProcedure
    | DamageInterruptionReactionProcedure

  type LastTurnActor = NoTurnEnded | LastTurnFighter | LastTurnGoblin
  type FighterCriticalRange = DefaultCriticalRange | ImprovedCriticalRange19

  // Continuations carry the replay lane interrupted by a Reaction window. This
  // package-local QNT keeps representative deterministic fills for those lanes;
  // TypeScript carries the caller-provided fills in the runtime frame.
  type ReactionContinuation =
    | ResumeAttack({ damage: int })
    | ResumeRayOfFrost
    | ResumePoisonSpray
    | ResumeChillTouch
    | ResumeTrueStrikeWeaponAttack
    | ResumeProduceFlameHurl
    | ResumeFlameBladeAttack
    | ResumeIceKnife
    | ResumeSaveGateDamage
    | ResumeAfterDamage
    | ResumeHellishRebukeAfterDamage(HellishRebukeAfterDamageContinuation)
    | ResumeMovement({ speedKind: MovementSpeedKind, movementCost: int })
    | ResumeCommandFleeMovement({ speedKind: MovementSpeedKind, movementCost: int })
    | ResumeDissonantWhispersMovementThenAfterDamage({ speedKind: MovementSpeedKind, movementCost: int })

  type DissonantWhispersForcedMovementReplay =
    | DissonantWhispersMovementMissing
    | DissonantWhispersMovementFilled({
        speedKind: MovementSpeedKind,
        movementCost: int,
        provokesOpportunityAttack: bool,
      })

  type DissonantWhispersForcedMovementResult =
    | DissonantWhispersInvalidMovementFill
    | DissonantWhispersNeedsMovementFill
    | DissonantWhispersResolvedAfterDamage(BattleState)
    | DissonantWhispersOpportunityAttackWindow(BattleState)

  type PendingReactionFrame = {
    trigger: ReactionTrigger,
    procedure: PendingReactionProcedure,
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
    continuation: ReactionContinuation,
  }
  type AttackDamageConcentrationContinuation =
    | ResumeAttackDamageToGoblin
  type InterruptFrame =
    | PendingReaction(PendingReactionFrame)
    | PendingAttackDamageConcentration({ continuation: AttackDamageConcentrationContinuation, damage: int })
  type PendingReactionFrameOption =
    | NoPendingReactionFrame
    | HasPendingReactionFrame(PendingReactionFrame)

  pure def battleRuntimeReactionTrigger(trigger: ReactionTrigger): BattleRuntimeReactionTrigger =
    match trigger {
      | AttackHit => BattleRuntimeAttackHit
      | AttackDamage => BattleRuntimeAttackDamage
      | SpellCast => BattleRuntimeSpellCast
      | SaveFailed => BattleRuntimeSaveFailed
      | AfterDamage => BattleRuntimeAfterDamage
      | OpportunityAttack => BattleRuntimeOpportunityAttack
    }

  pure def reactionContinuationKind(continuation: ReactionContinuation): BattleRuntimeContinuationKind =
    match continuation {
      | ResumeAttack(_) => BattleRuntimeAttackDamageContinuation
      | ResumeRayOfFrost => BattleRuntimeSpellAttackContinuation
      | ResumePoisonSpray => BattleRuntimeSpellAttackContinuation
      | ResumeChillTouch => BattleRuntimeSpellAttackContinuation
      | ResumeTrueStrikeWeaponAttack => BattleRuntimeSpellAttackContinuation
      | ResumeProduceFlameHurl => BattleRuntimeSpellAttackContinuation
      | ResumeFlameBladeAttack => BattleRuntimeSpellAttackContinuation
      | ResumeIceKnife => BattleRuntimeSpellAttackContinuation
      | ResumeSaveGateDamage => BattleRuntimeSaveGateContinuation
      | ResumeAfterDamage => BattleRuntimeAfterDamageContinuation
      | ResumeHellishRebukeAfterDamage(_) => BattleRuntimeAfterDamageContinuation
      | ResumeMovement(_) => BattleRuntimeMovementContinuation
      | ResumeCommandFleeMovement(_) => BattleRuntimeMovementContinuation
      | ResumeDissonantWhispersMovementThenAfterDamage(_) => BattleRuntimeMovementContinuation
    }

  pure def battleRuntimeReactionProcedure(procedure: PendingReactionProcedure): BattleRuntimeReactionProcedure =
    match procedure {
      | ShieldReactionProcedure => BattleRuntimeShieldReactionProcedure
      | CounterspellReactionProcedure(_) => BattleRuntimeCounterspellReactionProcedure
      | OpportunityAttackReactionProcedure => BattleRuntimeOpportunityAttackProcedure
      | ReadiedSpellReleaseReactionProcedure => BattleRuntimeReadiedSpellReleaseProcedure
      | DamageInterruptionReactionProcedure => BattleRuntimeDamageInterruptionProcedure
    }

  type ZeroHpLifecycle = DiesAtZeroHp | UsesDeathSavingThrows
  type DamageDisposition = OrdinaryDamage | KnockOut

  type HiddenDiscoveryDc =
    | HiddenDc15
    | HiddenDc16
    | HiddenDc17
    | HiddenDc18
    | HiddenDc19
    | HiddenDc20

  type HiddenState =
    | NotHidden
    | HiddenByDc(HiddenDiscoveryDc)

  type ActiveOngoingFeatureOccurrence =
    | NoActiveOngoingFeatureOccurrence
    | ActiveStartOfTurnOngoingFeature
    | ActiveRoundExtendedOngoingFeature({
        expiresAtEndOfFighterTurnRound: int,
        maxExpiresRound: int,
      })
    | ActiveFixedDurationOngoingFeature({
        expiresAtEndOfFighterTurnRound: int,
      })

  type ActiveOngoingFeatureOccurrences = int -> ActiveOngoingFeatureOccurrence

  pure val FIGHTER_RAGE_SOURCE_KEY = 1
  pure val FIGHTER_RECKLESS_ATTACK_SOURCE_KEY = 2
  pure val NO_ACTIVE_ONGOING_FEATURE_OCCURRENCES: ActiveOngoingFeatureOccurrences =
    Map(
      FIGHTER_RAGE_SOURCE_KEY -> NoActiveOngoingFeatureOccurrence,
      FIGHTER_RECKLESS_ATTACK_SOURCE_KEY -> NoActiveOngoingFeatureOccurrence,
    )

  type Combatant = {
    hp: int,
    maxHp: int,
    tempHp: int,
    ac: int,
    dexMod: int,
    activeEffects: Set[ActiveEffect],
    concentrating: bool,
    unconscious: bool,
    // SRD 5.2.1 "Knocking Out a Creature": positive-HP Unconscious caused
    // by Knock Out, with the Knock Out ending rules rather than zero-HP
    // Death Saving Throw lifecycle.
    knockedOut: bool,
    stable: bool,
    deathSuccesses: int,
    deathFailures: int,
    lifecycle: ZeroHpLifecycle,
    reactionAvailable: bool,
    speed: int,
    hasRovingSpeedKindGrants: bool,
    movementSpent: int,
    hidden: HiddenState,
    dodging: bool,
    prone: bool,
    incapacitated: bool,
    // Runtime projection: true when the combatant is wearing armor whose
    // category is Heavy. This exists for SRD Barbarian Heavy-armor gates
    // without modeling full equipment/armor state in the Quint battle spec.
    wearingHeavyArmor: bool,
    activeOngoingFeatureOccurrences: ActiveOngoingFeatureOccurrences,
    creatureSize: CreatureSize,
    leftHandUse: HandUse,
    rightHandUse: HandUse,
  }

  type GrappleLink = {
    escapeDc: int,
    targetDragCostExempt: bool,
  }

  type GrappleState =
    | NoGrapple
    | FighterGrapplesGoblin(GrappleLink)

  type Initiative = {
    round: int,
    alreadyActed: List[Actor],
    stillToAct: List[Actor],
  }

  type BattleState = {
    initiative: Initiative,
    fighter: Combatant,
    goblin: Combatant,
    objectOutlines: Set[ObjectOutline],
    lightEmitters: Set[LightEmitter],
    actionAvailable: bool,
    bonusActionAvailable: bool,
    spellSlotUsesThisTurn: Set[BattleTurnSpellSlotUse],
    attackRollMadeThisTurn: bool,
    dashMovementBonus: int,
    disengaged: bool,
    lightWeaponAttackMade: bool,
    fighterReadiedSpellHeld: bool,
    fighterReadiedMovementHeld: bool,
    fighterHelpAttackGoblinForGoblin: bool,
    grapple: GrappleState,
    interruptStack: List[InterruptFrame],
    fighterHidePrerequisite: bool,
    goblinRechargeAvailable: bool,
    goblinLegendaryUsesRemaining: int,
    goblinMultiattackDispatchesRemaining: int,
    lastTurnActor: LastTurnActor,
    legendaryActionWindowConsumed: bool,
    fighterCriticalRange: FighterCriticalRange,
    fighterSneakAttackSupported: bool,
    fighterSneakAttackUsedThisTurn: bool,
    fighterExtraAttackSupported: bool,
    fighterExtraAttackSlotsRemaining: int,
    fighterLongswordSapMastery: bool,
    fighterQuarterstaffToppleMastery: bool,
    fighterGreataxeCleaveMastery: bool,
    fighterCleaveExtraAttackUsedThisTurn: bool,
  }

  pure def combatantHasFreeHand(combatant: Combatant): bool =
    combatant.leftHandUse == HFree or combatant.rightHandUse == HFree

  pure def combatantWithoutSpellCreatedHeldObjectHand(combatant: Combatant): Combatant = {
    ...combatant,
    leftHandUse: if (combatant.leftHandUse == HSpellCreatedHeldObject) HFree else combatant.leftHandUse,
    rightHandUse: if (combatant.rightHandUse == HSpellCreatedHeldObject) HFree else combatant.rightHandUse,
  }

  pure def combatantWithSpellCreatedHeldObjectHand(combatant: Combatant): Combatant = {
    val withoutPrior = combatantWithoutSpellCreatedHeldObjectHand(combatant)
    if (withoutPrior.leftHandUse == HFree)
      { ...withoutPrior, leftHandUse: HSpellCreatedHeldObject }
    else if (withoutPrior.rightHandUse == HFree)
      { ...withoutPrior, rightHandUse: HSpellCreatedHeldObject }
    else
      withoutPrior
  }

  pure def activeEffectsContainHeldSpellCreatedHeldObject(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | FlameBladeEffect(data) => data.objectState == FlameBladeHeldObject
      | _ => false
    })

  pure def combatantWithSpellCreatedHeldObjectHandStateFromActiveEffects(combatant: Combatant): Combatant =
    if (activeEffectsContainHeldSpellCreatedHeldObject(combatant.activeEffects))
      combatant
    else
      combatantWithoutSpellCreatedHeldObjectHand(combatant)

  type ActionSurgeResult = {
    state: BattleState,
    usesRemaining: int,
    usedThisTurn: bool,
  }

  type SecondWindResult = {
    state: BattleState,
    usesRemaining: int,
  }

  type CuttingWordsResult = {
    state: BattleState,
    usesRemaining: int,
  }

  type BonusActionDashTemporaryHitPointsResult = {
    state: BattleState,
    usesRemaining: int,
  }

  type MonkFocusBattleOptionResult = {
    state: BattleState,
    focusPointsRemaining: int,
    flurryStrikesRemaining: int,
  }

  type FeatherFallLandingResult =
    | FeatherFallLandingMitigated({ state: BattleState })
    | FeatherFallLandingUnmitigated({ state: BattleState })

  type AttackReplay =
    | AttackNeedsTarget
    | AttackNeedsAttackRoll
    | AttackRollFilled({ attackTotal: int, naturalD20: int })
    | AttackReplayComplete

  pure val initialState: BattleState = {
    initiative: { round: 1, alreadyActed: [], stillToAct: [Fighter, Goblin] },
    fighter: {
      hp: 12,
      maxHp: 12,
      tempHp: 0,
      ac: 10,
      dexMod: 0,
      activeEffects: Set(),
      concentrating: false,
      unconscious: false,
      knockedOut: false,
      stable: false,
      deathSuccesses: 0,
      deathFailures: 0,
      lifecycle: UsesDeathSavingThrows,
      reactionAvailable: true,
      speed: 30,
      hasRovingSpeedKindGrants: false,
      movementSpent: 0,
      hidden: NotHidden,
      dodging: false,
      prone: false,
      incapacitated: false,
      wearingHeavyArmor: false,
      activeOngoingFeatureOccurrences: NO_ACTIVE_ONGOING_FEATURE_OCCURRENCES,
      creatureSize: Medium,
      leftHandUse: HFree,
      rightHandUse: HMainWeapon,
    },
    goblin: {
      hp: 10,
      maxHp: 10,
      tempHp: 0,
      ac: 15,
      dexMod: 2,
      activeEffects: Set(),
      concentrating: false,
      unconscious: false,
      knockedOut: false,
      stable: false,
      deathSuccesses: 0,
      deathFailures: 0,
      lifecycle: DiesAtZeroHp,
      reactionAvailable: true,
      speed: 30,
      hasRovingSpeedKindGrants: false,
      movementSpent: 0,
      hidden: NotHidden,
      dodging: false,
      prone: false,
      incapacitated: false,
      wearingHeavyArmor: false,
      activeOngoingFeatureOccurrences: NO_ACTIVE_ONGOING_FEATURE_OCCURRENCES,
      creatureSize: Small,
      leftHandUse: HFree,
      rightHandUse: HFree,
    },
    objectOutlines: Set(),
    lightEmitters: Set(),
    actionAvailable: true,
    bonusActionAvailable: true,
    spellSlotUsesThisTurn: Set(),
    attackRollMadeThisTurn: false,
    dashMovementBonus: 0,
    disengaged: false,
    lightWeaponAttackMade: false,
    fighterReadiedSpellHeld: false,
    fighterReadiedMovementHeld: false,
    fighterHelpAttackGoblinForGoblin: false,
    grapple: NoGrapple,
    interruptStack: [],
    fighterHidePrerequisite: false,
    goblinRechargeAvailable: true,
    goblinLegendaryUsesRemaining: 2,
    goblinMultiattackDispatchesRemaining: 0,
    lastTurnActor: NoTurnEnded,
    legendaryActionWindowConsumed: false,
    fighterCriticalRange: DefaultCriticalRange,
    fighterSneakAttackSupported: false,
    fighterSneakAttackUsedThisTurn: false,
    fighterExtraAttackSupported: false,
    fighterExtraAttackSlotsRemaining: 0,
    fighterLongswordSapMastery: false,
    fighterQuarterstaffToppleMastery: false,
    fighterGreataxeCleaveMastery: false,
    fighterCleaveExtraAttackUsedThisTurn: false,
  }

  // The battle runtime receives Initiative counts and the caller-resolved
  // order for tied counts at the boundary. The spec treats that order as
  // authoritative once battle starts.
  pure val callerOrderedTieInitialState: BattleState = {
    ...initialState,
    initiative: { round: 1, alreadyActed: [], stillToAct: [Goblin, Fighter] },
  }
}
