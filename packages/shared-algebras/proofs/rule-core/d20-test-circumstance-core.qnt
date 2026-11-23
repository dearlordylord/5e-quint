// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE BATTLE.ATTACK.PRONE_ATTACKER_ROLL_MODE BATTLE.ATTACK.RANGED_CLOSE_COMBAT_ROLL_MODE BATTLE.ATTACK.CONDITION_ROLL_MODE

// RAW trace:
// - .references/srd-5.2.1/playing-the-game.md#D20 Tests defines Ability
//   Checks, Saving Throws, and Attack Rolls as the three D20 Test kinds.
// - .references/srd-5.2.1/playing-the-game.md#Advantage/Disadvantage says the
//   GM can decide that circumstances grant Advantage or impose Disadvantage.
// - The same section says like sources do not stack and any Advantage plus
//   any Disadvantage produces a normal one-d20 roll.
// - .references/srd-5.2.1/rules-glossary.md#Prone says an attack against a
//   Prone target has Advantage within 5 feet and Disadvantage otherwise.
// - The same Prone entry says a Prone creature has Disadvantage on attack
//   rolls, at any distance, so a Prone attacker supplies a Disadvantage source
//   that combines with the target's sources before cancellation.
// - .references/srd-5.2.1/playing-the-game.md#Ranged Attacks in Close Combat
//   says a ranged attack roll, with a weapon, a spell, or some other means,
//   has Disadvantage if the attacker is within 5 feet of an enemy who can see
//   it and doesn't have the Incapacitated condition. Any one such enemy is a
//   Disadvantage source that combines with the other sources, including a
//   Prone target's, before cancellation.

// - .references/srd-5.2.1/rules-glossary.md#Restrained says "Attack rolls
//   against you have Advantage, and your attack rolls have Disadvantage."
// - .references/srd-5.2.1/rules-glossary.md#Paralyzed, #Petrified and
//   #Stunned each say "Attack rolls against you have Advantage." These target
//   sources and the attacker's own Poisoned, Prone and Restrained sources
//   hold at any distance and join every other source before cancellation.
// - .references/srd-5.2.1/rules-glossary.md#Unconscious says attack rolls
//   against an Unconscious target have Advantage; Unconscious also implies
//   Prone, so both sources are combined before cancellation.
// - UBIQUITOUS_LANGUAGE.md defines D20 Test, Advantage, Disadvantage, and
//   Table Decision.
//
// Scope: this module owns source combination and exact pending-test binding.
// It does not model d20 faces, totals, target numbers, or success/failure.
// Update this module before changing the executable source-combination or
// request-admission boundary.

module d20TestCircumstanceCore {
  type D20TestKind =
    | AbilityCheckD20Test
    | SavingThrowD20Test
    | AttackRollD20Test

  type D20TestRollMode =
    | NormalD20TestRoll
    | AdvantageD20TestRoll
    | DisadvantageD20TestRoll

  type D20TestRollModeSources = {
    advantage: bool,
    disadvantage: bool,
  }

  type AttackRollTargetDistance = int

  pure val proneAttackAdvantageDistanceFeet: AttackRollTargetDistance = 5

  type ProneAttackRollSourceResult =
    | ProneAttackRollSourceInvalidDistance
    | ProneAttackRollSourceResolved({ sources: D20TestRollModeSources })

  type AttackRollModeResult =
    | AttackRollModeInvalidDistance
    | AttackRollModeResolved({ mode: D20TestRollMode })

  type TableD20TestCircumstanceSource =
    | TableGrantsAdvantage
    | TableImposesDisadvantage

  type D20TestRequestRef = {
    lineage: int,
    testOrdinal: int,
    testKind: D20TestKind,
  }

  type TableD20TestCircumstanceDecision = {
    requestRef: D20TestRequestRef,
    source: TableD20TestCircumstanceSource,
  }

  pure def d20TestRollModeFromSources(
    sources: D20TestRollModeSources,
  ): D20TestRollMode =
    if (sources.advantage == sources.disadvantage)
      NormalD20TestRoll
    else if (sources.advantage)
      AdvantageD20TestRoll
    else
      DisadvantageD20TestRoll

