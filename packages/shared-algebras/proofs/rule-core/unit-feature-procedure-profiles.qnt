// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.martial-arts-attack-projection unit-feature.passive-armor-class-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.zero-hit-point-replacement
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP

module unitFeatureProcedureProfiles {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import unitFeaturePoolCostCore.* from "./unit-feature-pool-cost-core"

  // RAW anchors:
  // - Classes/Rogue.md: Cunning Action and Uncanny Dodge.
  // - Classes/Bard.md: Bardic Inspiration and College of Lore Cutting Words.
  // - Classes/Sorcerer.md: Innate Sorcery activation.
  // - Classes/Monk.md: Martial Arts attack projection, Unarmored Movement,
  //   Deflect Attacks.
  // - Feats.md: Defense.
  // - Character-Origins.md: Orc Relentless Endurance.
  // - Playing-the-Game.md: Bonus Actions, Reactions, Damage Rolls, Dropping to
  //   0 Hit Points, Instant Death, Saving Throws and Damage, Resistance and
  //   Vulnerability.

  type ReactionRollReductionKind =
    | CuttingWordsAttackRollReduction
    | CuttingWordsAbilityCheckReduction

  type CuttingWordsTriggerFacts = {
    creatureSeen: bool,
    creatureWithinSixtyFeet: bool,
  }

  type CuttingWordsRollFacts = {
    trigger: CuttingWordsTriggerFacts,
    kind: ReactionRollReductionKind,
    originalTotal: int,
    dc: int,
    bardicDieRoll: int,
  }

  type CuttingWordsDamageFacts = {
    trigger: CuttingWordsTriggerFacts,
    damageRoll: int,
    bardicDieRoll: int,
  }

  type UncannyDodgeFacts = {
    attackerSeen: bool,
    hitWithAttackRoll: bool,
    incomingDamage: int,
  }

  type DeflectAttacksReductionFacts = {
    incomingDamage: int,
    damageIncludesBludgeoningPiercingOrSlashing: bool,
    deflectRoll: int,
    dexterityModifier: int,
    monkLevel: int,
  }

  type DeflectAttacksRedirectTargetFacts = {
    targetSeen: bool,
    attackWasMelee: bool,
    targetWithinFiveFeet: bool,
    targetWithinSixtyFeet: bool,
    targetBehindTotalCover: bool,
  }

  type DeflectAttacksRedirectFacts = {
    target: DeflectAttacksRedirectTargetFacts,
    savingThrowSucceeded: bool,
    firstMartialArtsRoll: int,
    secondMartialArtsRoll: int,
    dexterityModifier: int,
  }

