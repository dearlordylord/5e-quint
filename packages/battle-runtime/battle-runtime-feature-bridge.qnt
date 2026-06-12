// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.innate-sorcery-activation unit-feature.passive-ability-check-roll-mode unit-feature.passive-saving-throw-roll-mode

module battleRuntimeFeatureBridge {
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"
  import unitFeaturePoolCostCore.* from "../shared-algebras/proofs/rule-core/unit-feature-pool-cost-core"
  import unitFeatureActionCountCore.* from "../shared-algebras/proofs/rule-core/unit-feature-action-count-core"
  import unitFeatureRageRecklessCore.* from "../shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core"
  import unitFeatureAttackRiderCore.* from "../shared-algebras/proofs/rule-core/unit-feature-attack-rider-core"
  import unitFeatureSaveDamageCore.* from "../shared-algebras/proofs/rule-core/unit-feature-save-damage-core"
  import unitFeatureReactionReductionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core"
  import unitFeatureMartialArtsCore.* from "../shared-algebras/proofs/rule-core/unit-feature-martial-arts-core"
  import battleRuntimeFeatureTurnEndEffects.* from "./battle-runtime-feature-turn-end-effects"

  type BattleRuntimeRageResistanceProjection = {
    bludgeoning: bool,
    piercing: bool,
    slashing: bool,
  }

  pure def battleRuntimeRageState(active: bool): RageState = {
    turn: initialTurnProcedureState,
    pool: { usesRemaining: if (active) 1 else 0, maximumUses: 1 },
    occurrence: if (active) RageUntilEndOfNextTurn else NoRageOccurrence,
    concentration: {
      interruptedActor: NoConcentration,
      reactor: NoConcentration,
    },
  }

  pure def battleRuntimeActivateInnateSorcery(
    bonusActionAvailable: bool,
    usesRemaining: int,
    active: bool,
  ): InnateSorceryState =
    activateInnateSorcery({
      turn: initialTurnProcedureState.with("bonusActionAvailable", bonusActionAvailable),
      pool: { usesRemaining: usesRemaining, maximumUses: 2 },
      occurrence: if (active) InnateSorceryOneMinuteDuration else NoInnateSorceryOccurrence,
    })

  pure def battleRuntimeRageDamageBonus(barbarianLevel: int): int =
    rageDamageBonus(barbarianLevel)

  pure def battleRuntimeChampionCriticalThreshold(improvedCriticalRange: bool): int =
    attackCriticalThreshold(
      if (improvedCriticalRange)
        ChampionImprovedCriticalThresholdProfile({ attackForm: ChampionWeaponAttack })
      else
        StandardAttackCriticalThresholdProfile
    )

  pure def battleRuntimeExtraAttackSlotsAfterAttackAction(
    actionAvailable: bool,
    additionalAttacks: AttackActionAdditionalAttacks
  ): AttackActionAdditionalAttacks = {
    val result = takeAttackActionWithAttackCountScaling(
      battleRuntimeAttackCountState(actionAvailable, NoAdditionalAttacks),
      { additionalAttacks: additionalAttacks },
    )
    result.state.additionalAttacksRemaining
  }

  pure def battleRuntimeExtraAttackSlotsAfterExtraAttack(
    extraAttackSlotsRemaining: AttackActionAdditionalAttacks
  ): AttackActionAdditionalAttacks = {
    val result = resolveExtraAttackSlot(battleRuntimeAttackCountState(false, extraAttackSlotsRemaining))
    result.state.additionalAttacksRemaining
  }

  pure def battleRuntimeRagePreventsSpellcasting(active: bool): bool =
    ragePreventsConcentrationOrSpellcasting(battleRuntimeRageState(active))

  pure def battleRuntimeRageGrantsResistance(
    active: bool,
    damageType: RageResistanceDamageType
  ): bool =
    active and rageGrantsResistance(damageType)

  pure def battleRuntimeRageGrantsBludgeoningResistance(active: bool): bool =
    battleRuntimeRageGrantsResistance(active, RageBludgeoningDamage)

  pure def battleRuntimeRageGrantsPiercingResistance(active: bool): bool =
    battleRuntimeRageGrantsResistance(active, RagePiercingDamage)

  pure def battleRuntimeRageGrantsSlashingResistance(active: bool): bool =
    battleRuntimeRageGrantsResistance(active, RageSlashingDamage)

