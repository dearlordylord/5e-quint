// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.light-extra-attack-damage-ability-modifier

// RAW trace:
// - .references/srd-5.2.1/playing-the-game.md#Ranged-Attacks defines the
//   normal and long range bands, imposes Disadvantage in the long band, and
//   disallows attacks beyond long range.
// - .references/srd-5.2.1/playing-the-game.md#Advantage/Disadvantage cancels
//   Advantage and Disadvantage before choosing the attack roll mode.
// - UBIQUITOUS_LANGUAGE.md maps these rules under D20 rolls and modifiers.

module attackDamageComposition {
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import d20TestRollMode.* from "./d20-test-roll-mode"
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  type AttackRangeBand =
    | WithinMeleeReach
    | WithinSingleRange
    | WithinNormalRange
    | WithinLongRange
    | BeyondRange

  type AttackRangeCapability =
    | MeleeReachRangeCapability({ reachFeet: int })
    | SingleRangedRangeCapability({ rangeFeet: int })
    | NormalAndLongRangedRangeCapability({ normalRangeFeet: int, longRangeFeet: int })

  type AttackTargetRangeFacts = {
    capability: AttackRangeCapability,
    distanceFeet: int,
  }

  type AttackRangeResolution =
    | InvalidAttackRangeResolution
    | AttackRangeResolved({ band: AttackRangeBand })

  type AttackKind = MeleeAttack | RangedAttack

  type ActionQuota = ActionAvailable | ActionSpent

  type AttackDamageDisposition =
    | OrdinaryAttackDamage
    | KnockOutAttackDamage

  type AttackDamageProcedureFacts = {
    attackKind: AttackKind,
    damageType: RuleDamageType,
    rolledDamage: int,
    damageModifier: int,
    targetAdjustments: DamageAdjustmentFacts,
    disposition: AttackDamageDisposition,
  }

  type AttackProcedureResult = {
    actionQuota: ActionQuota,
    attackRollMode: D20TestRollMode,
    attackRollOutcome: AttackRollOutcome,
    damageResult: HitPointRecoveryResult,
  }

  pure def attackRangeCapabilityIsLegal(
    attackKind: AttackKind,
    capability: AttackRangeCapability,
  ): bool =
    match capability {
      | MeleeReachRangeCapability(data) =>
          attackKind == MeleeAttack and data.reachFeet > 0
      | SingleRangedRangeCapability(data) =>
          attackKind == RangedAttack and data.rangeFeet > 0
      | NormalAndLongRangedRangeCapability(data) => all {
          attackKind == RangedAttack,
          data.normalRangeFeet > 0,
          data.longRangeFeet > data.normalRangeFeet,
        }
    }

  pure def attackRangeBand(facts: AttackTargetRangeFacts): AttackRangeBand =
    match facts.capability {
      | MeleeReachRangeCapability(data) =>
          if (facts.distanceFeet <= data.reachFeet) WithinMeleeReach else BeyondRange
      | SingleRangedRangeCapability(data) =>
          if (facts.distanceFeet <= data.rangeFeet) WithinSingleRange else BeyondRange
      | NormalAndLongRangedRangeCapability(data) =>
          if (facts.distanceFeet <= data.normalRangeFeet) WithinNormalRange
          else if (facts.distanceFeet <= data.longRangeFeet) WithinLongRange
          else BeyondRange
    }

  pure def resolveAttackRangeFacts(
    attackKind: AttackKind,
    facts: AttackTargetRangeFacts,
  ): AttackRangeResolution =
    if (
      facts.distanceFeet < 0
        or not(attackRangeCapabilityIsLegal(attackKind, facts.capability))
    )
      InvalidAttackRangeResolution
    else
      AttackRangeResolved({ band: attackRangeBand(facts) })

  pure def legalAttackTargetFact(
    attackKind: AttackKind,
    rangeResolution: AttackRangeResolution,
  ): bool =
    match rangeResolution {
      | InvalidAttackRangeResolution => false
      | AttackRangeResolved(data) =>
          match attackKind {
            | MeleeAttack => data.band == WithinMeleeReach
            | RangedAttack =>
                data.band == WithinSingleRange
                  or data.band == WithinNormalRange
                  or data.band == WithinLongRange
          }
    }

