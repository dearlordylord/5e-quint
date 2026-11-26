// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ATTACK.ROLL_MODE_COLLECTOR

// RAW trace:
// - .references/srd-5.2.1/playing-the-game.md#Advantage/Disadvantage: like
//   sources don't stack, and any Advantage with any Disadvantage leaves a
//   normal roll. Every source below joins one combination.
// - .references/srd-5.2.1/rules-glossary.md#Grappled: "You have Disadvantage
//   on attack rolls against any target other than the grappler." An object is
//   never the grappler.
// - .references/srd-5.2.1/rules-glossary.md#Poisoned, #Prone, #Restrained:
//   the attacker's own Disadvantage, against any target.
// - .references/srd-5.2.1/playing-the-game.md#Unseen Attackers and Targets:
//   "When you make an attack roll against a target you can't see, you have
//   Disadvantage." It names any target. "When a creature can't see you, you
//   have Advantage on attack rolls against it" names a creature.
// - .references/srd-5.2.1/rules-glossary.md#Invisible: "Attack rolls against
//   you have Disadvantage, and your attack rolls have Advantage. If a creature
//   can somehow see you, you don't gain this benefit against that creature."
//   The attacker's Advantage is lost only to a creature that sees it, so it
//   reaches an object; the Disadvantage is on rolls against a creature.
//   #Hide [Action]: while hidden, you have the Invisible condition.
// - .references/srd-5.2.1/rules-glossary.md#Dodge [Action]: "Any attack roll
//   made against you has Disadvantage if you can see the attacker".
// - .references/srd-5.2.1/rules-glossary.md#Help [Action], "Assist an Attack
//   Roll.": Advantage on the ally's next attack roll against the chosen enemy.
// - .references/srd-5.2.1/rules-glossary.md#Paralyzed, #Petrified,
//   #Restrained, #Stunned, #Prone: sources from the target creature's own
//   conditions.
// - .references/srd-5.2.1/rules-glossary.md#Unconscious, "Attacks Affected.":
//   "Attack rolls against you have Advantage." Its implied Prone is the Prone
//   target source.
// - .references/srd-5.2.1/playing-the-game.md#Ranged Attacks: long range and
//   "Ranged Attacks in Close Combat" each impose Disadvantage on a ranged
//   attack roll, "with a weapon, a spell, or some other means".
//
// Scope: which general sources reach an attack roll, by what it's made
// against (a creature or an object). The condition, Prone and close-combat
// rules and the combination are owned by d20TestCircumstanceCore. None of
// these sources names the means, so the circumstances have no means field: a
// weapon attack and a spell attack in the same circumstances have the same
// mode, which is what the runtime collector makes every route agree on.

module attackRollModeCollectorCore {
  import d20TestCircumstanceCore.* from "./d20-test-circumstance-core"

  type AttackRollTargetKind =
    | CreatureAttackRollTarget
    | ObjectAttackRollTarget

  // The general sources this core owns, each named for what it is.
  type AttackRollModeSource =
    | AttackerConditionSource
    | GrappledAttackerSource
    | AttackerCannotSeeTargetSource
    | TargetCannotSeeAttackerSource
    | HiddenAttackerSource
    | HiddenTargetSource
    | DodgingTargetSource
    | HelpedAttackSource
    | TargetConditionSource
    | ProneTargetSource
    | UnconsciousTargetSource
    | LongRangeSource
    | RangedCloseCombatSource

  pure val attackRollModeSources: Set[AttackRollModeSource] = Set(
    AttackerConditionSource,
    GrappledAttackerSource,
    AttackerCannotSeeTargetSource,
    TargetCannotSeeAttackerSource,
    HiddenAttackerSource,
    HiddenTargetSource,
    DodgingTargetSource,
    HelpedAttackSource,
    TargetConditionSource,
    ProneTargetSource,
    UnconsciousTargetSource,
    LongRangeSource,
    RangedCloseCombatSource,
  )

