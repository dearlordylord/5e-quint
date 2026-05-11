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
  // - Spells/Descriptions-A-D.md: Acid Splash and Cure Wounds.
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
    | ShockingGraspSpellAttackProfile
    | GuidingBoltSpellAttackProfile
    | RayOfSicknessSpellAttackProfile
    | ProduceFlameHurlSpellAttackProfile

  type SpellAttackDamageHitEffect =
    | RayOfFrostSpeedReductionHitEffect
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

  type SpellSaveGatedDamageProfile =
    | AcidSplashSaveDamageProfile
    | SacredFlameSaveDamageProfile
    | InflictWoundsSaveDamageProfile
    | BurningHandsSaveDamageProfile
    | ViciousMockerySaveDamageProfile

  type SpellSaveGatedConditionProfile =
    | ColorSpraySaveConditionProfile
    | EntangleSaveConditionProfile
    | AnimalFriendshipSaveConditionProfile
    | CharmPersonSaveConditionProfile
    | FaerieFireSaveAttackRollAdvantageProfile

  type SpellSaveGatedFailedEffect =
    | ViciousMockeryNextAttackDisadvantageEffect
    | ColorSprayBlindedEffect
    | EntangleRestrainedEffect
    | AnimalFriendshipCharmedEffect({ durationMinutes: int })
    | CharmPersonCharmedEffect({ durationMinutes: int })
    | FaerieFireAttackRollAdvantageEffect

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
      | ShockingGraspSpellAttackProfile => LightningDamage
      | GuidingBoltSpellAttackProfile => RadiantDamage
      | RayOfSicknessSpellAttackProfile => PoisonDamage
      | ProduceFlameHurlSpellAttackProfile => FireDamage
    }

  pure def spellAttackDamageProfileHitEffects(profile: SpellAttackDamageProfile): Set[SpellAttackDamageHitEffect] =
    match profile {
      | RayOfFrostSpellAttackProfile => Set(RayOfFrostSpeedReductionHitEffect)
      | PoisonSpraySpellAttackProfile => Set()
      | ChillTouchSpellAttackProfile => Set()
      | StarryWispSpellAttackProfile => Set()
      | ShockingGraspSpellAttackProfile => Set(ShockingGraspOpportunityAttackDeniedHitEffect)
      | GuidingBoltSpellAttackProfile => Set(GuidingBoltNextAttackAdvantageHitEffect)
      | RayOfSicknessSpellAttackProfile => Set(RayOfSicknessPoisonedHitEffect)
      | ProduceFlameHurlSpellAttackProfile => Set()
    }

  pure def spellAttackDamageProfileSupportsObjectTarget(profile: SpellAttackDamageProfile): bool =
    profile == StarryWispSpellAttackProfile

  pure def spellSaveGatedDamageTargeting(profile: SpellSaveGatedDamageProfile): SpellSaveGatedTargeting =
    match profile {
      | AcidSplashSaveDamageProfile => SpellAreaSaveTargets
      | SacredFlameSaveDamageProfile => SpellSingleSaveTarget
      | InflictWoundsSaveDamageProfile => SpellSingleSaveTarget
      | BurningHandsSaveDamageProfile => SpellAreaSaveTargets
      | ViciousMockerySaveDamageProfile => SpellSingleSaveTarget
    }

  pure def spellSaveGatedDamageSuccess(profile: SpellSaveGatedDamageProfile): SpellSaveGatedDamageSuccess =
    match profile {
      | AcidSplashSaveDamageProfile => SpellNoDamageOnSaveSuccess
      | SacredFlameSaveDamageProfile => SpellNoDamageOnSaveSuccess
      | InflictWoundsSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | BurningHandsSaveDamageProfile => SpellHalfDamageOnSaveSuccess
      | ViciousMockerySaveDamageProfile => SpellNoDamageOnSaveSuccess
    }

  pure def spellSaveGatedDamageType(profile: SpellSaveGatedDamageProfile): RuleDamageType =
    match profile {
      | AcidSplashSaveDamageProfile => AcidDamage
      | SacredFlameSaveDamageProfile => RadiantDamage
      | InflictWoundsSaveDamageProfile => NecroticDamage
      | BurningHandsSaveDamageProfile => FireDamage
      | ViciousMockerySaveDamageProfile => PsychicDamage
    }

  pure def spellSaveGatedDamageRequiresSlot(profile: SpellSaveGatedDamageProfile): bool =
    match profile {
      | AcidSplashSaveDamageProfile => false
      | SacredFlameSaveDamageProfile => false
      | InflictWoundsSaveDamageProfile => true
      | BurningHandsSaveDamageProfile => true
      | ViciousMockerySaveDamageProfile => false
    }

  pure def spellSaveGatedDamageFailedSaveEffects(profile: SpellSaveGatedDamageProfile): Set[SpellSaveGatedFailedEffect] =
    match profile {
      | ViciousMockerySaveDamageProfile => Set(ViciousMockeryNextAttackDisadvantageEffect)
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
      | FaerieFireSaveAttackRollAdvantageProfile => Set(FaerieFireAttackRollAdvantageEffect)
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
      assert(spellAttackDamageProfileDamageType(ShockingGraspSpellAttackProfile) == LightningDamage),
      assert(spellAttackDamageProfileDamageType(GuidingBoltSpellAttackProfile) == RadiantDamage),
      assert(spellAttackDamageProfileDamageType(RayOfSicknessSpellAttackProfile) == PoisonDamage),
      assert(spellAttackDamageProfileDamageType(ProduceFlameHurlSpellAttackProfile) == FireDamage),
      assert(spellAttackDamageProfileHitEffects(RayOfFrostSpellAttackProfile) == Set(RayOfFrostSpeedReductionHitEffect)),
      assert(spellAttackDamageProfileHitEffects(ShockingGraspSpellAttackProfile) == Set(ShockingGraspOpportunityAttackDeniedHitEffect)),
      assert(spellAttackDamageProfileHitEffects(GuidingBoltSpellAttackProfile) == Set(GuidingBoltNextAttackAdvantageHitEffect)),
      assert(spellAttackDamageProfileHitEffects(RayOfSicknessSpellAttackProfile) == Set(RayOfSicknessPoisonedHitEffect)),
      assert(spellAttackDamageProfileHitEffects(StarryWispSpellAttackProfile) == Set()),
      assert(spellAttackDamageProfileSupportsObjectTarget(StarryWispSpellAttackProfile)),
      assert(not(spellAttackDamageProfileSupportsObjectTarget(RayOfFrostSpellAttackProfile))),
    }
  }

  run test_save_gated_spell_profiles_project_damage_targeting_and_effects = {
    val animalTargets = spellSaveGatedConditionTargeting(AnimalFriendshipSaveConditionProfile)
    all {
      assert(spellSaveGatedDamageTargeting(SacredFlameSaveDamageProfile) == SpellSingleSaveTarget),
      assert(spellSaveGatedDamageTargeting(BurningHandsSaveDamageProfile) == SpellAreaSaveTargets),
      assert(spellSaveGatedDamageSuccess(InflictWoundsSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(ViciousMockerySaveDamageProfile) == SpellNoDamageOnSaveSuccess),
      assert(spellSaveGatedDamageType(ViciousMockerySaveDamageProfile) == PsychicDamage),
      assert(spellSaveGatedDamageRequiresSlot(BurningHandsSaveDamageProfile)),
      assert(not(spellSaveGatedDamageRequiresSlot(AcidSplashSaveDamageProfile))),
      assert(spellSaveGatedDamageFailedSaveEffects(ViciousMockerySaveDamageProfile) == Set(ViciousMockeryNextAttackDisadvantageEffect)),
      assert(spellSaveGatedConditionTargeting(ColorSpraySaveConditionProfile) == SpellAreaSaveTargets),
      assert(spellSaveGatedTargetMaxTargets(animalTargets, 1) == 1),
      assert(spellSaveGatedTargetMaxTargets(animalTargets, 2) == 2),
      assert(spellSaveGatedConditionFailedSaveEffects(EntangleSaveConditionProfile) == Set(EntangleRestrainedEffect)),
      assert(spellSaveGatedConditionFailedSaveEffects(FaerieFireSaveAttackRollAdvantageProfile) == Set(FaerieFireAttackRollAdvantageEffect)),
      assert(spellSaveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveConditionProfile, true, false)),
      assert(not(spellSaveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveConditionProfile, false, true))),
      assert(spellSaveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveConditionProfile, false, true)),
      assert(not(spellSaveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveConditionProfile, true, false))),
      assert(spellSaveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveConditionProfile, true)),
      assert(not(spellSaveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveConditionProfile, false))),
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
