// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.alternate-action-cost unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.innate-sorcery-activation unit-feature.martial-arts-attack-projection unit-feature.passive-armor-class-bonus unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-saving-throw-roll-mode unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-critical-range-19 unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement

module unitFeatureProcedureProfiles {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"

  // RAW anchors:
  // - Classes/Fighter.md: Second Wind, Action Surge, Champion Improved Critical.
  // - Classes/Rogue.md: Cunning Action, Sneak Attack, Evasion, Uncanny Dodge.
  // - Classes/Barbarian.md: Rage, Reckless Attack, Danger Sense.
  // - Classes/Bard.md: Bardic Inspiration and College of Lore Cutting Words.
  // - Classes/Sorcerer.md: Innate Sorcery activation.
  // - Classes/Monk.md: Martial Arts attack projection, Unarmored Movement,
  //   Deflect Attacks.
  // - Feats.md: Archery, Defense, Savage Attacker, Boon of Combat Prowess.
  // - Character-Origins.md: Orc Adrenaline Rush and Relentless Endurance.
  // - Playing-the-Game.md: Bonus Actions, Reactions, Attack Rolls, Critical Hits,
  //   Damage Rolls, Dropping to 0 Hit Points, Instant Death, Saving Throws and
  //   Damage, Resistance and Vulnerability.

  type FeatureUsePool = {
    usesRemaining: int,
    maximumUses: int,
  }

  type InnateSorceryOccurrence =
    | NoInnateSorceryOccurrence
    | InnateSorceryOneMinuteDuration

