// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.innate-sorcery-activation unit-feature.passive-saving-throw-roll-mode

module battleRuntimeFeatureBridge {
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"
  import unitFeatureProcedureProfiles.* from "../shared-algebras/proofs/rule-core/unit-feature-procedure-profiles"

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

  pure def battleRuntimeAttackCountState(
    actionAvailable: bool,
    extraAttackSlotsRemaining: int
  ): AttackActionAttackCountState = {
    actionAvailable: actionAvailable,
    extraAttackSlotOpen: extraAttackSlotsRemaining > 0,
    attacksResolved: 0,
    movementSegmentsTaken: 0,
    turnEnded: false,
  }

  pure def battleRuntimeExtraAttackSlotsAfterAttackAction(
    actionAvailable: bool,
    extraAttackSupported: bool
  ): int = {
    val result = takeAttackActionWithAttackCountScaling(
      battleRuntimeAttackCountState(actionAvailable, 0),
      { additionalAttacks: if (extraAttackSupported) 1 else 0 },
    )
    if (result.state.extraAttackSlotOpen) 1 else 0
  }

  pure def battleRuntimeExtraAttackSlotsAfterExtraAttack(
    extraAttackSlotsRemaining: int
  ): int = {
    val result = resolveExtraAttackSlot(battleRuntimeAttackCountState(false, extraAttackSlotsRemaining))
    if (result.state.extraAttackSlotOpen) 1 else 0
  }

  pure def battleRuntimeExtraAttackSlotsAfterEndTurn(
    extraAttackSlotsRemaining: int
  ): int = {
    val ended = endTurnDuringAttackActionAttackCount(battleRuntimeAttackCountState(false, extraAttackSlotsRemaining))
    if (ended.extraAttackSlotOpen) 1 else 0
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

  pure def battleRuntimePassiveSavingThrowRollMode(
    ability: SavingThrowAbilityFact,
    incapacitated: bool
  ): PassiveSavingThrowRollMode =
    passiveSavingThrowRollMode({
      savingThrowAbility: ability,
      incapacitated: incapacitated,
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

  run test_rage_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimeRageDamageBonus(1) == 2),
      assert(battleRuntimeRageDamageBonus(9) == 3),
      assert(battleRuntimeRageDamageBonus(16) == 4),
      assert(battleRuntimeChampionCriticalThreshold(false) == 20),
      assert(battleRuntimeChampionCriticalThreshold(true) == 19),
      assert(battleRuntimeExtraAttackSlotsAfterAttackAction(true, true) == 1),
      assert(battleRuntimeExtraAttackSlotsAfterAttackAction(true, false) == 0),
      assert(battleRuntimeExtraAttackSlotsAfterExtraAttack(1) == 0),
      assert(battleRuntimeExtraAttackSlotsAfterEndTurn(1) == 0),
      assert(battleRuntimeRagePreventsSpellcasting(true)),
      assert(not(battleRuntimeRagePreventsSpellcasting(false))),
      assert(battleRuntimeRageGrantsResistance(true, RageBludgeoningDamage)),
      assert(not(battleRuntimeRageGrantsResistance(true, RageOtherDamage))),
    }
  }

  run test_reckless_attack_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimeRecklessAttackActivates(false, false, true, true)),
      assert(not(battleRuntimeRecklessAttackActivates(true, false, true, true))),
      assert(not(battleRuntimeRecklessAttackActivates(false, true, true, true))),
      assert(battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(true)),
      assert(not(battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(false))),
    }
  }

  run test_passive_saving_throw_roll_mode_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimePassiveSavingThrowRollMode(DexteritySavingThrowFact, false) == AdvantageSavingThrowMode),
      assert(battleRuntimePassiveSavingThrowRollMode(DexteritySavingThrowFact, true) == NormalSavingThrowMode),
      assert(battleRuntimePassiveSavingThrowRollMode(ConstitutionSavingThrowFact, false) == NormalSavingThrowMode),
    }
  }

  run test_innate_sorcery_runtime_projection_uses_feature_profile = {
    val active = battleRuntimeActivateInnateSorcery(true, 2, false)
    val exhausted = battleRuntimeActivateInnateSorcery(true, 0, false)
    val noBonusAction = battleRuntimeActivateInnateSorcery(false, 2, false)
    all {
      assert(active.occurrence == InnateSorceryOneMinuteDuration),
      assert(active.pool.usesRemaining == 1),
      assert(not(active.turn.bonusActionAvailable)),
      assert(exhausted.occurrence == NoInnateSorceryOccurrence),
      assert(noBonusAction.occurrence == NoInnateSorceryOccurrence),
    }
  }

  run test_reaction_modifier_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimeCuttingWordsRollTotal(12, 3) == 9),
      assert(battleRuntimeCuttingWordsAbilityCheckAdmitted(15, 14, 3, true, true, true, 1)),
      assert(battleRuntimeUncannyDodgeDamage(9) == 4),
      assert(battleRuntimeDeflectAttacksDamage(8, 2, 3, 3) == 0),
      assert(battleRuntimeDeflectAttacksRedirectTargetEligible(true, true, true, false, true)),
      assert(not(battleRuntimeDeflectAttacksRedirectTargetEligible(true, false, false, true, true))),
      assert(battleRuntimeDeflectAttacksRedirectDamage(0, 3, true, false, 5, 5, 0) == 10),
      assert(battleRuntimeDeflectAttacksRedirectFocusRemaining(0, 3, true) == 2),
    }
  }

  run test_martial_arts_runtime_projection_uses_feature_profile = {
    val unarmed = battleRuntimeMartialArtsAttackProjection(
      true,
      false,
      MartialArtsUnarmedStrike,
      1,
      1,
      3,
      0,
      1,
      2
    )
    val shielded = battleRuntimeMartialArtsAttackProjection(
      true,
      true,
      MartialArtsMonkWeapon,
      17,
      1,
      3,
      1,
      4,
      2
    )
    val highLevelMonkWeapon = battleRuntimeMartialArtsAttackProjection(
      true,
      false,
      MartialArtsMonkWeapon,
      17,
      1,
      3,
      1,
      4,
      6
    )
    all {
      assert(unarmed.eligible),
      assert(unarmed.attackAbilityModifier == 3),
      assert(unarmed.damageDieSize == 6),
      assert(unarmed.unarmedStrikeSaveDc == 13),
      assert(highLevelMonkWeapon.eligible),
      assert(highLevelMonkWeapon.damageDieSize == 12),
      assert(highLevelMonkWeapon.unarmedStrikeSaveDc == 17),
      assert(not(shielded.eligible)),
      assert(shielded.attackAbilityModifier == 1),
      assert(shielded.damageDieSize == 4),
      assert(battleRuntimeMartialArtsBonusUnarmedStrikeAdmitted(true, true, false, MartialArtsUnarmedStrike)),
      assert(not(battleRuntimeMartialArtsBonusUnarmedStrikeAdmitted(false, true, false, MartialArtsUnarmedStrike))),
      assert(not(battleRuntimeMartialArtsBonusUnarmedStrikeAdmitted(true, true, true, MartialArtsUnarmedStrike))),
      assert(not(battleRuntimeMartialArtsBonusUnarmedStrikeAdmitted(true, true, false, MartialArtsOtherWeapon))),
    }
  }
}
