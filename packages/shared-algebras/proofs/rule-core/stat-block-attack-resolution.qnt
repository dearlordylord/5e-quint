// -*- mode: Bluespec; -*-

// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-ATTACK-PROCEDURE-001 RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.attack-procedure
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.ATTACK_PROCEDURE

// RAW trace:
// - .references/srd-5.2.1/Monsters/Overview.md#Parts-of-a-Stat-Block
//   defines monster Attack Notation and permits the number or expression to
//   be used for each instance of damage.
// - .references/srd-5.2.1/Monsters/Monsters-E-G.md contains attacks whose
//   conditional Advantage bonus has the same damage type as the base damage;
//   this slice admits that typed conditional-bonus family only.
// - .references/srd-5.2.1/Playing-the-Game.md#Attack-Rolls defines hit
//   resolution against Armor Class.
// - .references/srd-5.2.1/Playing-the-Game.md#Critical-Hits doubles only the
//   damage dice, while modifiers are added once.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage-Types applies typed
//   damage components to Hit Points.
// - .references/srd-5.2.1/Playing-the-Game.md#Making-an-Attack permits a hit
//   to cause a special effect in addition to damage.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Critical Hit, Damage Type, Rider,
//   Stat Block, and Hit Points.
module statBlockAttackResolution {
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import hitPointDamage.* from "./hit-point-damage"

  type StatBlockAttackRollMode =
    | NormalStatBlockAttackRoll
    | AdvantageStatBlockAttackRoll
    | DisadvantageStatBlockAttackRoll

  type StatBlockDamageComponentRole =
    | BaseStatBlockDamageComponent({ ordinal: int })
    | AdvantageBonusStatBlockDamageComponent

  type SelectedStatBlockDamageAmount =
    | SelectedStaticStatBlockDamage({ amount: int })
    | SelectedRolledStatBlockDamage({
        baseDiceCount: int,
        dieSize: int,
        dieResults: List[int],
        flatModifier: int,
      })

  type SelectedStatBlockDamageComponent = {
    componentRole: StatBlockDamageComponentRole,
    damageType: RuleDamageType,
    selectedAmount: SelectedStatBlockDamageAmount,
  }

  type StatBlockAdvantageBonusDamage =
    | NoStatBlockAdvantageBonusDamage
    | SelectedStatBlockAdvantageBonusDamage({
        component: SelectedStatBlockDamageComponent,
      })

  type StatBlockCreatureSize =
    | TinyStatBlockCreature
    | SmallStatBlockCreature
    | MediumStatBlockCreature
    | LargeStatBlockCreature
    | HugeStatBlockCreature
    | GargantuanStatBlockCreature

  type StatBlockHitRider =
    | NoStatBlockHitRider
    | StatBlockProneIfTargetSizeAtMost({
        targetSize: StatBlockCreatureSize,
        maximumTargetSize: StatBlockCreatureSize,
        targetProneImmune: bool,
      })

  type StatBlockAttackResolutionFacts = {
    attackRoll: AttackRollProcedureFacts,
    attackRollMode: StatBlockAttackRollMode,
    firstBaseDamageComponent: SelectedStatBlockDamageComponent,
    remainingBaseDamageComponents: List[SelectedStatBlockDamageComponent],
    advantageBonusDamage: StatBlockAdvantageBonusDamage,
    targetDamageAdjustments: DamageAdjustmentFacts,
    hitRider: StatBlockHitRider,
  }

  type StatBlockAttackImpact = {
    factsLegal: bool,
    attackHits: bool,
    critical: bool,
    rawDamageAmount: int,
    targetProneApplied: bool,
  }

  type StatBlockAttackResolutionResult = {
    impact: StatBlockAttackImpact,
    activeDamageByType: DamageByType,
    adjustedDamageAmount: int,
  }

  pure def statBlockCreatureSizeRank(creatureSize: StatBlockCreatureSize): int =
    match creatureSize {
      | TinyStatBlockCreature => 0
      | SmallStatBlockCreature => 1
      | MediumStatBlockCreature => 2
      | LargeStatBlockCreature => 3
      | HugeStatBlockCreature => 4
      | GargantuanStatBlockCreature => 5
    }