  pure def battleRuntimeRageResistanceProjection(active: bool): BattleRuntimeRageResistanceProjection = {
    bludgeoning: battleRuntimeRageGrantsBludgeoningResistance(active),
    piercing: battleRuntimeRageGrantsPiercingResistance(active),
    slashing: battleRuntimeRageGrantsSlashingResistance(active),
  }

  pure def battleRuntimeRecklessAttackState(active: bool, attackRollMadeThisTurn: bool): RecklessAttackState = {
    occurrence: if (active) RecklessAttackUntilStartOfTurn else NoRecklessAttackOccurrence,
    attackRollMadeThisTurn: attackRollMadeThisTurn,
  }

  pure def battleRuntimeRecklessAttackActivates(
    active: bool,
    attackRollMadeThisTurn: bool,
    choosesRecklessAttack: bool,
    strengthAttackRoll: bool
  ): bool = {
    val before = battleRuntimeRecklessAttackState(active, attackRollMadeThisTurn)
    val after = activateRecklessAttackOnFirstAttackRoll(
      before,
      {
        choosesRecklessAttack: choosesRecklessAttack,
        strengthAttackRoll: strengthAttackRoll,
      },
    )
    before.occurrence == NoRecklessAttackOccurrence and after.occurrence == RecklessAttackUntilStartOfTurn
  }

  pure def battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(active: bool): bool =
    recklessAttackGrantsIncomingAttackAdvantage(battleRuntimeRecklessAttackState(active, true))

  pure def battleRuntimeFrenzyDamageDice(
    rageActive: bool,
    recklessAttackUsedWhileRagingThisTurn: bool,
    hitWithAttackRoll: bool,
    strengthBasedAttack: bool,
    attackForm: RageAttackForm,
    usedThisTurn: bool,
    barbarianLevel: int
  ): int = {
    val state = initialFrenzyState(
      battleRuntimeRageState(rageActive),
      battleRuntimeRecklessAttackState(recklessAttackUsedWhileRagingThisTurn, true),
      recklessAttackUsedWhileRagingThisTurn
    ).with("firstEligibleHitResolvedThisTurn", usedThisTurn)
    resolveFrenzy(state, {
      hitWithAttackRoll: hitWithAttackRoll,
      strengthBasedAttack: strengthBasedAttack,
      attackForm: attackForm,
      barbarianLevel: barbarianLevel,
      attackDamageType: BludgeoningDamage,
    }).damageDice
  }

  pure def battleRuntimePassiveSavingThrowRollMode(
    profile: PassiveSavingThrowRollModeProfile,
    ability: SavingThrowAbilityFact,
    condition: SavingThrowConditionFact,
    incapacitated: bool
  ): PassiveSavingThrowRollMode =
    passiveSavingThrowRollMode({
      profile: profile,
      savingThrowAbility: ability,
      savingThrowCondition: condition,
      incapacitated: incapacitated,
    })

  pure def battleRuntimePassiveAbilityCheckRollMode(
    profile: PassiveAbilityCheckRollModeProfile,
    conditionEnd: AbilityCheckConditionEndFact,
  ): PassiveAbilityCheckRollMode =
    passiveAbilityCheckRollMode({
      profile: profile,
      abilityCheckConditionEnd: conditionEnd,
    })

  pure def battleRuntimeCuttingWordsRollTotal(originalTotal: int, bardicDieRoll: int): int =
    cuttingWordsRollTotalAfterReduction({
      trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
      kind: CuttingWordsAttackRollReduction,
      originalTotal: originalTotal,
      dc: 0,
      bardicDieRoll: bardicDieRoll,
    })

  pure def battleRuntimeCuttingWordsAbilityCheckAdmitted(
    originalTotal: int,
    dc: int,
    bardicDieRoll: int,
    creatureSeen: bool,
    creatureWithinSixtyFeet: bool,
    reactionAvailable: bool,
    usesRemaining: int
  ): bool =
    resolveCuttingWordsRollReaction(
      initialTurnProcedureState.with("reactionAvailable", reactionAvailable),
      { usesRemaining: usesRemaining, maximumUses: if (usesRemaining > 0) usesRemaining else 0 },
      {
        trigger: {
          creatureSeen: creatureSeen,
          creatureWithinSixtyFeet: creatureWithinSixtyFeet,
        },
        kind: CuttingWordsAbilityCheckReduction,
        originalTotal: originalTotal,
        dc: dc,
        bardicDieRoll: bardicDieRoll,
      },
    ).pool.usesRemaining < usesRemaining