  type LightExtraAttackDamageAbilityModifierFact =
    | LightExtraAttackNoExistingDamageAbilityModifier
    | LightExtraAttackExistingDamageAbilityModifier(int)

  type LightExtraAttackDamageAbilityModifierChoice =
    | ApplyLightExtraAttackDamageAbilityModifier
    | DeclineLightExtraAttackDamageAbilityModifier

  pure def lightPropertyExtraAttackDamageAbilityModifierChoiceRequired(
    abilityModifier: int,
    damageAbilityModifier: LightExtraAttackDamageAbilityModifierFact,
    twoWeaponFightingSelected: bool
  ): bool =
    match damageAbilityModifier {
      | LightExtraAttackNoExistingDamageAbilityModifier =>
          twoWeaponFightingSelected and abilityModifier > 0
      | LightExtraAttackExistingDamageAbilityModifier(_) => false
    }

  pure def lightPropertyExtraAttackDamageModifier(
    abilityModifier: int,
    damageAbilityModifier: LightExtraAttackDamageAbilityModifierFact,
    twoWeaponFightingSelected: bool,
    choice: LightExtraAttackDamageAbilityModifierChoice
  ): int = {
    val appliedDamageAbilityModifier =
      match damageAbilityModifier {
        | LightExtraAttackNoExistingDamageAbilityModifier => abilityModifier
        | LightExtraAttackExistingDamageAbilityModifier(modifier) => modifier
      }
    if (lightPropertyExtraAttackDamageAbilityModifierChoiceRequired(
      abilityModifier,
      damageAbilityModifier,
      twoWeaponFightingSelected
    ))
      if (choice == ApplyLightExtraAttackDamageAbilityModifier)
        appliedDamageAbilityModifier
      else
        0
    else if (twoWeaponFightingSelected or appliedDamageAbilityModifier < 0)
      appliedDamageAbilityModifier
    else
      0
  }

  pure def lightPropertyExtraAttackDamageAmount(
    rolledDamage: int,
    abilityModifier: int,
    damageAbilityModifier: LightExtraAttackDamageAbilityModifierFact,
    twoWeaponFightingSelected: bool,
    choice: LightExtraAttackDamageAbilityModifierChoice
  ): int =
    adjustedDamageRollAmount(
      rolledDamage,
      lightPropertyExtraAttackDamageModifier(
        abilityModifier,
        damageAbilityModifier,
        twoWeaponFightingSelected,
        choice
      )
    )

  pure def spendActionQuota(quota: ActionQuota): ActionQuota =
    ActionSpent

  pure def damageAmountBeforeHitPoints(facts: AttackDamageProcedureFacts): int = {
    val adjustedRoll = adjustedDamageRollAmount(facts.rolledDamage, facts.damageModifier)
    damageAmountAfterTargetAdjustments(
      adjustedRoll,
      facts.damageType,
      facts.targetAdjustments
    )
  }

  pure def attackDamageDispositionIsLegal(
    vitals: CreatureVitals,
    damageAmount: int,
    facts: AttackDamageProcedureFacts
  ): bool =
    facts.disposition == OrdinaryAttackDamage
      or all {
        facts.attackKind == MeleeAttack,
        damageAmount > 0,
        // "When you would reduce a creature to 0 Hit Points": a target already
        // at 0 isn't reduced to it.
        vitals.hitPoints > 0,
        applyResolvedDamageToPositiveHitPoints(vitals, damageAmount).vitals.hitPoints == 0,
      }

  // playing-the-game.md, "Damage at 0 Hit Points": a hit on a target with 0
  // Hit Points that still makes Death Saving Throws adds failures (two for a
  // Critical Hit) or kills, through the zero-HP lifecycle.
  pure def resolveAttackDamageAtZeroHitPoints(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    damageAmount: int,
    criticalHit: bool
  ): HitPointRecoveryResult = {
    val result = applyDamageToZeroHitPointCreature(vitals, lifecycle, damageAmount, criticalHit)
    {
      vitals: result.vitals,
      deathSavingThrows: result.deathSavingThrows,
      positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
      hitPointsRegained: 0,
    }
  }

