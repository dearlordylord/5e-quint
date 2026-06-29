// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.light-extra-attack-damage-ability-modifier

module attackDamageComposition {
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  type AttackRangeFact =
    | WithinMeleeReach
    | WithinNormalRange
    | WithinLongRange
    | BeyondRange

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
    attackRollOutcome: AttackRollOutcome,
    damageResult: HitPointRecoveryResult,
  }

  pure def legalAttackTargetFact(attackKind: AttackKind, rangeFact: AttackRangeFact): bool =
    if (attackKind == MeleeAttack) rangeFact == WithinMeleeReach
    else rangeFact == WithinNormalRange or rangeFact == WithinLongRange

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
    val damageByType =
      addDamageAmountForType(emptyDamageByType, facts.damageType, adjustedRoll)
    totalDamageAfterTargetAdjustments(damageByType, facts.targetAdjustments)
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
        applyResolvedDamageToPositiveHitPoints(vitals, damageAmount).vitals.hitPoints == 0,
      }

  pure def resolveAttackDamage(
    vitals: CreatureVitals,
    facts: AttackDamageProcedureFacts
  ): HitPointRecoveryResult = {
    val damageAmount = damageAmountBeforeHitPoints(facts)
    val damageResult = applyResolvedDamageToPositiveHitPoints(vitals, damageAmount)
    if (facts.disposition == KnockOutAttackDamage) {
      applyKnockOutDisposition(damageResult)
    } else {
      {
        vitals: damageResult.vitals,
        deathSavingThrows:
          deathSavingThrowLifecycleAfterPositiveHitPointDamage(
            resetDeathSavingThrowLifecycle,
            damageResult
          ),
        positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
        hitPointsRegained: 0,
      }
    }
  }

  pure def resolveAttackProcedure(
    quota: ActionQuota,
    rangeFact: AttackRangeFact,
    rollFacts: AttackRollProcedureFacts,
    targetVitals: CreatureVitals,
    damageFacts: AttackDamageProcedureFacts
  ): AttackProcedureResult = {
    val rollOutcome = resolveAttackRoll(rollFacts)
    val damageAmount = damageAmountBeforeHitPoints(damageFacts)
    val attackAdmitted = all {
      quota == ActionAvailable,
      legalAttackTargetFact(damageFacts.attackKind, rangeFact),
      legalAttackRollProcedureFacts(rollFacts),
      canApplyResolvedDamageToPositiveHitPoints(targetVitals),
    }
    val dispositionAdmitted =
      damageFacts.disposition == OrdinaryAttackDamage
        or (rollOutcome.hits and attackDamageDispositionIsLegal(targetVitals, damageAmount, damageFacts))
    val procedureAdmitted = attackAdmitted and dispositionAdmitted
    val canApplyDamage = all {
      procedureAdmitted,
      rollOutcome.hits,
    }
    {
      actionQuota: if (procedureAdmitted) spendActionQuota(quota) else quota,
      attackRollOutcome: rollOutcome,
      damageResult:
        if (canApplyDamage) resolveAttackDamage(targetVitals, damageFacts)
        else {
          vitals: targetVitals,
          deathSavingThrows: resetDeathSavingThrowLifecycle,
          positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
          hitPointsRegained: 0,
        },
    }
  }
}