  type InnateSorceryState = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    occurrence: InnateSorceryOccurrence,
  }

  type ActionSurgeActionGrant =
    | NoActionSurgeActionGrant
    | ActionSurgeActionAvailable
    | ActionSurgeActionSpent

  type ActionSurgeState = {
    pool: FeatureUsePool,
    actionGrant: ActionSurgeActionGrant,
  }

  type ActionSurgeActionResult = {
    actionSurge: ActionSurgeState,
    actionWasTaken: bool,
  }

  type SecondWindFacts = {
    healingRoll: int,
    fighterLevel: int,
  }

  type SecondWindResult = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    recovery: HitPointRecoveryResult,
  }

  type FailedAbilityCheckResourceBoostFacts = {
    originalTotal: int,
    dc: int,
    boostRoll: int,
  }

  type FailedAbilityCheckResourceBoostResult = {
    pool: FeatureUsePool,
    originalSucceeded: bool,
    boostedTotal: int,
    boostedSucceeded: bool,
  }

  type CunningActionChoice =
    | CunningDash
    | CunningDisengage
    | CunningHide

  type CunningActionFacts = {
    choice: CunningActionChoice,
    speedFeet: int,
    hideFacts: HideProcedureFacts,
  }

  type RageResistanceDamageType =
    | RageBludgeoningDamage
    | RagePiercingDamage
    | RageSlashingDamage
    | RageOtherDamage

  type RageOccurrence =
    | NoRageOccurrence
    | RageUntilEndOfNextTurn
    | PersistentRageTenMinuteDuration

  type RageState = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    occurrence: RageOccurrence,
    concentration: ActorConcentrationState,
  }

  type RageActivationFacts = {
    wearingHeavyArmor: bool,
    incapacitated: bool,
    persistentRage: bool,
  }

  type RageExtensionFacts = {
    madeAttackRollAgainstEnemy: bool,
    forcedEnemySavingThrow: bool,
    spendsBonusAction: bool,
    incapacitated: bool,
    unconscious: bool,
    wearingHeavyArmor: bool,
  }

  type RageAttackForm =
    | RageWeaponAttack
    | RageUnarmedStrikeAttack
    | RageSpellAttack

  type ChampionImprovedCriticalAttackForm =
    | ChampionWeaponAttack
    | ChampionUnarmedStrikeAttack

  type AttackCriticalThresholdProfile =
    | StandardAttackCriticalThresholdProfile
    | ChampionImprovedCriticalThresholdProfile({
      attackForm: ChampionImprovedCriticalAttackForm,
    })

  type RageAttackFacts = {
    usesStrength: bool,
    dealsDamage: bool,
    attackForm: RageAttackForm,
  }

  type RecklessAttackOccurrence =
    | NoRecklessAttackOccurrence
    | RecklessAttackUntilStartOfTurn

  type RecklessAttackState = {
    occurrence: RecklessAttackOccurrence,
    attackRollMadeThisTurn: bool,
  }

  type RecklessAttackFacts = {
    choosesRecklessAttack: bool,
    strengthAttackRoll: bool,
  }

  type RecklessAttackAdvantageFacts = {
    strengthAttackRoll: bool,
  }

  type WeaponProcedureKind =
    | FinesseWeapon
    | RangedWeapon
    | OtherWeapon

  type SneakAttackFacts = {
    hitWithAttackRoll: bool,
    weaponKind: WeaponProcedureKind,
    hasAdvantage: bool,
    hasDisadvantage: bool,
    allyWithinFiveFeet: bool,
    allyIncapacitated: bool,
    usedThisTurn: bool,
    rogueLevel: int,
    weaponDamageType: RuleDamageType,
  }

  type SneakAttackResult = {
    admitted: bool,
    usedThisTurn: bool,
    damageDice: int,
    damageType: RuleDamageType,
  }

  type SavingThrowAbilityFact =
    | StrengthSavingThrowFact
    | DexteritySavingThrowFact
    | ConstitutionSavingThrowFact

  type PassiveSavingThrowRollMode =
    | NormalSavingThrowMode
    | AdvantageSavingThrowMode

  type PassiveSavingThrowRollModeFacts = {
    savingThrowAbility: SavingThrowAbilityFact,
    incapacitated: bool,
  }

  type SaveDamageReplacementFacts = {
    savingThrowAbility: SavingThrowAbilityFact,
    normalSuccessTakesHalfDamage: bool,
    savingThrowSucceeded: bool,
    incapacitated: bool,
  }

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

  type PassiveRangedAttackRollBonusFacts = {
    weaponKind: WeaponProcedureKind,
    baseAttackRollTotal: int,
    targetArmorClass: int,
    naturalD20: int,
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

  type BonusActionDashTemporaryHitPointsFacts = {
    speedFeet: int,
    proficiencyBonus: int,
    existingTemporaryHitPoints: int,
    chooseNewTemporaryHitPoints: bool,
  }

  type BonusActionDashTemporaryHitPointsResult = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    temporaryHitPoints: int,
  }

  type PassiveRangedAttackRollBonusResult = {
    bonus: int,
    effectiveAttackRollTotal: int,
    hits: bool,
  }

  type WeaponDamageDiceRollChoiceFacts = {
    hitWithWeapon: bool,
    criticalHit: bool,
    usedThisTurn: bool,
    choosesFeature: bool,
    weaponDamageDice: int,
    weaponDamageDieSize: int,
    firstCandidateTotal: int,
    secondCandidateTotal: int,
    chooseSecondCandidate: bool,
    damageModifier: int,
  }

  type WeaponDamageDiceRollChoiceResult = {
    admitted: bool,
    usedThisTurn: bool,
    weaponDamageDiceRolledPerCandidate: int,
    selectedWeaponDamageDiceTotal: int,
    effectiveDamage: int,
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

  type AttackRollMissToHitReplacementFacts = {
    naturalD20: int,
    total: int,
    armorClass: int,
    usedSinceTurnStart: bool,
    choosesFeature: bool,
  }

  type AttackRollMissToHitReplacementResult = {
    admitted: bool,
    usedSinceTurnStart: bool,
    ordinaryHits: bool,
    effectiveHits: bool,
    critical: bool,
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

  type AttackActionAttackCountState = {
    actionAvailable: bool,
    extraAttackSlotOpen: bool,
    attacksResolved: int,
    movementSegmentsTaken: int,
    turnEnded: bool,
  }

  type AttackActionAttackCountFacts = {
    additionalAttacks: int,
  }

  type AttackActionAttackCountResult = {
    state: AttackActionAttackCountState,
    actionWasSpent: bool,
    attackWasResolved: bool,
  }

  pure def legalFeatureUsePool(pool: FeatureUsePool): bool = all {
    pool.maximumUses >= 0,
    pool.maximumUses <= 6,
    pool.usesRemaining >= 0,
    pool.usesRemaining <= pool.maximumUses,
  }

  pure def wearingArmorForDefense(facts: PassiveArmorClassBonusFacts): bool =
    facts.wearingLightArmor or facts.wearingMediumArmor or facts.wearingHeavyArmor

  pure def defenseArmorClass(baseArmorClass: int, facts: PassiveArmorClassBonusFacts): int =
    if (wearingArmorForDefense(facts)) baseArmorClass + 1 else baseArmorClass

  pure def archeryAttackRollBonus(facts: PassiveRangedAttackRollBonusFacts): int =
    if (facts.weaponKind == RangedWeapon) 2 else 0

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

  pure def resolveTemporaryHitPointsChoice(
    existingTemporaryHitPoints: int,
    newTemporaryHitPoints: int,
    chooseNewTemporaryHitPoints: bool
  ): int =
    if (chooseNewTemporaryHitPoints) newTemporaryHitPoints
    else existingTemporaryHitPoints

  pure def resolveBonusActionDashTemporaryHitPoints(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    facts: BonusActionDashTemporaryHitPointsFacts
  ): BonusActionDashTemporaryHitPointsResult = {
    val admitted = all {
      legalFeatureUsePool(pool),
      pool.usesRemaining > 0,
      facts.speedFeet >= 0,
      facts.proficiencyBonus >= 2,
      facts.proficiencyBonus <= 6,
      facts.existingTemporaryHitPoints >= 0,
    }
    val dashed =
      if (admitted) resolveDash(turn, facts.speedFeet, BonusActionCost) else turn
    {
      turn: dashed,
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      temporaryHitPoints:
        if (admitted) resolveTemporaryHitPointsChoice(
          facts.existingTemporaryHitPoints,
          facts.proficiencyBonus,
          facts.chooseNewTemporaryHitPoints
        ) else facts.existingTemporaryHitPoints,
    }
  }

  pure def resolveArcheryAttackRoll(
    facts: PassiveRangedAttackRollBonusFacts
  ): PassiveRangedAttackRollBonusResult = {
    val bonus = archeryAttackRollBonus(facts)
    val total = facts.baseAttackRollTotal + bonus
    val outcome = resolveAttackRoll({
      naturalD20: facts.naturalD20,
      total: total,
      armorClass: facts.targetArmorClass,
      criticalThreshold: 20,
    })
    {
      bonus: bonus,
      effectiveAttackRollTotal: total,
      hits: outcome.hits,
    }
  }

  pure def savageAttackerCandidateDiceCount(facts: WeaponDamageDiceRollChoiceFacts): int =
    if (facts.criticalHit) facts.weaponDamageDice * 2 else facts.weaponDamageDice

  pure def legalWeaponDamageDiceRollChoiceFacts(
    facts: WeaponDamageDiceRollChoiceFacts
  ): bool = all {
    facts.weaponDamageDice >= 1,
    facts.weaponDamageDice <= 4,
    facts.weaponDamageDieSize >= 4,
    facts.weaponDamageDieSize <= 12,
    facts.firstCandidateTotal >= savageAttackerCandidateDiceCount(facts),
    facts.secondCandidateTotal >= savageAttackerCandidateDiceCount(facts),
    facts.firstCandidateTotal <= savageAttackerCandidateDiceCount(facts) * facts.weaponDamageDieSize,
    facts.secondCandidateTotal <= savageAttackerCandidateDiceCount(facts) * facts.weaponDamageDieSize,
  }

  pure def resolveWeaponDamageDiceRollChoice(
    facts: WeaponDamageDiceRollChoiceFacts,
    ordinaryWeaponDamageDiceTotal: int
  ): WeaponDamageDiceRollChoiceResult = {
    val admitted = all {
      legalWeaponDamageDiceRollChoiceFacts(facts),
      facts.hitWithWeapon,
      not(facts.usedThisTurn),
      facts.choosesFeature,
    }
    val selectedTotal =
      if (admitted) {
        if (facts.chooseSecondCandidate) facts.secondCandidateTotal
        else facts.firstCandidateTotal
      } else ordinaryWeaponDamageDiceTotal
    {
      admitted: admitted,
      usedThisTurn: facts.usedThisTurn or admitted,
      weaponDamageDiceRolledPerCandidate: savageAttackerCandidateDiceCount(facts),
      selectedWeaponDamageDiceTotal: selectedTotal,
      effectiveDamage: nonnegative(selectedTotal + facts.damageModifier),
    }
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

  pure def resolveAttackRollMissToHitReplacement(
    facts: AttackRollMissToHitReplacementFacts
  ): AttackRollMissToHitReplacementResult = {
    val ordinaryOutcome = resolveAttackRoll({
      naturalD20: facts.naturalD20,
      total: facts.total,
      armorClass: facts.armorClass,
      criticalThreshold: 20,
    })
    val admitted = all {
      legalAttackRollProcedureFacts({
        naturalD20: facts.naturalD20,
        total: facts.total,
        armorClass: facts.armorClass,
        criticalThreshold: 20,
      }),
      not(ordinaryOutcome.hits),
      not(facts.usedSinceTurnStart),
      facts.choosesFeature,
    }
    {
      admitted: admitted,
      usedSinceTurnStart: facts.usedSinceTurnStart or admitted,
      ordinaryHits: ordinaryOutcome.hits,
      effectiveHits: ordinaryOutcome.hits or admitted,
      critical: ordinaryOutcome.critical,
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

  pure def initialAttackActionAttackCountState: AttackActionAttackCountState = {
    actionAvailable: true,
    extraAttackSlotOpen: false,
    attacksResolved: 0,
    movementSegmentsTaken: 0,
    turnEnded: false,
  }

  pure def legalAttackActionAttackCountFacts(
    facts: AttackActionAttackCountFacts
  ): bool = facts.additionalAttacks == 1

  pure def takeAttackActionWithAttackCountScaling(
    state: AttackActionAttackCountState,
    facts: AttackActionAttackCountFacts
  ): AttackActionAttackCountResult = {
    val admitted = all {
      legalAttackActionAttackCountFacts(facts),
      state.actionAvailable,
      not(state.extraAttackSlotOpen),
      not(state.turnEnded),
    }
    {
      state:
        if (admitted) {
          state.with("actionAvailable", false)
            .with("extraAttackSlotOpen", true)
            .with("attacksResolved", state.attacksResolved + 1)
        } else state,
      actionWasSpent: admitted,
      attackWasResolved: admitted,
    }
  }

  pure def resolveExtraAttackSlot(
    state: AttackActionAttackCountState
  ): AttackActionAttackCountResult = {
    val admitted = all {
      state.extraAttackSlotOpen,
      not(state.turnEnded),
    }
    {
      state:
        if (admitted) {
          state.with("extraAttackSlotOpen", false)
            .with("attacksResolved", state.attacksResolved + 1)
        } else state,
      actionWasSpent: false,
      attackWasResolved: admitted,
    }
  }

  pure def moveDuringAttackActionAttackCount(
    state: AttackActionAttackCountState
  ): AttackActionAttackCountState =
    if (state.turnEnded) state
    else state.with("movementSegmentsTaken", state.movementSegmentsTaken + 1)

  pure def endTurnDuringAttackActionAttackCount(
    state: AttackActionAttackCountState
  ): AttackActionAttackCountState =
    state.with("extraAttackSlotOpen", false).with("turnEnded", true)

  pure def spendFeatureUsePool(pool: FeatureUsePool): FeatureUsePool =
    if (pool.usesRemaining <= 0) pool
    else pool.with("usesRemaining", pool.usesRemaining - 1)

  pure def legalInnateSorceryState(state: InnateSorceryState): bool = all {
    legalFeatureUsePool(state.pool),
    state.occurrence.in(Set(NoInnateSorceryOccurrence, InnateSorceryOneMinuteDuration)),
    state.occurrence == NoInnateSorceryOccurrence or state.pool.usesRemaining < state.pool.maximumUses,
  }

  pure def activateInnateSorcery(state: InnateSorceryState): InnateSorceryState = {
    val admitted = all {
      legalInnateSorceryState(state),
      canSpendBonusAction(state.turn),
      state.pool.usesRemaining > 0,
      state.occurrence == NoInnateSorceryOccurrence,
    }
    {
      turn: if (admitted) spendActionCost(state.turn, BonusActionCost) else state.turn,
      pool: if (admitted) spendFeatureUsePool(state.pool) else state.pool,
      occurrence: if (admitted) InnateSorceryOneMinuteDuration else state.occurrence,
    }
  }

  pure def legalActionSurgeState(state: ActionSurgeState): bool = all {
    legalFeatureUsePool(state.pool),
    state.actionGrant.in(Set(
      NoActionSurgeActionGrant,
      ActionSurgeActionAvailable,
      ActionSurgeActionSpent
    )),
    state.actionGrant == NoActionSurgeActionGrant or state.pool.usesRemaining < state.pool.maximumUses,
  }

  pure def initialActionSurgeState(pool: FeatureUsePool): ActionSurgeState = {
    pool: pool,
    actionGrant: NoActionSurgeActionGrant,
  }

  pure def startTurnActionSurge(state: ActionSurgeState): ActionSurgeState =
    state.with("actionGrant", NoActionSurgeActionGrant)

  pure def activateActionSurge(state: ActionSurgeState, onTurn: bool): ActionSurgeState =
    if (not(onTurn) or state.actionGrant != NoActionSurgeActionGrant or state.pool.usesRemaining <= 0) state
    else {
      pool: spendFeatureUsePool(state.pool),
      actionGrant: ActionSurgeActionAvailable,
    }

  pure def actionSurgePermitsAction(requestedAction: StandardAction): bool =
    requestedAction != MagicAction

  pure def spendActionSurgeAction(
    state: ActionSurgeState,
    requestedAction: StandardAction
  ): ActionSurgeActionResult =
    if (state.actionGrant != ActionSurgeActionAvailable or not(actionSurgePermitsAction(requestedAction))) {
      actionSurge: state,
      actionWasTaken: false,
    } else {
      actionSurge: state.with("actionGrant", ActionSurgeActionSpent),
      actionWasTaken: true,
    }

  pure def legalSecondWindFacts(facts: SecondWindFacts): bool = all {
    facts.healingRoll >= 1,
    facts.healingRoll <= 10,
    facts.fighterLevel >= 1,
    facts.fighterLevel <= 20,
  }

  pure def resolveSecondWind(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    vitals: CreatureVitals,
    deathSavingThrows: DeathSavingThrowLifecycle,
    positiveHitPointUnconsciousRecovery: PositiveHitPointUnconsciousRecovery,
    facts: SecondWindFacts
  ): SecondWindResult = {
    val admitted = all {
      legalSecondWindFacts(facts),
      canSpendBonusAction(turn),
      pool.usesRemaining > 0,
    }
    val spentTurn = if (admitted) spendActionCost(turn, BonusActionCost) else turn
    val spentPool = if (admitted) spendFeatureUsePool(pool) else pool
    {
      turn: spentTurn,
      pool: spentPool,
      recovery:
        if (admitted) applyHitPointHealing(
          vitals,
          deathSavingThrows,
          positiveHitPointUnconsciousRecovery,
          facts.healingRoll + facts.fighterLevel
        ) else {
          vitals: vitals,
          deathSavingThrows: deathSavingThrows,
          positiveHitPointUnconsciousRecovery: positiveHitPointUnconsciousRecovery,
          hitPointsRegained: 0,
        },
    }
  }

  pure def legalFailedAbilityCheckResourceBoostFacts(
    facts: FailedAbilityCheckResourceBoostFacts
  ): bool = all {
    facts.boostRoll >= 1,
    facts.boostRoll <= 10,
  }

  pure def resolveFailedAbilityCheckResourceBoost(
    pool: FeatureUsePool,
    facts: FailedAbilityCheckResourceBoostFacts
  ): FailedAbilityCheckResourceBoostResult = {
    val originalSucceeded = facts.originalTotal >= facts.dc
    val boostedTotal = facts.originalTotal + facts.boostRoll
    val boostedSucceeded = boostedTotal >= facts.dc
    val admitted = all {
      legalFeatureUsePool(pool),
      legalFailedAbilityCheckResourceBoostFacts(facts),
      pool.usesRemaining > 0,
      not(originalSucceeded),
    }
    val spend = admitted and boostedSucceeded
    {
      pool: if (spend) spendFeatureUsePool(pool) else pool,
      originalSucceeded: originalSucceeded,
      boostedTotal: boostedTotal,
      boostedSucceeded: boostedSucceeded,
    }
  }

  pure def resolveCunningAction(
    turn: TurnProcedureState,
    facts: CunningActionFacts
  ): TurnProcedureState =
    if (facts.choice == CunningDash) {
      resolveDash(turn, facts.speedFeet, BonusActionCost)
    } else if (facts.choice == CunningDisengage) {
      resolveDisengage(turn, BonusActionCost)
    } else {
      resolveHide(turn, facts.hideFacts, BonusActionCost)
    }

  pure def championImprovedCriticalThreshold: int = 19

  pure def attackCriticalThreshold(profile: AttackCriticalThresholdProfile): int =
    match profile {
      | StandardAttackCriticalThresholdProfile => 20
      | ChampionImprovedCriticalThresholdProfile(v) =>
        match v.attackForm {
          | ChampionWeaponAttack => championImprovedCriticalThreshold
          | ChampionUnarmedStrikeAttack => championImprovedCriticalThreshold
        }
    }

  pure def legalRageActivationFacts(facts: RageActivationFacts): bool = all {
    facts.wearingHeavyArmor.in(Set(true, false)),
    facts.incapacitated.in(Set(true, false)),
    facts.persistentRage.in(Set(true, false)),
  }

  pure def legalRageState(state: RageState): bool = all {
    legalTurnProcedureState(state.turn),
    legalFeatureUsePool(state.pool),
    state.occurrence.in(Set(
      NoRageOccurrence,
      RageUntilEndOfNextTurn,
      PersistentRageTenMinuteDuration
    )),
    state.concentration.interruptedActor.in(Set(NoConcentration, Concentrating)),
    state.concentration.reactor.in(Set(NoConcentration, Concentrating)),
  }

  pure def startRage(state: RageState, facts: RageActivationFacts): RageState = {
    val admitted = all {
      legalRageActivationFacts(facts),
      canSpendBonusAction(state.turn),
      state.pool.usesRemaining > 0,
      state.occurrence == NoRageOccurrence,
      not(facts.wearingHeavyArmor),
      not(facts.incapacitated),
    }
    if (not(admitted)) state
    else {
      turn: spendActionCost(state.turn, BonusActionCost),
      pool: spendFeatureUsePool(state.pool),
      occurrence:
        if (facts.persistentRage) PersistentRageTenMinuteDuration
        else RageUntilEndOfNextTurn,
      concentration: endConcentration(state.concentration, InterruptedActor),
    }
  }

  pure def ragePreventsConcentrationOrSpellcasting(state: RageState): bool =
    state.occurrence != NoRageOccurrence

  pure def rageGrantsResistance(damageType: RageResistanceDamageType): bool =
    damageType == RageBludgeoningDamage
      or damageType == RagePiercingDamage
      or damageType == RageSlashingDamage

  pure def rageDamageBonus(barbarianLevel: int): int =
    if (barbarianLevel >= 16) 4
    else if (barbarianLevel >= 9) 3
    else 2

  pure def rageDamageAdmitted(state: RageState, facts: RageAttackFacts): bool = all {
    state.occurrence != NoRageOccurrence,
    facts.usesStrength,
    facts.dealsDamage,
    facts.attackForm == RageWeaponAttack or facts.attackForm == RageUnarmedStrikeAttack,
  }

  pure def applyRageDamageBonus(
    state: RageState,
    facts: RageAttackFacts,
    barbarianLevel: int,
    damageRoll: int
  ): int =
    if (rageDamageAdmitted(state, facts)) damageRoll + rageDamageBonus(barbarianLevel)
    else damageRoll

  pure def endRageIfBlocked(state: RageState, facts: RageExtensionFacts): RageState =
    if (state.occurrence == NoRageOccurrence) state
    else if (facts.wearingHeavyArmor) state.with("occurrence", NoRageOccurrence)
    else if (state.occurrence == PersistentRageTenMinuteDuration and facts.unconscious) {
      state.with("occurrence", NoRageOccurrence)
    } else if (state.occurrence == RageUntilEndOfNextTurn and facts.incapacitated) {
      state.with("occurrence", NoRageOccurrence)
    } else state

  pure def extendRage(state: RageState, facts: RageExtensionFacts): RageState = {
    val unblocked = endRageIfBlocked(state, facts)
    val extensionTrigger = facts.madeAttackRollAgainstEnemy
      or facts.forcedEnemySavingThrow
      or facts.spendsBonusAction
    val canPayBonusExtension =
      not(facts.spendsBonusAction) or canSpendBonusAction(unblocked.turn)
    if (unblocked.occurrence != RageUntilEndOfNextTurn or not(extensionTrigger) or not(canPayBonusExtension)) {
      unblocked
    } else {
      turn:
        if (facts.spendsBonusAction) spendActionCost(unblocked.turn, BonusActionCost)
        else unblocked.turn,
      pool: unblocked.pool,
      occurrence: RageUntilEndOfNextTurn,
      concentration: unblocked.concentration,
    }
  }

  pure def activateRecklessAttackOnFirstAttackRoll(
    state: RecklessAttackState,
    facts: RecklessAttackFacts
  ): RecklessAttackState =
    if (state.attackRollMadeThisTurn) state
    else {
      occurrence:
        if (facts.choosesRecklessAttack and facts.strengthAttackRoll)
        RecklessAttackUntilStartOfTurn
        else state.occurrence,
      attackRollMadeThisTurn: true,
    }

  pure def startTurnRecklessAttack(state: RecklessAttackState): RecklessAttackState = {
    occurrence: NoRecklessAttackOccurrence,
    attackRollMadeThisTurn: false,
  }

  pure def recklessAttackGrantsAdvantage(
    state: RecklessAttackState,
    facts: RecklessAttackAdvantageFacts
  ): bool = all {
    state.occurrence == RecklessAttackUntilStartOfTurn,
    facts.strengthAttackRoll,
  }

  pure def recklessAttackGrantsIncomingAttackAdvantage(state: RecklessAttackState): bool =
    state.occurrence == RecklessAttackUntilStartOfTurn

  pure def sneakAttackDiceForRogueLevel(rogueLevel: int): int =
    if (rogueLevel >= 19) 10
    else if (rogueLevel >= 17) 9
    else if (rogueLevel >= 15) 8
    else if (rogueLevel >= 13) 7
    else if (rogueLevel >= 11) 6
    else if (rogueLevel >= 9) 5
    else if (rogueLevel >= 7) 4
    else if (rogueLevel >= 5) 3
    else if (rogueLevel >= 3) 2
    else if (rogueLevel >= 1) 1
    else 0

  pure def sneakAttackWeaponEligible(kind: WeaponProcedureKind): bool =
    kind == FinesseWeapon or kind == RangedWeapon

  pure def rollHasEffectiveAdvantage(hasAdvantage: bool, hasDisadvantage: bool): bool =
    hasAdvantage and not(hasDisadvantage)

  pure def sneakAttackEligibilityBranch(facts: SneakAttackFacts): bool =
    rollHasEffectiveAdvantage(facts.hasAdvantage, facts.hasDisadvantage)
      or (facts.allyWithinFiveFeet and not(facts.allyIncapacitated) and not(facts.hasDisadvantage))

  pure def resolveSneakAttack(facts: SneakAttackFacts): SneakAttackResult = {
    val admitted = all {
      facts.hitWithAttackRoll,
      sneakAttackWeaponEligible(facts.weaponKind),
      sneakAttackEligibilityBranch(facts),
      not(facts.usedThisTurn),
      sneakAttackDiceForRogueLevel(facts.rogueLevel) > 0,
    }
    {
      admitted: admitted,
      usedThisTurn: facts.usedThisTurn or admitted,
      damageDice: if (admitted) sneakAttackDiceForRogueLevel(facts.rogueLevel) else 0,
      damageType: facts.weaponDamageType,
    }
  }

  pure def saveDamageAfterEvasionReplacement(
    facts: SaveDamageReplacementFacts,
    normalFailedSaveDamage: int
  ): int =
    if (all {
      facts.savingThrowAbility == DexteritySavingThrowFact,
      facts.normalSuccessTakesHalfDamage,
      not(facts.incapacitated),
    }) {
      if (facts.savingThrowSucceeded) 0 else normalFailedSaveDamage / 2
    } else {
      if (facts.savingThrowSucceeded and facts.normalSuccessTakesHalfDamage)
      normalFailedSaveDamage / 2
      else normalFailedSaveDamage
    }

  pure def passiveSavingThrowRollMode(facts: PassiveSavingThrowRollModeFacts): PassiveSavingThrowRollMode =
    if (facts.savingThrowAbility == DexteritySavingThrowFact and not(facts.incapacitated))
      AdvantageSavingThrowMode
    else
      NormalSavingThrowMode

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

  run test_action_surge_grants_one_non_magic_action_once_per_turn = {
    val pool = { usesRemaining: 2, maximumUses: 2 }
    val surged = activateActionSurge(initialActionSurgeState(pool), true)
    val attack = spendActionSurgeAction(surged, AttackAction)
    val secondActivation = activateActionSurge(attack.actionSurge, true)
    val nextTurnActivation = activateActionSurge(startTurnActionSurge(attack.actionSurge), true)
    all {
      assert(surged.pool.usesRemaining == 1),
      assert(attack.actionWasTaken),
      assert(attack.actionSurge.actionGrant == ActionSurgeActionSpent),
      assert(secondActivation == attack.actionSurge),
      assert(nextTurnActivation.pool.usesRemaining == 0),
      assert(legalActionSurgeState(nextTurnActivation)),
    }
  }

  run test_action_surge_extra_action_excludes_magic = {
    val pool = { usesRemaining: 1, maximumUses: 1 }
    val surged = activateActionSurge(initialActionSurgeState(pool), true)
    val magic = spendActionSurgeAction(surged, MagicAction)
    all {
      assert(not(magic.actionWasTaken)),
      assert(magic.actionSurge.actionGrant == ActionSurgeActionAvailable),
    }
  }

  run test_second_wind_spends_bonus_action_and_heals = {
    val result = resolveSecondWind(
      initialTurnProcedureState,
      { usesRemaining: 2, maximumUses: 2 },
      {
        kind: PlayerCharacter,
        hitPoints: 3,
        hitPointMaximum: 20,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      resetDeathSavingThrowLifecycle,
      NoPositiveHitPointUnconsciousRecovery,
      { healingRoll: 6, fighterLevel: 4 }
    )
    all {
      assert(not(result.turn.bonusActionAvailable)),
      assert(result.pool.usesRemaining == 1),
      assert(result.recovery.vitals.hitPoints == 13),
      assert(legalHitPointRecoveryState(
        result.recovery.vitals,
        result.recovery.deathSavingThrows,
        result.recovery.positiveHitPointUnconsciousRecovery
      )),
    }
  }

  run test_second_wind_non_admission_preserves_recovery_lifecycle = {
    val lifecycle = {
      successes: 0,
      failures: 0,
      stable: false,
      hpRegained: false,
    }
    val result = resolveSecondWind(
      initialTurnProcedureState,
      { usesRemaining: 0, maximumUses: 2 },
      {
        kind: PlayerCharacter,
        hitPoints: 5,
        hitPointMaximum: 20,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: true,
      },
      lifecycle,
      EndsWhenHitPointsRegained,
      { healingRoll: 6, fighterLevel: 4 }
    )
    all {
      assert(result.turn == initialTurnProcedureState),
      assert(result.pool.usesRemaining == 0),
      assert(result.recovery.vitals.hitPoints == 5),
      assert(result.recovery.deathSavingThrows == lifecycle),
      assert(result.recovery.positiveHitPointUnconsciousRecovery == EndsWhenHitPointsRegained),
      assert(result.recovery.hitPointsRegained == 0),
    }
  }

  run test_tactical_mind_spends_second_wind_only_on_converted_success = {
    val converted = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 2, maximumUses: 2 },
      { originalTotal: 13, dc: 15, boostRoll: 3 }
    )
    val stillFailed = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 2, maximumUses: 2 },
      { originalTotal: 10, dc: 15, boostRoll: 4 }
    )
    all {
      assert(not(converted.originalSucceeded)),
      assert(converted.boostedSucceeded),
      assert(converted.boostedTotal == 16),
      assert(converted.pool.usesRemaining == 1),
      assert(not(stillFailed.originalSucceeded)),
      assert(not(stillFailed.boostedSucceeded)),
      assert(stillFailed.boostedTotal == 14),
      assert(stillFailed.pool.usesRemaining == 2),
    }
  }

  run test_tactical_mind_requires_failed_ability_check_and_second_wind_use = {
    val originalSuccess = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 2, maximumUses: 2 },
      { originalTotal: 15, dc: 15, boostRoll: 1 }
    )
    val depleted = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 0, maximumUses: 2 },
      { originalTotal: 14, dc: 15, boostRoll: 1 }
    )
    all {
      assert(originalSuccess.originalSucceeded),
      assert(originalSuccess.boostedSucceeded),
      assert(originalSuccess.pool.usesRemaining == 2),
      assert(not(depleted.originalSucceeded)),
      assert(depleted.boostedSucceeded),
      assert(depleted.pool.usesRemaining == 0),
    }
  }

  run test_cunning_action_spends_bonus_action_for_dash_disengage_or_hide = {
    val dash = resolveCunningAction(initialTurnProcedureState, {
      choice: CunningDash,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: false, checkTotal: 0, dc: 10 },
    })
    val disengage = resolveCunningAction(initialTurnProcedureState, {
      choice: CunningDisengage,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: false, checkTotal: 0, dc: 10 },
    })
    val hide = resolveCunningAction(initialTurnProcedureState, {
      choice: CunningHide,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: true, checkTotal: 18, dc: 15 },
    })
    all {
      assert(not(dash.bonusActionAvailable)),
      assert(dash.dashMovementBonusFeet == 30),
      assert(not(disengage.bonusActionAvailable)),
      assert(disengage.disengaged),
      assert(not(hide.bonusActionAvailable)),
      assert(hide.hidden),
    }
  }

  run test_champion_improved_critical_is_weapon_or_unarmed_threshold_nineteen_fact = {
    val weaponOutcome = resolveAttackRoll({
      naturalD20: 19,
      total: 1,
      armorClass: 30,
      criticalThreshold: attackCriticalThreshold(ChampionImprovedCriticalThresholdProfile({
        attackForm: ChampionWeaponAttack,
      })),
    })
    val unarmedOutcome = resolveAttackRoll({
      naturalD20: 19,
      total: 1,
      armorClass: 30,
      criticalThreshold: attackCriticalThreshold(ChampionImprovedCriticalThresholdProfile({
        attackForm: ChampionUnarmedStrikeAttack,
      })),
    })
    val nonEligibleAttackOutcome = resolveAttackRoll({
      naturalD20: 19,
      total: 1,
      armorClass: 30,
      criticalThreshold: attackCriticalThreshold(StandardAttackCriticalThresholdProfile),
    })
    all {
      assert(weaponOutcome.hits),
      assert(weaponOutcome.critical),
      assert(unarmedOutcome.hits),
      assert(unarmedOutcome.critical),
      assert(not(nonEligibleAttackOutcome.hits)),
      assert(not(nonEligibleAttackOutcome.critical)),
    }
  }

  run test_innate_sorcery_spends_bonus_action_and_long_rest_use = {
    val state = {
      turn: initialTurnProcedureState,
      pool: { usesRemaining: 2, maximumUses: 2 },
      occurrence: NoInnateSorceryOccurrence,
    }
    val active = activateInnateSorcery(state)
    val exhausted = activateInnateSorcery(state.with("pool", { usesRemaining: 0, maximumUses: 2 }))
    val alreadyActive = activateInnateSorcery(active)
    all {
      assert(not(active.turn.bonusActionAvailable)),
      assert(active.pool.usesRemaining == 1),
      assert(active.occurrence == InnateSorceryOneMinuteDuration),
      assert(exhausted.occurrence == NoInnateSorceryOccurrence),
      assert(exhausted.pool.usesRemaining == 0),
      assert(alreadyActive.pool.usesRemaining == 1),
    }
  }

  run test_rage_spends_bonus_action_breaks_concentration_and_grants_riders = {
    val state = {
      turn: initialTurnProcedureState,
      pool: { usesRemaining: 2, maximumUses: 2 },
      occurrence: NoRageOccurrence,
      concentration: {
        interruptedActor: Concentrating,
        reactor: NoConcentration,
      },
    }
    val raging = startRage(state, {
      wearingHeavyArmor: false,
      incapacitated: false,
      persistentRage: false,
    })
    val damage = applyRageDamageBonus(raging, {
      usesStrength: true,
      dealsDamage: true,
      attackForm: RageWeaponAttack,
    }, 9, 5)
    all {
      assert(raging.occurrence == RageUntilEndOfNextTurn),
      assert(not(raging.turn.bonusActionAvailable)),
      assert(raging.pool.usesRemaining == 1),
      assert(raging.concentration.interruptedActor == NoConcentration),
      assert(ragePreventsConcentrationOrSpellcasting(raging)),
      assert(rageGrantsResistance(RageBludgeoningDamage)),
      assert(rageGrantsResistance(RagePiercingDamage)),
      assert(rageGrantsResistance(RageSlashingDamage)),
      assert(not(rageGrantsResistance(RageOtherDamage))),
      assert(damage == 8),
      assert(legalRageState(raging)),
    }
  }

  run test_rage_heavy_armor_and_incapacitated_block_or_end = {
    val state = {
      turn: initialTurnProcedureState,
      pool: { usesRemaining: 2, maximumUses: 2 },
      occurrence: NoRageOccurrence,
      concentration: {
        interruptedActor: NoConcentration,
        reactor: NoConcentration,
      },
    }
    val blocked = startRage(state, {
      wearingHeavyArmor: true,
      incapacitated: false,
      persistentRage: false,
    })
    val raging = startRage(state, {
      wearingHeavyArmor: false,
      incapacitated: false,
      persistentRage: false,
    })
    val ended = endRageIfBlocked(raging, {
      madeAttackRollAgainstEnemy: false,
      forcedEnemySavingThrow: false,
      spendsBonusAction: false,
      incapacitated: true,
      unconscious: false,
      wearingHeavyArmor: false,
    })
    all {
      assert(blocked == state),
      assert(ended.occurrence == NoRageOccurrence),
    }
  }

  run test_reckless_attack_only_activates_on_first_strength_attack_roll = {
    val initial = {
      occurrence: NoRecklessAttackOccurrence,
      attackRollMadeThisTurn: false,
    }
    val reckless = activateRecklessAttackOnFirstAttackRoll(initial, {
      choosesRecklessAttack: true,
      strengthAttackRoll: true,
    })
    val later = activateRecklessAttackOnFirstAttackRoll(startTurnRecklessAttack(reckless)
      .with("attackRollMadeThisTurn", true), {
      choosesRecklessAttack: true,
      strengthAttackRoll: true,
    })
    all {
      assert(recklessAttackGrantsAdvantage(reckless, { strengthAttackRoll: true })),
      assert(not(recklessAttackGrantsAdvantage(reckless, { strengthAttackRoll: false }))),
      assert(recklessAttackGrantsIncomingAttackAdvantage(reckless)),
      assert(startTurnRecklessAttack(reckless).occurrence == NoRecklessAttackOccurrence),
      assert(later.occurrence == NoRecklessAttackOccurrence),
    }
  }

  run test_sneak_attack_uses_attack_roll_weapon_and_once_per_turn_facts = {
    val result = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: FinesseWeapon,
      hasAdvantage: true,
      hasDisadvantage: false,
      allyWithinFiveFeet: false,
      allyIncapacitated: false,
      usedThisTurn: false,
      rogueLevel: 5,
      weaponDamageType: SlashingDamage,
    })
    val repeated = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: FinesseWeapon,
      hasAdvantage: true,
      hasDisadvantage: false,
      allyWithinFiveFeet: false,
      allyIncapacitated: false,
      usedThisTurn: result.usedThisTurn,
      rogueLevel: 5,
      weaponDamageType: SlashingDamage,
    })
    all {
      assert(result.admitted),
      assert(result.damageDice == 3),
      assert(result.damageType == SlashingDamage),
      assert(result.usedThisTurn),
      assert(not(repeated.admitted)),
    }
  }

  run test_sneak_attack_ally_branch_requires_no_disadvantage_and_active_ally = {
    val admitted = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: RangedWeapon,
      hasAdvantage: false,
      hasDisadvantage: false,
      allyWithinFiveFeet: true,
      allyIncapacitated: false,
      usedThisTurn: false,
      rogueLevel: 7,
      weaponDamageType: PoisonDamage,
    })
    val blocked = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: RangedWeapon,
      hasAdvantage: false,
      hasDisadvantage: true,
      allyWithinFiveFeet: true,
      allyIncapacitated: false,
      usedThisTurn: false,
      rogueLevel: 7,
      weaponDamageType: PoisonDamage,
    })
    val canceledAdvantage = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: RangedWeapon,
      hasAdvantage: true,
      hasDisadvantage: true,
      allyWithinFiveFeet: false,
      allyIncapacitated: false,
      usedThisTurn: false,
      rogueLevel: 7,
      weaponDamageType: PoisonDamage,
    })
    all {
      assert(admitted.admitted),
      assert(admitted.damageDice == 4),
      assert(not(blocked.admitted)),
      assert(not(canceledAdvantage.admitted)),
    }
  }

  run test_evasion_replaces_dexterity_save_damage_only_when_not_incapacitated = {
    val success = saveDamageAfterEvasionReplacement({
      savingThrowAbility: DexteritySavingThrowFact,
      normalSuccessTakesHalfDamage: true,
      savingThrowSucceeded: true,
      incapacitated: false,
    }, 20)
    val failure = saveDamageAfterEvasionReplacement({
      savingThrowAbility: DexteritySavingThrowFact,
      normalSuccessTakesHalfDamage: true,
      savingThrowSucceeded: false,
      incapacitated: false,
    }, 20)
    val incapacitated = saveDamageAfterEvasionReplacement({
      savingThrowAbility: DexteritySavingThrowFact,
      normalSuccessTakesHalfDamage: true,
      savingThrowSucceeded: true,
      incapacitated: true,
    }, 20)
    all {
      assert(success == 0),
      assert(failure == 10),
      assert(incapacitated == 10),
    }
  }

  run test_danger_sense_grants_dexterity_saving_throw_advantage_when_not_incapacitated = {
    all {
      assert(passiveSavingThrowRollMode({
        savingThrowAbility: DexteritySavingThrowFact,
        incapacitated: false,
      }) == AdvantageSavingThrowMode),
      assert(passiveSavingThrowRollMode({
        savingThrowAbility: DexteritySavingThrowFact,
        incapacitated: true,
      }) == NormalSavingThrowMode),
      assert(passiveSavingThrowRollMode({
        savingThrowAbility: ConstitutionSavingThrowFact,
        incapacitated: false,
      }) == NormalSavingThrowMode),
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

  run test_archery_adds_two_to_ranged_weapon_attack_rolls_only = {
    val ranged = resolveArcheryAttackRoll({
      weaponKind: RangedWeapon,
      baseAttackRollTotal: 14,
      targetArmorClass: 16,
      naturalD20: 10,
    })
    val nonRanged = resolveArcheryAttackRoll({
      weaponKind: OtherWeapon,
      baseAttackRollTotal: 14,
      targetArmorClass: 16,
      naturalD20: 10,
    })
    all {
      assert(ranged.bonus == 2),
      assert(ranged.effectiveAttackRollTotal == 16),
      assert(ranged.hits),
      assert(nonRanged.bonus == 0),
      assert(nonRanged.effectiveAttackRollTotal == 14),
      assert(not(nonRanged.hits)),
    }
  }

  run test_attack_roll_miss_to_hit_replacement_turns_one_miss_into_hit = {
    val replaced = resolveAttackRollMissToHitReplacement({
      naturalD20: 2,
      total: 10,
      armorClass: 16,
      usedSinceTurnStart: false,
      choosesFeature: true,
    })
    val declined = resolveAttackRollMissToHitReplacement({
      naturalD20: 2,
      total: 10,
      armorClass: 16,
      usedSinceTurnStart: false,
      choosesFeature: false,
    })
    val reused = resolveAttackRollMissToHitReplacement({
      naturalD20: 2,
      total: 10,
      armorClass: 16,
      usedSinceTurnStart: true,
      choosesFeature: true,
    })
    val ordinaryHit = resolveAttackRollMissToHitReplacement({
      naturalD20: 10,
      total: 16,
      armorClass: 16,
      usedSinceTurnStart: false,
      choosesFeature: true,
    })
    all {
      assert(replaced.admitted),
      assert(not(replaced.ordinaryHits)),
      assert(replaced.effectiveHits),
      assert(replaced.usedSinceTurnStart),
      assert(not(replaced.critical)),
      assert(not(declined.effectiveHits)),
      assert(not(declined.usedSinceTurnStart)),
      assert(not(reused.admitted)),
      assert(not(reused.effectiveHits)),
      assert(ordinaryHit.ordinaryHits),
      assert(ordinaryHit.effectiveHits),
      assert(not(ordinaryHit.admitted)),
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

  run test_adrenaline_rush_spends_bonus_action_dash_use_and_applies_temporary_hit_points = {
    val result = resolveBonusActionDashTemporaryHitPoints(
      initialTurnProcedureState,
      { usesRemaining: 2, maximumUses: 2 },
      {
        speedFeet: 30,
        proficiencyBonus: 3,
        existingTemporaryHitPoints: 1,
        chooseNewTemporaryHitPoints: true,
      }
    )
    all {
      assert(not(result.turn.bonusActionAvailable)),
      assert(result.turn.dashMovementBonusFeet == 30),
      assert(result.pool.usesRemaining == 1),
      assert(result.temporaryHitPoints == 3),
    }
  }

  run test_adrenaline_rush_can_keep_higher_existing_temporary_hit_points = {
    val result = resolveBonusActionDashTemporaryHitPoints(
      initialTurnProcedureState,
      { usesRemaining: 1, maximumUses: 2 },
      {
        speedFeet: 30,
        proficiencyBonus: 2,
        existingTemporaryHitPoints: 5,
        chooseNewTemporaryHitPoints: false,
      }
    )
    all {
      assert(result.turn.dashMovementBonusFeet == 30),
      assert(result.pool.usesRemaining == 0),
      assert(result.temporaryHitPoints == 5),
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

  run test_extra_attack_spends_one_action_and_resolves_two_attack_slots = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 1 }
    )
    val second = resolveExtraAttackSlot(first.state)
    all {
      assert(first.actionWasSpent),
      assert(first.attackWasResolved),
      assert(not(first.state.actionAvailable)),
      assert(first.state.extraAttackSlotOpen),
      assert(not(second.actionWasSpent)),
      assert(second.attackWasResolved),
      assert(not(second.state.extraAttackSlotOpen)),
      assert(second.state.attacksResolved == 2),
    }
  }

  run test_extra_attack_allows_movement_between_attack_slots = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 1 }
    )
    val moved = moveDuringAttackActionAttackCount(first.state)
    val second = resolveExtraAttackSlot(moved)
    all {
      assert(moved.extraAttackSlotOpen),
      assert(moved.movementSegmentsTaken == 1),
      assert(second.attackWasResolved),
      assert(second.state.attacksResolved == 2),
    }
  }

  run test_extra_attack_end_turn_closes_unspent_slot = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 1 }
    )
    val ended = endTurnDuringAttackActionAttackCount(first.state)
    val rejected = resolveExtraAttackSlot(ended)
    all {
      assert(not(ended.extraAttackSlotOpen)),
      assert(ended.turnEnded),
      assert(not(rejected.attackWasResolved)),
      assert(rejected.state.attacksResolved == 1),
    }
  }

  run test_extra_attack_profile_rejects_adjacent_additional_counts = {
    val admitted = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 1 }
    )
    val rejected = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 2 }
    )
    all {
      assert(admitted.attackWasResolved),
      assert(not(rejected.attackWasResolved)),
      assert(rejected.state.actionAvailable),
    }
  }
}