  pure def addTableD20TestCircumstanceSource(
    mechanicalSources: D20TestRollModeSources,
    tableSource: TableD20TestCircumstanceSource,
  ): D20TestRollModeSources =
    match tableSource {
      | TableGrantsAdvantage => {
          ...mechanicalSources,
          advantage: true,
        }
      | TableImposesDisadvantage => {
          ...mechanicalSources,
          disadvantage: true,
        }
    }

  pure def d20TestRollModeWithTableCircumstance(
    mechanicalSources: D20TestRollModeSources,
    tableSource: TableD20TestCircumstanceSource,
  ): D20TestRollMode =
    d20TestRollModeFromSources(
      addTableD20TestCircumstanceSource(mechanicalSources, tableSource)
    )

  pure def proneAttackRollSource(
    distance: AttackRollTargetDistance,
  ): ProneAttackRollSourceResult =
    if (distance < 0) ProneAttackRollSourceInvalidDistance
    else ProneAttackRollSourceResolved({
      sources: {
        advantage: distance <= proneAttackAdvantageDistanceFeet,
        disadvantage: distance > proneAttackAdvantageDistanceFeet,
      },
    })

  pure def d20TestRollModeWithProneTarget(
    mechanicalSources: D20TestRollModeSources,
    distance: AttackRollTargetDistance,
  ): AttackRollModeResult =
    match proneAttackRollSource(distance) {
      | ProneAttackRollSourceInvalidDistance =>
        AttackRollModeInvalidDistance
      | ProneAttackRollSourceResolved(data) =>
        AttackRollModeResolved({
          mode: d20TestRollModeFromSources({
            advantage: mechanicalSources.advantage or data.sources.advantage,
            disadvantage: mechanicalSources.disadvantage or data.sources.disadvantage,
          }),
        })
    }

  pure val proneAttackerAttackRollSources: D20TestRollModeSources = {
    advantage: false,
    disadvantage: true,
  }

  pure def withProneAttacker(
    mechanicalSources: D20TestRollModeSources,
  ): D20TestRollModeSources = {
    advantage: mechanicalSources.advantage or proneAttackerAttackRollSources.advantage,
    disadvantage: mechanicalSources.disadvantage or proneAttackerAttackRollSources.disadvantage,
  }

  pure def d20TestRollModeWithProneAttacker(
    mechanicalSources: D20TestRollModeSources,
  ): D20TestRollMode =
    d20TestRollModeFromSources(withProneAttacker(mechanicalSources))

  pure def d20TestRollModeWithProneAttackerAndProneTarget(
    mechanicalSources: D20TestRollModeSources,
    distance: AttackRollTargetDistance,
  ): AttackRollModeResult =
    d20TestRollModeWithProneTarget(withProneAttacker(mechanicalSources), distance)

  pure val rangedAttackEnemyProximityFeet: AttackRollTargetDistance = 5

  // An enemy the table lists for a ranged attack: its distance from the
  // attacker, whether it can see the attacker, and whether it's Incapacitated.
  type RangedAttackProximityEnemy = {
    distanceFeet: AttackRollTargetDistance,
    canSeeAttacker: bool,
    incapacitated: bool,
  }

  pure def rangedAttackEnemyImposesDisadvantage(
    enemy: RangedAttackProximityEnemy,
  ): bool = all {
    enemy.distanceFeet <= rangedAttackEnemyProximityFeet,
    enemy.canSeeAttacker,
    not(enemy.incapacitated),
  }

  pure def withRangedAttackCloseCombat(
    mechanicalSources: D20TestRollModeSources,
    enemies: List[RangedAttackProximityEnemy],
  ): D20TestRollModeSources = {
    advantage: mechanicalSources.advantage,
    disadvantage: mechanicalSources.disadvantage
      or enemies.foldl(false, (found, enemy) =>
        found or rangedAttackEnemyImposesDisadvantage(enemy)
      ),
  }