  pure def selectedStatBlockDamageDefinitionLegal(
    selectedAmount: SelectedStatBlockDamageAmount
  ): bool =
    match selectedAmount {
      | SelectedStaticStatBlockDamage(data) => data.amount >= 0
      | SelectedRolledStatBlockDamage(data) => all {
          data.baseDiceCount >= 1,
          data.dieSize >= 2,
        }
    }

  pure def selectedStatBlockDamageRollLegal(
    selectedAmount: SelectedStatBlockDamageAmount,
    critical: bool
  ): bool =
    match selectedAmount {
      | SelectedStaticStatBlockDamage(_) => true
      | SelectedRolledStatBlockDamage(data) => all {
          data.dieResults.length() == criticalDamageDiceCount(data.baseDiceCount, critical),
          data.dieResults.foldl(
            true,
            (legal, dieResult) => legal and dieResult >= 1 and dieResult <= data.dieSize
          ),
        }
    }

  pure def selectedStatBlockDamageAmount(
    selectedAmount: SelectedStatBlockDamageAmount
  ): int =
    match selectedAmount {
      | SelectedStaticStatBlockDamage(data) => nonnegative(data.amount)
      | SelectedRolledStatBlockDamage(data) =>
          nonnegative(
            data.dieResults.foldl(0, (total, dieResult) => total + dieResult)
              + data.flatModifier
          )
    }

  pure def baseStatBlockDamageComponentAtOrdinal(
    component: SelectedStatBlockDamageComponent,
    ordinal: int
  ): bool =
    match component.componentRole {
      | BaseStatBlockDamageComponent(data) => data.ordinal == ordinal
      | AdvantageBonusStatBlockDamageComponent => false
    }

  pure def canonicalBaseStatBlockDamageComponentRoles(
    first: SelectedStatBlockDamageComponent,
    remaining: List[SelectedStatBlockDamageComponent]
  ): bool = {
    val folded = remaining.foldl(
      { nextOrdinal: 2, legal: true },
      (acc, component) => {
        nextOrdinal: acc.nextOrdinal + 1,
        legal:
          acc.legal and
          baseStatBlockDamageComponentAtOrdinal(component, acc.nextOrdinal),
      }
    )
    all {
      baseStatBlockDamageComponentAtOrdinal(first, 1),
      folded.legal,
    }
  }

  pure def canonicalStatBlockAdvantageBonusDamage(
    firstBaseDamageComponent: SelectedStatBlockDamageComponent,
    advantageBonusDamage: StatBlockAdvantageBonusDamage
  ): bool =
    match advantageBonusDamage {
      | NoStatBlockAdvantageBonusDamage => true
      | SelectedStatBlockAdvantageBonusDamage(data) => all {
          data.component.componentRole == AdvantageBonusStatBlockDamageComponent,
          data.component.damageType == firstBaseDamageComponent.damageType,
        }
    }

  pure def allSelectedStatBlockDamageComponents(
    facts: StatBlockAttackResolutionFacts
  ): List[SelectedStatBlockDamageComponent] = {
    val baseComponents =
      List(facts.firstBaseDamageComponent).concat(facts.remainingBaseDamageComponents)
    match facts.advantageBonusDamage {
      | NoStatBlockAdvantageBonusDamage => baseComponents
      | SelectedStatBlockAdvantageBonusDamage(data) =>
          baseComponents.append(data.component)
    }
  }

  pure def activeSelectedStatBlockDamageComponents(
    facts: StatBlockAttackResolutionFacts
  ): List[SelectedStatBlockDamageComponent] = {
    val baseComponents =
      List(facts.firstBaseDamageComponent).concat(facts.remainingBaseDamageComponents)
    match facts.advantageBonusDamage {
      | NoStatBlockAdvantageBonusDamage => baseComponents
      | SelectedStatBlockAdvantageBonusDamage(data) =>
          if (facts.attackRollMode == AdvantageStatBlockAttackRoll)
            baseComponents.append(data.component)
          else
            baseComponents
    }
  }