  type CuttingWordsReductionResult = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    reducedAmount: int,
  }

  type UncannyDodgeReductionResult = {
    turn: TurnProcedureState,
    reducedAmount: int,
  }

  type DeflectAttacksReductionResult = {
    turn: TurnProcedureState,
    reducedAmount: int,
  }

  type DeflectAttacksRedirectResult = {
    pool: FeatureUsePool,
    redirectedDamage: int,
  }

  type PassiveArmorClassBonusFacts = {
    wearingLightArmor: bool,
    wearingMediumArmor: bool,
    wearingHeavyArmor: bool,
  }

  type PassiveSpeedBonusEquipmentGate =
    | NotWearingHeavyArmorSpeedBonusGate
    | UnarmoredUnshieldedSpeedBonusGate

  type ArmorWorn =
    | NoArmorWorn
    | LightArmorWorn
    | MediumArmorWorn
    | HeavyArmorWorn

  type PassiveSpeedBonusFacts = {
    baseSpeedFeet: int,
    gate: PassiveSpeedBonusEquipmentGate,
    armorWorn: ArmorWorn,
    wieldingShield: bool,
    movementSpentFeet: int,
  }

  type PassiveSpeedBonusResult = {
    effectiveSpeedFeet: int,
    movementRemainingFeet: int,
    dashMovementBonusFeet: int,
  }

  type MovementSpeedKind =
    | WalkSpeedKind
    | ClimbSpeedKind
    | SwimSpeedKind

  type PassiveSpeedKindGrantsFacts = {
    baseSpeedFeet: int,
    wearingHeavyArmor: bool,
    movementSpentFeet: int,
    chosenSpeedKind: MovementSpeedKind,
  }

  type PassiveSpeedKindGrantsResult = {
    chosenSpeedKind: MovementSpeedKind,
    walkSpeedFeet: int,
    climbSpeedFeet: int,
    swimSpeedFeet: int,
    movementRemainingFeet: int,
    dashMovementBonusFeet: int,
  }

  type MartialArtsAttackForm =
    | MartialArtsUnarmedStrike
    | MartialArtsMonkWeapon
    | MartialArtsOtherWeapon

  type MartialArtsEligibilityFacts = {
    unarmored: bool,
    wieldingShield: bool,
    attackForm: MartialArtsAttackForm,
  }

  type MartialArtsAttackProjectionFacts = {
    eligibility: MartialArtsEligibilityFacts,
    monkLevel: int,
    strengthModifier: int,
    dexterityModifier: int,
    normalDamageDice: int,
    normalDamageDieSize: int,
    proficiencyBonus: int,
  }

  type MartialArtsAttackProjectionResult = {
    eligible: bool,
    attackAbilityModifier: int,
    damageAbilityModifier: int,
    damageDice: int,
    damageDieSize: int,
    unarmedStrikeSaveDc: int,
  }

  type MartialArtsBonusUnarmedStrikeResult = {
    turn: TurnProcedureState,
    admitted: bool,
  }

  type ZeroHitPointReplacementFacts = {
    incomingDamage: int,
    choosesFeature: bool,
  }

  type ZeroHitPointReplacementResult = {
    admitted: bool,
    pool: FeatureUsePool,
    vitals: CreatureVitals,
    deathSavingThrows: DeathSavingThrowLifecycle,
  }

  pure def wearingArmorForDefense(facts: PassiveArmorClassBonusFacts): bool =
    facts.wearingLightArmor or facts.wearingMediumArmor or facts.wearingHeavyArmor

  pure def defenseArmorClass(baseArmorClass: int, facts: PassiveArmorClassBonusFacts): int =
    if (wearingArmorForDefense(facts)) baseArmorClass + 1 else baseArmorClass

  pure def wearingAnyArmorForSpeedBonus(facts: PassiveSpeedBonusFacts): bool =
    facts.armorWorn != NoArmorWorn

  pure def passiveSpeedBonusApplies(facts: PassiveSpeedBonusFacts): bool =
    match facts.gate {
      | NotWearingHeavyArmorSpeedBonusGate => facts.armorWorn != HeavyArmorWorn
      | UnarmoredUnshieldedSpeedBonusGate =>
        not(wearingAnyArmorForSpeedBonus(facts)) and not(facts.wieldingShield)
    }

  pure def passiveSpeedBonusDelta(facts: PassiveSpeedBonusFacts): int =
    if (passiveSpeedBonusApplies(facts)) 10 else 0

  pure def passiveSpeedBonus(facts: PassiveSpeedBonusFacts): int =
    passiveSpeedBonusDelta(facts)

  pure def passiveSpeedBonusEffectiveSpeed(facts: PassiveSpeedBonusFacts): int =
    facts.baseSpeedFeet + passiveSpeedBonus(facts)

  pure def resolvePassiveSpeedBonusBudget(
    turn: TurnProcedureState,
    facts: PassiveSpeedBonusFacts
  ): PassiveSpeedBonusResult = {
    val speed = passiveSpeedBonusEffectiveSpeed(facts)
    {
      effectiveSpeedFeet: speed,
      movementRemainingFeet:
        nonnegative(speed + turn.dashMovementBonusFeet - facts.movementSpentFeet),
      dashMovementBonusFeet: turn.dashMovementBonusFeet,
    }
  }

  pure def resolvePassiveSpeedBonusDash(
    turn: TurnProcedureState,
    facts: PassiveSpeedBonusFacts
  ): PassiveSpeedBonusResult = {
    val speed = passiveSpeedBonusEffectiveSpeed(facts)
    val dashed = resolveDash(turn, speed, StandardActionCost(DashAction))
    resolvePassiveSpeedBonusBudget(dashed, facts)
  }

  pure def rovingEffectiveSpeed(facts: PassiveSpeedKindGrantsFacts): int =
    passiveSpeedBonusEffectiveSpeed({
      baseSpeedFeet: facts.baseSpeedFeet,
      gate: NotWearingHeavyArmorSpeedBonusGate,
      armorWorn: if (facts.wearingHeavyArmor) HeavyArmorWorn else NoArmorWorn,
      wieldingShield: false,
      movementSpentFeet: facts.movementSpentFeet,
    })

  pure def resolveRovingSpeedKindBudget(
    turn: TurnProcedureState,
    facts: PassiveSpeedKindGrantsFacts
  ): PassiveSpeedKindGrantsResult = {
    val speed = rovingEffectiveSpeed(facts)
    {
      chosenSpeedKind: facts.chosenSpeedKind,
      walkSpeedFeet: speed,
      climbSpeedFeet: speed,
      swimSpeedFeet: speed,
      movementRemainingFeet:
        nonnegative(speed + turn.dashMovementBonusFeet - facts.movementSpentFeet),
      dashMovementBonusFeet: turn.dashMovementBonusFeet,
    }
  }

  pure def resolveRovingSpeedKindDash(
    turn: TurnProcedureState,
    facts: PassiveSpeedKindGrantsFacts
  ): PassiveSpeedKindGrantsResult = {
    val speed = rovingEffectiveSpeed(facts)
    val dashed = resolveDash(turn, speed, StandardActionCost(DashAction))
    resolveRovingSpeedKindBudget(dashed, facts)
  }

  pure def martialArtsAttackEligible(facts: MartialArtsEligibilityFacts): bool =
    facts.unarmored and
    not(facts.wieldingShield) and
    (
      facts.attackForm == MartialArtsUnarmedStrike or
      facts.attackForm == MartialArtsMonkWeapon
    )

  pure def martialArtsChosenAbilityModifier(
    eligible: bool,
    strengthModifier: int,
    dexterityModifier: int
  ): int =
    if (eligible and dexterityModifier >= strengthModifier)
      dexterityModifier
    else
      strengthModifier

  pure def martialArtsDieSizeAtMonkLevel(monkLevel: int): int =
    if (monkLevel >= 17) 12
    else if (monkLevel >= 11) 10
    else if (monkLevel >= 5) 8
    else 6

  pure def martialArtsDamageDieSize(
    eligible: bool,
    monkLevel: int,
    normalDamageDice: int,
    normalDamageDieSize: int
  ): int =
    {
      val martialArtsDieSize = martialArtsDieSizeAtMonkLevel(monkLevel)
      if (
        eligible and
        (normalDamageDice == 0 or normalDamageDice == 1) and
        normalDamageDieSize < martialArtsDieSize
      )
        martialArtsDieSize
      else
        normalDamageDieSize
    }

  pure def resolveMartialArtsAttackProjection(
    facts: MartialArtsAttackProjectionFacts
  ): MartialArtsAttackProjectionResult = {
    val eligible = martialArtsAttackEligible(facts.eligibility)
    val chosenModifier = martialArtsChosenAbilityModifier(
      eligible,
      facts.strengthModifier,
      facts.dexterityModifier
    )
    val damageDieSize = martialArtsDamageDieSize(
      eligible,
      facts.monkLevel,
      facts.normalDamageDice,
      facts.normalDamageDieSize
    )
    val damageDice =
      if (eligible and facts.normalDamageDice == 0) 1 else facts.normalDamageDice
    {
      eligible: eligible,
      attackAbilityModifier: chosenModifier,
      damageAbilityModifier: chosenModifier,
      damageDice: damageDice,
      damageDieSize: damageDieSize,
      unarmedStrikeSaveDc: 8 + chosenModifier + facts.proficiencyBonus,
    }
  }

  pure def resolveMartialArtsBonusUnarmedStrike(
    turn: TurnProcedureState,
    facts: MartialArtsEligibilityFacts
  ): MartialArtsBonusUnarmedStrikeResult = {
    val admitted = turn.bonusActionAvailable and martialArtsAttackEligible(facts)
    {
      turn: if (admitted) spendActionCost(turn, BonusActionCost) else turn,
      admitted: admitted,
    }
  }

  pure def damageWouldKillOutright(
    before: CreatureVitals,
    damageResult: DamageResult
  ): bool =
    before.kind == PlayerCharacter
      and before.hitPoints > 0
      and damageResult.vitals.hitPoints == 0
      and damageResult.remainingDamageAtZero >= before.hitPointMaximum

  pure def resolveZeroHitPointReplacement(
    before: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    pool: FeatureUsePool,
    facts: ZeroHitPointReplacementFacts
  ): ZeroHitPointReplacementResult = {
    val damaged = applyResolvedDamageToPositiveHitPoints(
      before,
      facts.incomingDamage
    )
    val admitted = all {
      legalVitals(before),
      legalDeathSavingThrowLifecycle(lifecycle),
      before.kind == PlayerCharacter,
      before.hitPoints > 0,
      damaged.vitals.hitPoints == 0,
      not(damageWouldKillOutright(before, damaged)),
      facts.choosesFeature,
      pool.usesRemaining > 0,
    }
    {
      admitted: admitted,
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      vitals:
        if (admitted) {
          kind: before.kind,
          hitPoints: 1,
          hitPointMaximum: before.hitPointMaximum,
          temporaryHitPoints: damaged.vitals.temporaryHitPoints,
          dead: false,
          unconscious: false,
        } else damaged.vitals,
      deathSavingThrows:
        if (admitted) lifecycle
        else deathSavingThrowLifecycleAfterPositiveHitPointDamage(
          lifecycle,
          damaged
        ),
    }
  }

  pure def cuttingWordsRollTotalAfterReduction(facts: CuttingWordsRollFacts): int =
    nonnegative(facts.originalTotal - facts.bardicDieRoll)

  pure def cuttingWordsTurnsSuccessIntoFailure(facts: CuttingWordsRollFacts): bool = all {
    facts.originalTotal >= facts.dc,
    cuttingWordsRollTotalAfterReduction(facts) < facts.dc,
  }

  pure def cuttingWordsDamageAfterReduction(facts: CuttingWordsDamageFacts): int =
    nonnegative(facts.damageRoll - facts.bardicDieRoll)

  pure def cuttingWordsTriggerAvailable(trigger: CuttingWordsTriggerFacts): bool = all {
    trigger.creatureSeen,
    trigger.creatureWithinSixtyFeet,
  }

  pure def uncannyDodgeDamage(facts: UncannyDodgeFacts): int =
    if (facts.attackerSeen and facts.hitWithAttackRoll) nonnegative(facts.incomingDamage) / 2
    else nonnegative(facts.incomingDamage)

  pure def deflectAttacksDamageAfterReduction(facts: DeflectAttacksReductionFacts): int =
    nonnegative(facts.incomingDamage - (facts.deflectRoll + facts.dexterityModifier + facts.monkLevel))

  pure def deflectAttacksRedirectTargetEligible(facts: DeflectAttacksRedirectTargetFacts): bool =
    all {
      facts.targetSeen,
      if (facts.attackWasMelee)
        facts.targetWithinFiveFeet
      else
        all { facts.targetWithinSixtyFeet, not(facts.targetBehindTotalCover) },
    }

  pure def deflectAttacksRedirectDamage(facts: DeflectAttacksRedirectFacts): int =
    if (facts.savingThrowSucceeded) 0
    else nonnegative(facts.firstMartialArtsRoll + facts.secondMartialArtsRoll + facts.dexterityModifier)

  pure def resolveDeflectAttacksReductionReaction(
    turn: TurnProcedureState,
    facts: DeflectAttacksReductionFacts
  ): DeflectAttacksReductionResult = {
    val admitted = all {
      turn.reactionAvailable,
      facts.damageIncludesBludgeoningPiercingOrSlashing,
      facts.deflectRoll >= 1,
      facts.deflectRoll <= 10,
      facts.monkLevel >= 3,
    }
    {
      turn: if (admitted) spendReaction(turn) else turn,
      reducedAmount:
        if (admitted) deflectAttacksDamageAfterReduction(facts)
        else nonnegative(facts.incomingDamage),
    }
  }

  pure def resolveDeflectAttacksZeroDamageRedirect(
    pool: FeatureUsePool,
    reducedDamage: int,
    facts: DeflectAttacksRedirectFacts
  ): DeflectAttacksRedirectResult = {
    val admitted = all {
      reducedDamage == 0,
      pool.usesRemaining > 0,
      deflectAttacksRedirectTargetEligible(facts.target),
      facts.firstMartialArtsRoll >= 1,
      facts.secondMartialArtsRoll >= 1,
    }
    {
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      redirectedDamage: if (admitted) deflectAttacksRedirectDamage(facts) else 0,
    }
  }

  pure def resolveCuttingWordsDamageReaction(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    facts: CuttingWordsDamageFacts
  ): CuttingWordsReductionResult = {
    val admitted = all {
      turn.reactionAvailable,
      pool.usesRemaining > 0,
      cuttingWordsTriggerAvailable(facts.trigger),
      facts.bardicDieRoll >= 1,
      facts.bardicDieRoll <= 12,
    }
    {
      turn: if (admitted) spendReaction(turn) else turn,
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      reducedAmount:
        if (admitted) cuttingWordsDamageAfterReduction(facts)
        else nonnegative(facts.damageRoll),
    }
  }

  pure def resolveCuttingWordsRollReaction(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    facts: CuttingWordsRollFacts
  ): CuttingWordsReductionResult = {
    val admitted = all {
      turn.reactionAvailable,
      pool.usesRemaining > 0,
      cuttingWordsTriggerAvailable(facts.trigger),
      facts.originalTotal >= facts.dc,
      facts.bardicDieRoll >= 1,
      facts.bardicDieRoll <= 12,
    }
    {
      turn: if (admitted) spendReaction(turn) else turn,
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      reducedAmount:
        if (admitted) cuttingWordsRollTotalAfterReduction(facts)
        else nonnegative(facts.originalTotal),
    }
  }

  pure def resolveUncannyDodgeReaction(
    turn: TurnProcedureState,
    facts: UncannyDodgeFacts
  ): UncannyDodgeReductionResult = {
    val admitted = all {
      turn.reactionAvailable,
      facts.attackerSeen,
      facts.hitWithAttackRoll,
    }
    {
      turn: if (admitted) spendReaction(turn) else turn,
      reducedAmount:
        if (admitted) uncannyDodgeDamage(facts)
        else nonnegative(facts.incomingDamage),
    }
  }

  run test_cutting_words_spends_reaction_and_bardic_pool_for_damage_reduction = {
    val result = resolveCuttingWordsDamageReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      {
        trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
        damageRoll: 9,
        bardicDieRoll: 4,
      }
    )
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.pool.usesRemaining == 2),
      assert(result.reducedAmount == 5),
    }
  }

  run test_cutting_words_roll_reduction_can_turn_success_into_failure = {
    val facts = {
      trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
      kind: CuttingWordsAttackRollReduction,
      originalTotal: 17,
      dc: 15,
      bardicDieRoll: 3,
    }
    val result = resolveCuttingWordsRollReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      facts
    )
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.pool.usesRemaining == 2),
      assert(result.reducedAmount == 14),
      assert(cuttingWordsRollTotalAfterReduction(facts) == 14),
      assert(cuttingWordsTurnsSuccessIntoFailure(facts)),
    }
  }

  run test_cutting_words_ability_check_reduction_can_leave_success_intact = {
    val facts = {
      trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
      kind: CuttingWordsAbilityCheckReduction,
      originalTotal: 18,
      dc: 15,
      bardicDieRoll: 2,
    }
    val result = resolveCuttingWordsRollReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      facts
    )
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.pool.usesRemaining == 2),
      assert(result.reducedAmount == 16),
      assert(not(cuttingWordsTurnsSuccessIntoFailure(facts))),
    }
  }

  run test_cutting_words_requires_seen_in_range_trigger_and_prior_success = {
    val unseenDamage = resolveCuttingWordsDamageReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      {
        trigger: { creatureSeen: false, creatureWithinSixtyFeet: true },
        damageRoll: 9,
        bardicDieRoll: 4,
      }
    )
    val outOfRangeDamage = resolveCuttingWordsDamageReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      {
        trigger: { creatureSeen: true, creatureWithinSixtyFeet: false },
        damageRoll: 9,
        bardicDieRoll: 4,
      }
    )
    val failedRoll = resolveCuttingWordsRollReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      {
        trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
        kind: CuttingWordsAbilityCheckReduction,
        originalTotal: 12,
        dc: 15,
        bardicDieRoll: 4,
      }
    )
    all {
      assert(unseenDamage.turn.reactionAvailable),
      assert(unseenDamage.pool.usesRemaining == 3),
      assert(unseenDamage.reducedAmount == 9),
      assert(outOfRangeDamage.turn.reactionAvailable),
      assert(outOfRangeDamage.pool.usesRemaining == 3),
      assert(outOfRangeDamage.reducedAmount == 9),
      assert(failedRoll.turn.reactionAvailable),
      assert(failedRoll.pool.usesRemaining == 3),
      assert(failedRoll.reducedAmount == 12),
    }
  }

  run test_uncanny_dodge_spends_reaction_and_halves_visible_attack_damage = {
    val result = resolveUncannyDodgeReaction(
      initialTurnProcedureState,
      {
        attackerSeen: true,
        hitWithAttackRoll: true,
        incomingDamage: 9,
      }
    )
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.reducedAmount == 4),
    }
  }

  run test_deflect_attacks_zero_damage_redirect_spends_focus_and_deals_failed_save_damage = {
    val reduction = resolveDeflectAttacksReductionReaction(
      initialTurnProcedureState,
      {
        incomingDamage: 8,
        damageIncludesBludgeoningPiercingOrSlashing: true,
        deflectRoll: 5,
        dexterityModifier: 0,
        monkLevel: 3,
      }
    )
    val redirect = resolveDeflectAttacksZeroDamageRedirect(
      { usesRemaining: 3, maximumUses: 3 },
      reduction.reducedAmount,
      {
        target: {
          targetSeen: true,
          attackWasMelee: true,
          targetWithinFiveFeet: true,
          targetWithinSixtyFeet: false,
          targetBehindTotalCover: true,
        },
        savingThrowSucceeded: false,
        firstMartialArtsRoll: 5,
        secondMartialArtsRoll: 5,
        dexterityModifier: 0,
      }
    )
    all {
      assert(not(reduction.turn.reactionAvailable)),
      assert(reduction.reducedAmount == 0),
      assert(redirect.pool.usesRemaining == 2),
      assert(redirect.redirectedDamage == 10),
    }
  }

  run test_deflect_attacks_ranged_redirect_requires_no_total_cover = {
    val blocked = resolveDeflectAttacksZeroDamageRedirect(
      { usesRemaining: 3, maximumUses: 3 },
      0,
      {
        target: {
          targetSeen: true,
          attackWasMelee: false,
          targetWithinFiveFeet: false,
          targetWithinSixtyFeet: true,
          targetBehindTotalCover: true,
        },
        savingThrowSucceeded: false,
        firstMartialArtsRoll: 5,
        secondMartialArtsRoll: 5,
        dexterityModifier: 0,
      }
    )
    all {
      assert(blocked.pool.usesRemaining == 3),
      assert(blocked.redirectedDamage == 0),
    }
  }

  run test_defense_adds_armor_class_while_wearing_armor = {
    val light = defenseArmorClass(16, {
      wearingLightArmor: true,
      wearingMediumArmor: false,
      wearingHeavyArmor: false,
    })
    val medium = defenseArmorClass(16, {
      wearingLightArmor: false,
      wearingMediumArmor: true,
      wearingHeavyArmor: false,
    })
    val heavy = defenseArmorClass(16, {
      wearingLightArmor: false,
      wearingMediumArmor: false,
      wearingHeavyArmor: true,
    })
    val unarmored = defenseArmorClass(16, {
      wearingLightArmor: false,
      wearingMediumArmor: false,
      wearingHeavyArmor: false,
    })
    all {
      assert(light == 17),
      assert(medium == 17),
      assert(heavy == 17),
      assert(unarmored == 16),
    }
  }

  run test_fast_movement_adds_ten_to_speed_budget_and_dash_when_not_wearing_heavy_armor = {
    val facts = {
      baseSpeedFeet: 30,
      gate: NotWearingHeavyArmorSpeedBonusGate,
      armorWorn: NoArmorWorn,
      wieldingShield: false,
      movementSpentFeet: 5,
    }
    val budget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, facts)
    val dashed = resolvePassiveSpeedBonusDash(initialTurnProcedureState, facts)
    all {
      assert(budget.effectiveSpeedFeet == 40),
      assert(budget.movementRemainingFeet == 35),
      assert(dashed.effectiveSpeedFeet == 40),
      assert(dashed.dashMovementBonusFeet == 40),
      assert(dashed.movementRemainingFeet == 75),
    }
  }

  run test_fast_movement_does_not_add_speed_when_wearing_heavy_armor = {
    val facts = {
      baseSpeedFeet: 30,
      gate: NotWearingHeavyArmorSpeedBonusGate,
      armorWorn: HeavyArmorWorn,
      wieldingShield: false,
      movementSpentFeet: 5,
    }
    val budget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, facts)
    val dashed = resolvePassiveSpeedBonusDash(initialTurnProcedureState, facts)
    all {
      assert(budget.effectiveSpeedFeet == 30),
      assert(budget.movementRemainingFeet == 25),
      assert(dashed.dashMovementBonusFeet == 30),
      assert(dashed.movementRemainingFeet == 55),
    }
  }

  run test_unarmored_movement_adds_ten_only_when_unarmored_and_unshielded = {
    val eligible = {
      baseSpeedFeet: 30,
      gate: UnarmoredUnshieldedSpeedBonusGate,
      armorWorn: NoArmorWorn,
      wieldingShield: false,
      movementSpentFeet: 5,
    }
    val lightArmor = eligible.with("armorWorn", LightArmorWorn)
    val mediumArmor = eligible.with("armorWorn", MediumArmorWorn)
    val heavyArmor = eligible.with("armorWorn", HeavyArmorWorn)
    val shield = eligible.with("wieldingShield", true)
    val eligibleBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, eligible)
    val lightArmorBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, lightArmor)
    val mediumArmorBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, mediumArmor)
    val heavyArmorBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, heavyArmor)
    val shieldBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, shield)
    all {
      assert(eligibleBudget.effectiveSpeedFeet == 40),
      assert(eligibleBudget.movementRemainingFeet == 35),
      assert(lightArmorBudget.effectiveSpeedFeet == 30),
      assert(lightArmorBudget.movementRemainingFeet == 25),
      assert(mediumArmorBudget.effectiveSpeedFeet == 30),
      assert(mediumArmorBudget.movementRemainingFeet == 25),
      assert(heavyArmorBudget.effectiveSpeedFeet == 30),
      assert(heavyArmorBudget.movementRemainingFeet == 25),
      assert(shieldBudget.effectiveSpeedFeet == 30),
      assert(shieldBudget.movementRemainingFeet == 25),
    }
  }

  run test_roving_grants_walk_climb_and_swim_equal_effective_speed = {
    val facts = {
      baseSpeedFeet: 30,
      wearingHeavyArmor: false,
      movementSpentFeet: 5,
      chosenSpeedKind: ClimbSpeedKind,
    }
    val budget = resolveRovingSpeedKindBudget(initialTurnProcedureState, facts)
    val dashed =
      resolveRovingSpeedKindDash(initialTurnProcedureState, facts.with("chosenSpeedKind", SwimSpeedKind))
    all {
      assert(budget.walkSpeedFeet == 40),
      assert(budget.climbSpeedFeet == 40),
      assert(budget.swimSpeedFeet == 40),
      assert(budget.movementRemainingFeet == 35),
      assert(dashed.chosenSpeedKind == SwimSpeedKind),
      assert(dashed.dashMovementBonusFeet == 40),
      assert(dashed.movementRemainingFeet == 75),
    }
  }

  run test_roving_heavy_armor_removes_speed_increase_but_keeps_special_speeds_equal = {
    val facts = {
      baseSpeedFeet: 30,
      wearingHeavyArmor: true,
      movementSpentFeet: 10,
      chosenSpeedKind: SwimSpeedKind,
    }
    val budget = resolveRovingSpeedKindBudget(initialTurnProcedureState, facts)
    all {
      assert(budget.walkSpeedFeet == 30),
      assert(budget.climbSpeedFeet == 30),
      assert(budget.swimSpeedFeet == 30),
      assert(budget.movementRemainingFeet == 20),
    }
  }

  run test_martial_arts_projects_dexterity_die_scaling_and_grapple_shove_dc = {
    val unarmed = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
      monkLevel: 1,
      strengthModifier: 1,
      dexterityModifier: 3,
      normalDamageDice: 0,
      normalDamageDieSize: 1,
      proficiencyBonus: 2,
    })
    val monkWeapon = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsMonkWeapon,
      },
      monkLevel: 17,
      strengthModifier: 1,
      dexterityModifier: 3,
      normalDamageDice: 1,
      normalDamageDieSize: 4,
      proficiencyBonus: 2,
    })
    all {
      assert(unarmed.attackAbilityModifier == 3),
      assert(unarmed.damageAbilityModifier == 3),
      assert(unarmed.damageDice == 1),
      assert(unarmed.damageDieSize == 6),
      assert(unarmed.unarmedStrikeSaveDc == 13),
      assert(monkWeapon.damageDice == 1),
      assert(monkWeapon.damageDieSize == 12),
      assert(monkWeapon.unarmedStrikeSaveDc == 13),
    }
  }

  run test_martial_arts_rejects_armor_shield_and_non_monk_weapons = {
    val armored = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: false,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
      monkLevel: 17,
      strengthModifier: 2,
      dexterityModifier: 4,
      normalDamageDice: 0,
      normalDamageDieSize: 1,
      proficiencyBonus: 2,
    })
    val shielded = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: true,
        attackForm: MartialArtsMonkWeapon,
      },
      monkLevel: 17,
      strengthModifier: 2,
      dexterityModifier: 4,
      normalDamageDice: 1,
      normalDamageDieSize: 4,
      proficiencyBonus: 2,
    })
    val otherWeapon = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsOtherWeapon,
      },
      monkLevel: 17,
      strengthModifier: 2,
      dexterityModifier: 4,
      normalDamageDice: 1,
      normalDamageDieSize: 4,
      proficiencyBonus: 2,
    })
    all {
      assert(not(armored.eligible)),
      assert(armored.attackAbilityModifier == 2),
      assert(armored.damageDieSize == 1),
      assert(not(shielded.eligible)),
      assert(shielded.damageDieSize == 4),
      assert(not(otherWeapon.eligible)),
      assert(otherWeapon.attackAbilityModifier == 2),
    }
  }

  run test_martial_arts_bonus_unarmed_strike_spends_bonus_action_without_attack_prerequisite = {
    val result = resolveMartialArtsBonusUnarmedStrike(
      initialTurnProcedureState,
      {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
    )
    val noBonusAction = resolveMartialArtsBonusUnarmedStrike(
      initialTurnProcedureState.with("bonusActionAvailable", false),
      {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
    )
    all {
      assert(result.admitted),
      assert(not(result.turn.bonusActionAvailable)),
      assert(not(noBonusAction.admitted)),
    }
  }

}