  // A source whose RAW text names a creature on the other side reaches only a
  // creature target. The attacker's own conditions, Grappled, not seeing the
  // target, the hidden or Invisible attacker, and the Ranged Attacks rules name
  // "any target", the attacker's own rolls, or the attack.
  pure def sourceReachesTarget(
    source: AttackRollModeSource,
    targetKind: AttackRollTargetKind,
  ): bool =
    match targetKind {
      | CreatureAttackRollTarget => true
      | ObjectAttackRollTarget =>
        match source {
          | AttackerConditionSource => true
          | GrappledAttackerSource => true
          | AttackerCannotSeeTargetSource => true
          | HiddenAttackerSource => true
          | LongRangeSource => true
          | RangedCloseCombatSource => true
          | TargetCannotSeeAttackerSource => false
          | HiddenTargetSource => false
          | DodgingTargetSource => false
          | HelpedAttackSource => false
          | TargetConditionSource => false
          | ProneTargetSource => false
          | UnconsciousTargetSource => false
        }
    }

  // The table's and the battle's facts about one attack roll. A fact about the
  // target creature means nothing for an object target.
  type AttackRollCircumstances = {
    targetKind: AttackRollTargetKind,
    attacker: AttackerAttackRollConditions,
    target: TargetAttackRollConditions,
    targetUnconscious: bool,
    targetDistanceFeet: AttackRollTargetDistance,
    attackerGrappledByOtherThanTarget: bool,
    attackerCanSeeTarget: bool,
    targetCanSeeAttacker: bool,
    attackerHidden: bool,
    targetHidden: bool,
    targetDodging: bool,
    attackerHelpedAgainstTarget: bool,
    ranged: bool,
    longRange: bool,
    enemies: List[RangedAttackProximityEnemy],
  }

  pure def advantageIf(condition: bool): D20TestRollModeSources = {
    advantage: condition,
    disadvantage: false,
  }

  pure def disadvantageIf(condition: bool): D20TestRollModeSources = {
    advantage: false,
    disadvantage: condition,
  }

  pure val noSources: D20TestRollModeSources = {
    advantage: false,
    disadvantage: false,
  }

  pure def proneTargetSources(c: AttackRollCircumstances): D20TestRollModeSources =
    if (not(c.target.prone)) noSources
    else
      match proneAttackRollSource(c.targetDistanceFeet) {
        | ProneAttackRollSourceInvalidDistance => noSources
        | ProneAttackRollSourceResolved(data) => data.sources
      }

  pure def closeCombatImposesDisadvantage(c: AttackRollCircumstances): bool =
    c.ranged and c.enemies.foldl(false, (found, enemy) =>
      found or rangedAttackEnemyImposesDisadvantage(enemy)
    )

  // One source's own rule, before asking whether it reaches the target.
  pure def sourceRule(
    source: AttackRollModeSource,
    c: AttackRollCircumstances,
  ): D20TestRollModeSources =
    match source {
      | AttackerConditionSource => attackerConditionAttackRollSources(c.attacker)
      | GrappledAttackerSource => disadvantageIf(c.attackerGrappledByOtherThanTarget)
      | AttackerCannotSeeTargetSource => disadvantageIf(not(c.attackerCanSeeTarget))
      | TargetCannotSeeAttackerSource => advantageIf(not(c.targetCanSeeAttacker))
      | HiddenAttackerSource => advantageIf(c.attackerHidden)
      | HiddenTargetSource => disadvantageIf(c.targetHidden)
      | DodgingTargetSource => disadvantageIf(c.targetDodging)
      | HelpedAttackSource => advantageIf(c.attackerHelpedAgainstTarget)
      | TargetConditionSource => targetConditionAttackRollSources(c.target)
      | ProneTargetSource => proneTargetSources(c)
      | UnconsciousTargetSource => advantageIf(c.targetUnconscious)
      | LongRangeSource => disadvantageIf(c.ranged and c.longRange)
      | RangedCloseCombatSource => disadvantageIf(closeCombatImposesDisadvantage(c))
    }

  pure def sourceContribution(
    source: AttackRollModeSource,
    c: AttackRollCircumstances,
  ): D20TestRollModeSources =
    if (sourceReachesTarget(source, c.targetKind)) sourceRule(source, c)
    else noSources

  // Every source's contribution, combined before cancellation.
  pure def collectedAttackRollSources(
    c: AttackRollCircumstances,
  ): D20TestRollModeSources =
    attackRollModeSources.fold(noSources, (combined, source) => {
      val contribution = sourceContribution(source, c)
      {
        advantage: combined.advantage or contribution.advantage,
        disadvantage: combined.disadvantage or contribution.disadvantage,
      }
    })

  pure def collectedAttackRollMode(c: AttackRollCircumstances): D20TestRollMode =
    d20TestRollModeFromSources(collectedAttackRollSources(c))
}
