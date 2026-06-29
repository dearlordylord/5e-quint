// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.EXACT_DAMAGE_ROUTE_BRIDGE

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls defines damage
//   dice, damage types, and applying damage to Hit Points.
// - .references/srd-5.2.1/Playing-the-Game.md#Critical Hits defines doubled
//   damage dice for critical hits.
// - .references/srd-5.2.1/Playing-the-Game.md#Saving Throws and Damage and
//   #Half Damage define no-damage and half-damage successful-save policies.
// - UBIQUITOUS_LANGUAGE.md defines Damage, Damage Type, Critical Hit, Attack
//   Roll, Saving Throw, Attack Damage Rider, Spell Effect, and Hit Points.
module battleRuntimeExactDamageDetailsRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import attackRollDamageDiceCore.* from "../shared-algebras/proofs/rule-core/attack-roll-damage-dice-core"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import spellDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-damage-projection-core"

  type ExactDamageRouteBridgeScenario =
    | FreshRouteBridge
    | AfterHitAttackDamageRouteBridge
    | AfterHitTimedDamageRouteBridge
    | WeaponDamageRiderDamageRouteBridge
    | HeldWeaponActiveEffectDamageRouteBridge
    | SpellHostedWeaponAttackDamageRouteBridge

  var qScenario: ExactDamageRouteBridgeScenario
  var qRoute: List[ReducerRouteEvent]
  var qComponentRoute: List[RuleCoreComponentRouteEvent]
  var qDamageType: RuleDamageType
  var qDamageAmount: int
  var qInstanceCount: int
  var qDamagePerInstance: int
  var qBaseDamageDice: int
  var qRolledDamageDiceCount: int
  var qDamageDieSize: int
  var qCritical: bool
  var qSuccessPolicy: SpellSaveSuccessDamagePolicy
  var qSavingThrowFailed: bool
  var qTargetInitialHp: int
  var qTargetHp: int
  var qDamageToHitPoints: int
  var qReplayIndex: int

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreSpellProcedureProfileOwner)
      .concat(ruleCoreComponentRoute(RuleCoreHitPointDamageOwner))

  pure def targetInitialHp: int = 20

  pure def targetVitals(hitPoints: int): CreatureVitals = {
    kind: PlayerCharacter,
    hitPoints: hitPoints,
    hitPointMaximum: targetInitialHp,
    temporaryHitPoints: 0,
    dead: false,
    unconscious: false,
  }

  pure def damageRoute(
    subject: ReducerRouteSubjectFamily,
    discoverOwner: ReducerRouteOwnerGroup,
    nextHoles: Set[BattleHoleFamilyKind],
    resolveOwner: ReducerRouteOwnerGroup,
  ): List[ReducerRouteEvent] =
    List(
      startRoute,
      routeDiscoverBattleActs(subject, Set(RolledDiceHoleKind), discoverOwner),
      routeResolveBattleSubject(
        subject,
        RolledDiceFillKind,
        nextHoles,
        resolveOwner,
      ),
    )

  action recordBridge(
    scenario: ExactDamageRouteBridgeScenario,
    route: List[ReducerRouteEvent],
    damageType: RuleDamageType,
    damageAmount: int,
    instanceCount: int,
    damagePerInstance: int,
    baseDamageDice: int,
    rolledDamageDiceCount: int,
    damageDieSize: int,
    critical: bool,
    successPolicy: SpellSaveSuccessDamagePolicy,
    savingThrowFailed: bool,
    applied: DamageResult,
    replayIndex: int,
  ): bool = all {
    qScenario' = scenario,
    qRoute' = route,
    qComponentRoute' = componentRouteEvidence,
    qDamageType' = damageType,
    qDamageAmount' = damageAmount,
    qInstanceCount' = instanceCount,
    qDamagePerInstance' = damagePerInstance,
    qBaseDamageDice' = baseDamageDice,
    qRolledDamageDiceCount' = rolledDamageDiceCount,
    qDamageDieSize' = damageDieSize,
    qCritical' = critical,
    qSuccessPolicy' = successPolicy,
    qSavingThrowFailed' = savingThrowFailed,
    qTargetInitialHp' = targetInitialHp,
    qTargetHp' = applied.vitals.hitPoints,
    qDamageToHitPoints' = applied.damageToHitPoints,
    qReplayIndex' = replayIndex,
  }

  action init = {
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), 0)
    all {
      recordBridge(
        FreshRouteBridge,
        List(startRoute),
        ForceDamage,
        0,
        0,
        0,
        0,
        0,
        0,
        false,
        SpellNoDamageOnSuccessfulSave,
        false,
        applied,
        0,
      ),
    }
  }

  action doAfterHitAttackDamageBridge = {
    val facts: DirectSpellDamageFacts = {
      damageType: ForceDamage,
      instanceCount: 3,
      damagePerInstance: 4,
      minimumInstanceCount: 1,
      maximumInstanceCount: 5,
      minimumDamagePerInstance: 2,
      maximumDamagePerInstance: 5,
    }
    val result = resolveDirectSpellDamage(facts)
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), result.damageAmount)
    all {
      qReplayIndex == 0,
      recordBridge(
        AfterHitAttackDamageRouteBridge,
        damageRoute(
          AfterHitDamageRiderRouteSubject,
          BattleHitPointOwner,
          Set(),
          BattleHitPointOwner,
        ),
        result.damageType,
        result.damageAmount,
        facts.instanceCount,
        facts.damagePerInstance,
        0,
        0,
        0,
        false,
        SpellNoDamageOnSuccessfulSave,
        false,
        applied,
        1,
      ),
    }
  }

  action doAfterHitTimedDamageBridge = {
    val facts: SpellSaveDamageBranchFacts = {
      damageType: FireDamage,
      successPolicy: SpellHalfDamageOnSuccessfulSave,
      failedSaveProjections: Set(),
      savingThrowFailed: false,
      damageRoll: 9,
    }
    val result = resolveSpellSaveDamageBranch(facts)
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), result.damageAmount)
    all {
      qReplayIndex == 1,
      recordBridge(
        AfterHitTimedDamageRouteBridge,
        damageRoute(
          AfterHitDamageRiderRouteSubject,
          BattleActiveEffectOwner,
          Set(AbilityCheckHoleKind),
          BattleHitPointOwner,
        ),
        result.damageType,
        result.damageAmount,
        0,
        0,
        0,
        0,
        0,
        false,
        facts.successPolicy,
        facts.savingThrowFailed,
        applied,
        2,
      ),
    }
  }

  action doWeaponDamageRiderDamageBridge = {
    val facts: DirectSpellDamageFacts = {
      damageType: ForceDamage,
      instanceCount: 3,
      damagePerInstance: 4,
      minimumInstanceCount: 1,
      maximumInstanceCount: 5,
      minimumDamagePerInstance: 2,
      maximumDamagePerInstance: 5,
    }
    val result = resolveDirectSpellDamage(facts)
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), result.damageAmount)
    all {
      qReplayIndex == 2,
      recordBridge(
        WeaponDamageRiderDamageRouteBridge,
        damageRoute(
          WeaponDamageRiderRouteSubject,
          BattleActiveEffectOwner,
          Set(),
          BattleHitPointOwner,
        ),
        result.damageType,
        result.damageAmount,
        facts.instanceCount,
        facts.damagePerInstance,
        0,
        0,
        0,
        false,
        SpellNoDamageOnSuccessfulSave,
        false,
        applied,
        3,
      ),
    }
  }

  action doHeldWeaponActiveEffectDamageBridge = {
    val facts: SpellAttackDamageBranchFacts = {
      attackRoll: { naturalD20: 20, total: 20, armorClass: 13, criticalThreshold: 20 },
      damageType: ColdDamage,
      hitProjections: Set(),
      baseDamageDice: 1,
      maximumBaseDamageDice: 4,
      rolledDamageDiceCount: 2,
      damageDieSize: 8,
      damageRoll: 7,
    }
    val result = resolveSpellAttackDamageBranch(facts)
    val attackOutcome = resolveAttackRoll(facts.attackRoll)
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), result.damageAmount)
    all {
      qReplayIndex == 3,
      recordBridge(
        HeldWeaponActiveEffectDamageRouteBridge,
        damageRoute(
          HeldWeaponActiveEffectRouteSubject,
          BattleActiveEffectOwner,
          Set(),
          BattleHitPointOwner,
        ),
        result.damageType,
        result.damageAmount,
        0,
        0,
        facts.baseDamageDice,
        facts.rolledDamageDiceCount,
        facts.damageDieSize,
        attackOutcome.critical,
        SpellNoDamageOnSuccessfulSave,
        false,
        applied,
        4,
      ),
    }
  }

  action doSpellHostedWeaponAttackDamageBridge = {
    val facts: SpellAttackDamageBranchFacts = {
      attackRoll: { naturalD20: 20, total: 20, armorClass: 13, criticalThreshold: 20 },
      damageType: ColdDamage,
      hitProjections: Set(),
      baseDamageDice: 1,
      maximumBaseDamageDice: 4,
      rolledDamageDiceCount: 2,
      damageDieSize: 8,
      damageRoll: 7,
    }
    val result = resolveSpellAttackDamageBranch(facts)
    val attackOutcome = resolveAttackRoll(facts.attackRoll)
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), result.damageAmount)
    all {
      qReplayIndex == 4,
      recordBridge(
        SpellHostedWeaponAttackDamageRouteBridge,
        damageRoute(
          SpellHostedWeaponAttackRouteSubject,
          BattleHitPointOwner,
          Set(),
          BattleHitPointOwner,
        ),
        result.damageType,
        result.damageAmount,
        0,
        0,
        facts.baseDamageDice,
        facts.rolledDamageDiceCount,
        facts.damageDieSize,
        attackOutcome.critical,
        SpellNoDamageOnSuccessfulSave,
        false,
        applied,
        5,
      ),
    }
  }

  action step = any {
    doAfterHitAttackDamageBridge,
    doAfterHitTimedDamageBridge,
    doWeaponDamageRiderDamageBridge,
    doHeldWeaponActiveEffectDamageBridge,
    doSpellHostedWeaponAttackDamageBridge,
  }
}