  pure def battleRuntimeUncannyDodgeDamage(damage: int): int =
    resolveUncannyDodgeReaction(
      initialTurnProcedureState,
      {
        attackerSeen: true,
        hitWithAttackRoll: true,
        incomingDamage: damage,
      },
    ).reducedAmount

  pure def battleRuntimeDeflectAttacksDamage(
    damage: int,
    deflectRoll: int,
    dexterityModifier: int,
    monkLevel: int
  ): int =
    deflectAttacksDamageAfterReduction({
      incomingDamage: damage,
      damageIncludesBludgeoningPiercingOrSlashing: true,
      deflectRoll: deflectRoll,
      dexterityModifier: dexterityModifier,
      monkLevel: monkLevel,
    })

  pure def battleRuntimeDeflectAttacksRedirectTargetEligible(
    targetSeen: bool,
    attackWasMelee: bool,
    targetWithinFiveFeet: bool,
    targetWithinSixtyFeet: bool,
    targetBehindTotalCover: bool
  ): bool =
    deflectAttacksRedirectTargetEligible({
      targetSeen: targetSeen,
      attackWasMelee: attackWasMelee,
      targetWithinFiveFeet: targetWithinFiveFeet,
      targetWithinSixtyFeet: targetWithinSixtyFeet,
      targetBehindTotalCover: targetBehindTotalCover,
    })

  pure def battleRuntimeDeflectAttacksRedirectDamage(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool,
    savingThrowSucceeded: bool,
    firstMartialArtsRoll: int,
    secondMartialArtsRoll: int,
    dexterityModifier: int
  ): int =
    resolveDeflectAttacksZeroDamageRedirect(
      { usesRemaining: focusUsesRemaining, maximumUses: if (focusUsesRemaining > 0) focusUsesRemaining else 0 },
      reducedDamage,
      {
        target: {
          targetSeen: targetEligible,
          attackWasMelee: true,
          targetWithinFiveFeet: true,
          targetWithinSixtyFeet: true,
          targetBehindTotalCover: false,
        },
        savingThrowSucceeded: savingThrowSucceeded,
        firstMartialArtsRoll: firstMartialArtsRoll,
        secondMartialArtsRoll: secondMartialArtsRoll,
        dexterityModifier: dexterityModifier,
      },
    ).redirectedDamage

  pure def battleRuntimeDeflectAttacksRedirectFocusRemaining(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool
  ): int =
    resolveDeflectAttacksZeroDamageRedirect(
      { usesRemaining: focusUsesRemaining, maximumUses: if (focusUsesRemaining > 0) focusUsesRemaining else 0 },
      reducedDamage,
      {
        target: {
          targetSeen: targetEligible,
          attackWasMelee: true,
          targetWithinFiveFeet: true,
          targetWithinSixtyFeet: true,
          targetBehindTotalCover: false,
        },
        savingThrowSucceeded: false,
        firstMartialArtsRoll: 1,
        secondMartialArtsRoll: 1,
        dexterityModifier: 0,
      },
    ).pool.usesRemaining

  pure def battleRuntimeMartialArtsAttackProjection(
    unarmored: bool,
    wieldingShield: bool,
    attackForm: MartialArtsAttackForm,
    monkLevel: int,
    strengthModifier: int,
    dexterityModifier: int,
    normalDamageDice: int,
    normalDamageDieSize: int,
    proficiencyBonus: int
  ): MartialArtsAttackProjectionResult =
    resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: unarmored,
        wieldingShield: wieldingShield,
        attackForm: attackForm,
      },
      monkLevel: monkLevel,
      strengthModifier: strengthModifier,
      dexterityModifier: dexterityModifier,
      normalDamageDice: normalDamageDice,
      normalDamageDieSize: normalDamageDieSize,
      proficiencyBonus: proficiencyBonus,
    })

  pure def battleRuntimeMartialArtsBonusUnarmedStrikeAdmitted(
    bonusActionAvailable: bool,
    unarmored: bool,
    wieldingShield: bool,
    attackForm: MartialArtsAttackForm
  ): bool =
    resolveMartialArtsBonusUnarmedStrike(
      initialTurnProcedureState.with("bonusActionAvailable", bonusActionAvailable),
      {
        unarmored: unarmored,
        wieldingShield: wieldingShield,
        attackForm: attackForm,
      },
    ).admitted
}