  pure def selectedStatBlockDamageDefinitionsLegal(
    facts: StatBlockAttackResolutionFacts
  ): bool =
    allSelectedStatBlockDamageComponents(facts).foldl(
      true,
      (legal, component) =>
        legal and selectedStatBlockDamageDefinitionLegal(component.selectedAmount)
    )

  pure def activeSelectedStatBlockDamageRollsLegal(
    facts: StatBlockAttackResolutionFacts,
    critical: bool
  ): bool =
    activeSelectedStatBlockDamageComponents(facts).foldl(
      true,
      (legal, component) =>
        legal and selectedStatBlockDamageRollLegal(component.selectedAmount, critical)
    )

  pure def selectedStatBlockDamageComponentsByType(
    components: List[SelectedStatBlockDamageComponent]
  ): DamageByType =
    components.foldl(
      emptyDamageByType,
      (amounts, component) =>
        addDamageAmountForType(
          amounts,
          component.damageType,
          selectedStatBlockDamageAmount(component.selectedAmount)
        )
    )

  pure def selectedStatBlockDamageComponentsRawAmount(
    components: List[SelectedStatBlockDamageComponent]
  ): int =
    components.foldl(
      0,
      (total, component) =>
        total + selectedStatBlockDamageAmount(component.selectedAmount)
    )

  pure def statBlockHitRiderApplies(
    hitRider: StatBlockHitRider,
    attackHits: bool
  ): bool =
    if (not(attackHits)) false
    else
      match hitRider {
        | NoStatBlockHitRider => false
        | StatBlockProneIfTargetSizeAtMost(data) => all {
            not(data.targetProneImmune),
            statBlockCreatureSizeRank(data.targetSize)
              <= statBlockCreatureSizeRank(data.maximumTargetSize),
          }
      }

  pure def statBlockAttackResolutionFactsLegal(
    facts: StatBlockAttackResolutionFacts,
    outcome: AttackRollOutcome
  ): bool = all {
    legalAttackRollProcedureFacts(facts.attackRoll),
    canonicalBaseStatBlockDamageComponentRoles(
      facts.firstBaseDamageComponent,
      facts.remainingBaseDamageComponents
    ),
    canonicalStatBlockAdvantageBonusDamage(
      facts.firstBaseDamageComponent,
      facts.advantageBonusDamage
    ),
    selectedStatBlockDamageDefinitionsLegal(facts),
    not(outcome.hits)
      or activeSelectedStatBlockDamageRollsLegal(facts, outcome.critical),
  }

  // This identity-independent semantic owner intentionally excludes the
  // function-valued per-type map. The full resolver below consumes this exact
  // impact and adds only per-type target adjustments.
  pure def resolveStatBlockAttackImpact(
    facts: StatBlockAttackResolutionFacts
  ): StatBlockAttackImpact = {
    val outcome = resolveAttackRoll(facts.attackRoll)
    val factsLegal = statBlockAttackResolutionFactsLegal(facts, outcome)
    val activeComponents =
      if (factsLegal and outcome.hits)
        activeSelectedStatBlockDamageComponents(facts)
      else
        List()
    {
      factsLegal: factsLegal,
      attackHits: outcome.hits,
      critical: outcome.critical,
      rawDamageAmount:
        selectedStatBlockDamageComponentsRawAmount(activeComponents),
      targetProneApplied:
        factsLegal and statBlockHitRiderApplies(facts.hitRider, outcome.hits),
    }
  }

  pure def resolveStatBlockAttack(
    facts: StatBlockAttackResolutionFacts
  ): StatBlockAttackResolutionResult = {
    val impact = resolveStatBlockAttackImpact(facts)
    val damageByType =
      if (impact.factsLegal and impact.attackHits)
        selectedStatBlockDamageComponentsByType(
          activeSelectedStatBlockDamageComponents(facts)
        )
      else
        emptyDamageByType
    {
      impact: impact,
      activeDamageByType: damageByType,
      adjustedDamageAmount:
        totalDamageAfterTargetAdjustments(
          damageByType,
          facts.targetDamageAdjustments
        ),
    }
  }
}