  pure def d20TestRollModeWithRangedAttackCloseCombat(
    mechanicalSources: D20TestRollModeSources,
    enemies: List[RangedAttackProximityEnemy],
  ): D20TestRollMode =
    d20TestRollModeFromSources(
      withRangedAttackCloseCombat(mechanicalSources, enemies)
    )

  pure def d20TestRollModeWithRangedAttackCloseCombatAndProneTarget(
    mechanicalSources: D20TestRollModeSources,
    enemies: List[RangedAttackProximityEnemy],
    distance: AttackRollTargetDistance,
  ): AttackRollModeResult =
    d20TestRollModeWithProneTarget(
      withRangedAttackCloseCombat(mechanicalSources, enemies),
      distance,
    )

  // The attacker's conditions that give its own attack rolls Disadvantage.
  type AttackerAttackRollConditions = {
    poisoned: bool,
    prone: bool,
    restrained: bool,
  }

  // The target's conditions that bear on attack rolls against it: Prone's
  // distance source, and the distance-independent Advantage sources.
  type TargetAttackRollConditions = {
    paralyzed: bool,
    petrified: bool,
    prone: bool,
    restrained: bool,
    stunned: bool,
  }

  pure val noAttackerAttackRollConditions: AttackerAttackRollConditions = {
    poisoned: false,
    prone: false,
    restrained: false,
  }

  pure val noTargetAttackRollConditions: TargetAttackRollConditions = {
    paralyzed: false,
    petrified: false,
    prone: false,
    restrained: false,
    stunned: false,
  }

  pure def attackerConditionAttackRollSources(
    attacker: AttackerAttackRollConditions,
  ): D20TestRollModeSources = {
    advantage: false,
    disadvantage: attacker.poisoned or attacker.prone or attacker.restrained,
  }

  pure def targetConditionAttackRollSources(
    target: TargetAttackRollConditions,
  ): D20TestRollModeSources = {
    advantage: target.paralyzed
      or target.petrified
      or target.restrained
      or target.stunned,
    disadvantage: false,
  }

  pure def withConditionSources(
    mechanicalSources: D20TestRollModeSources,
    attacker: AttackerAttackRollConditions,
    target: TargetAttackRollConditions,
  ): D20TestRollModeSources = {
    advantage: mechanicalSources.advantage
      or attackerConditionAttackRollSources(attacker).advantage
      or targetConditionAttackRollSources(target).advantage,
    disadvantage: mechanicalSources.disadvantage
      or attackerConditionAttackRollSources(attacker).disadvantage
      or targetConditionAttackRollSources(target).disadvantage,
  }

  // Every condition source, with a Prone target's distance source only when
  // the target is Prone.
  pure def d20TestRollModeWithConditions(
    mechanicalSources: D20TestRollModeSources,
    attacker: AttackerAttackRollConditions,
    target: TargetAttackRollConditions,
    distance: AttackRollTargetDistance,
  ): AttackRollModeResult =
    if (target.prone)
      d20TestRollModeWithProneTarget(
        withConditionSources(mechanicalSources, attacker, target),
        distance,
      )
    else if (distance < 0)
      AttackRollModeInvalidDistance
    else
      AttackRollModeResolved({
        mode: d20TestRollModeFromSources(
          withConditionSources(mechanicalSources, attacker, target)
        ),
      })

  pure def d20TestRollModeWithUnconsciousTarget(
    mechanicalSources: D20TestRollModeSources,
    distance: AttackRollTargetDistance,
  ): AttackRollModeResult =
    d20TestRollModeWithProneTarget({
      ...mechanicalSources,
      advantage: true,
    }, distance)

  pure def attackRollModeMatches(
    result: AttackRollModeResult,
    expected: D20TestRollMode,
  ): bool =
    match result {
      | AttackRollModeInvalidDistance => false
      | AttackRollModeResolved(data) => data.mode == expected
    }

  pure def tableD20TestCircumstanceDecisionMatches(
    pendingRequestRef: D20TestRequestRef,
    decision: TableD20TestCircumstanceDecision,
  ): bool =
    decision.requestRef == pendingRequestRef
}