  pure def resolveAttackDamage(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    facts: AttackDamageProcedureFacts,
    criticalHit: bool
  ): HitPointRecoveryResult = {
    val damageAmount = damageAmountBeforeHitPoints(facts)
    if (canUseDeathSavingThrowLifecycle(vitals, lifecycle)) {
      resolveAttackDamageAtZeroHitPoints(vitals, lifecycle, damageAmount, criticalHit)
    } else {
      val damageResult = applyResolvedDamageToPositiveHitPoints(vitals, damageAmount)
      if (facts.disposition == KnockOutAttackDamage) {
        applyKnockOutDisposition(damageResult)
      } else {
        {
          vitals: damageResult.vitals,
          deathSavingThrows:
            deathSavingThrowLifecycleAfterPositiveHitPointDamage(lifecycle, damageResult),
          positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
          hitPointsRegained: 0,
        }
      }
    }
  }

  // A target the attack's damage can reach: dead or with positive Hit Points
  // (the positive-HP damage procedure), or at 0 Hit Points and still making
  // Death Saving Throws (the zero-HP lifecycle). Either way its lifecycle must
  // agree with its vitals, since the result carries that lifecycle forward.
  pure def attackTargetCanTakeDamage(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle
  ): bool = all {
    legalDeathSavingThrowLifecycleForVitals(vitals, lifecycle),
    canApplyResolvedDamageToPositiveHitPoints(vitals)
      or canUseDeathSavingThrowLifecycle(vitals, lifecycle),
  }

  pure def resolveAttackProcedure(
    quota: ActionQuota,
    targetRangeFacts: AttackTargetRangeFacts,
    rollFacts: AttackRollProcedureFacts,
    rollModeSources: D20TestRollModeSources,
    targetVitals: CreatureVitals,
    targetDeathSavingThrows: DeathSavingThrowLifecycle,
    damageFacts: AttackDamageProcedureFacts
  ): AttackProcedureResult = {
    val rangeResolution = resolveAttackRangeFacts(damageFacts.attackKind, targetRangeFacts)
    val targetWithinLongRangeBand =
      match rangeResolution {
        | InvalidAttackRangeResolution => false
        | AttackRangeResolved(data) => data.band == WithinLongRange
      }
    val attackRollMode = d20TestRollModeFromSources({
      ...rollModeSources,
      disadvantage:
        rollModeSources.disadvantage or targetWithinLongRangeBand,
    })
    val rollOutcome = resolveAttackRollAgainstTarget(
      rollFacts,
      {
        unconscious: targetVitals.unconscious,
        distanceFeet: targetRangeFacts.distanceFeet,
      }
    )
    val damageAmount = damageAmountBeforeHitPoints(damageFacts)
    val attackAdmitted = all {
      quota == ActionAvailable,
      legalAttackTargetFact(damageFacts.attackKind, rangeResolution),
      legalAttackTargetCriticalFacts({
        unconscious: targetVitals.unconscious,
        distanceFeet: targetRangeFacts.distanceFeet,
      }),
      legalAttackRollProcedureFacts(rollFacts),
      attackTargetCanTakeDamage(targetVitals, targetDeathSavingThrows),
    }
    val dispositionAdmitted =
      damageFacts.disposition == OrdinaryAttackDamage
        or (attackRollOutcomeHits(rollOutcome) and attackDamageDispositionIsLegal(targetVitals, damageAmount, damageFacts))
    val procedureAdmitted = attackAdmitted and dispositionAdmitted
    val canApplyDamage = all {
      procedureAdmitted,
      attackRollOutcomeHits(rollOutcome),
    }
    {
      actionQuota: if (procedureAdmitted) spendActionQuota(quota) else quota,
      attackRollMode: attackRollMode,
      attackRollOutcome: rollOutcome,
      damageResult:
        if (canApplyDamage)
          resolveAttackDamage(
            targetVitals,
            targetDeathSavingThrows,
            damageFacts,
            attackRollOutcomeIsCriticalHit(rollOutcome)
          )
        else {
          vitals: targetVitals,
          deathSavingThrows: targetDeathSavingThrows,
          positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
          hitPointsRegained: 0,
        },
    }
  }
}
