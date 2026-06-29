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

  type ExactDamageRouteBridgeScenario =
    | FreshRouteBridge
    | AfterHitAttackDamageRouteBridge
    | AfterHitTimedDamageRouteBridge
    | WeaponDamageRiderDamageRouteBridge
    | HeldWeaponActiveEffectDamageRouteBridge
    | SpellHostedWeaponAttackDamageRouteBridge

  type ExactDamageBridgeDamageType =
    | BridgeAcidDamage
    | BridgeColdDamage
    | BridgeFireDamage
    | BridgeForceDamage

  type ExactDamageBridgeSaveSuccessPolicy =
    | BridgeNoDamageOnSuccessfulSave
    | BridgeHalfDamageOnSuccessfulSave

  var qScenario: ExactDamageRouteBridgeScenario
  var qRoute: List[ReducerRouteEvent]
  var qComponentRoute: List[RuleCoreComponentRouteEvent]
  var qDamageType: ExactDamageBridgeDamageType
  var qDamageAmount: int
  var qInstanceCount: int
  var qDamagePerInstance: int
  var qBaseDamageDice: int
  var qRolledDamageDiceCount: int
  var qDamageDieSize: int
  var qCritical: bool
  var qSuccessPolicy: ExactDamageBridgeSaveSuccessPolicy
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

  pure def damageRoute(
    subject: ReducerRouteSubjectFamily,
    discoverOwner: ReducerRouteOwnerGroup,
    resolveOwner: ReducerRouteOwnerGroup,
  ): List[ReducerRouteEvent] =
    List(
      startRoute,
      routeDiscoverBattleActs(subject, Set(RolledDiceHoleKind), discoverOwner),
      routeResolveBattleSubject(
        subject,
        RolledDiceFillKind,
        Set(),
        resolveOwner,
      ),
    )

  action recordBridge(
    scenario: ExactDamageRouteBridgeScenario,
    route: List[ReducerRouteEvent],
    damageType: ExactDamageBridgeDamageType,
    damageAmount: int,
    instanceCount: int,
    damagePerInstance: int,
    baseDamageDice: int,
    rolledDamageDiceCount: int,
    damageDieSize: int,
    critical: bool,
    successPolicy: ExactDamageBridgeSaveSuccessPolicy,
    savingThrowFailed: bool,
    targetHp: int,
    damageToHitPoints: int,
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
    qTargetInitialHp' = 20,
    qTargetHp' = targetHp,
    qDamageToHitPoints' = damageToHitPoints,
    qReplayIndex' = replayIndex,
  }

  action init = recordBridge(
    FreshRouteBridge,
    List(startRoute),
    BridgeForceDamage,
    0,
    0,
    0,
    0,
    0,
    0,
    false,
    BridgeNoDamageOnSuccessfulSave,
    false,
    20,
    0,
    0,
  )

  action doAfterHitAttackDamageBridge = all {
    qReplayIndex == 0,
    recordBridge(
      AfterHitAttackDamageRouteBridge,
      damageRoute(
        AfterHitDamageRiderRouteSubject,
        BattleHitPointOwner,
        BattleHitPointOwner,
      ),
      BridgeForceDamage,
      12,
      3,
      4,
      0,
      0,
      0,
      false,
      BridgeNoDamageOnSuccessfulSave,
      false,
      8,
      12,
      1,
    ),
  }

  action doAfterHitTimedDamageBridge = all {
    qReplayIndex == 1,
    recordBridge(
      AfterHitTimedDamageRouteBridge,
      damageRoute(
        AfterHitDamageRiderRouteSubject,
        BattleActiveEffectOwner,
        BattleHitPointOwner,
      ),
      BridgeFireDamage,
      4,
      0,
      0,
      0,
      0,
      0,
      false,
      BridgeHalfDamageOnSuccessfulSave,
      false,
      16,
      4,
      2,
    ),
  }

  action doWeaponDamageRiderDamageBridge = all {
    qReplayIndex == 2,
    recordBridge(
      WeaponDamageRiderDamageRouteBridge,
      damageRoute(
        WeaponDamageRiderRouteSubject,
        BattleActiveEffectOwner,
        BattleHitPointOwner,
      ),
      BridgeForceDamage,
      12,
      3,
      4,
      0,
      0,
      0,
      false,
      BridgeNoDamageOnSuccessfulSave,
      false,
      8,
      12,
      3,
    ),
  }

  action doHeldWeaponActiveEffectDamageBridge = all {
    qReplayIndex == 3,
    recordBridge(
      HeldWeaponActiveEffectDamageRouteBridge,
      damageRoute(
        HeldWeaponActiveEffectRouteSubject,
        BattleActiveEffectOwner,
        BattleHitPointOwner,
      ),
      BridgeColdDamage,
      7,
      0,
      0,
      1,
      2,
      8,
      true,
      BridgeNoDamageOnSuccessfulSave,
      false,
      13,
      7,
      4,
    ),
  }

  action doSpellHostedWeaponAttackDamageBridge = all {
    qReplayIndex == 4,
    recordBridge(
      SpellHostedWeaponAttackDamageRouteBridge,
      damageRoute(
        SpellHostedWeaponAttackRouteSubject,
        BattleHitPointOwner,
        BattleHitPointOwner,
      ),
      BridgeColdDamage,
      7,
      0,
      0,
      1,
      2,
      8,
      true,
      BridgeNoDamageOnSuccessfulSave,
      false,
      13,
      7,
      5,
    ),
  }

  action step = any {
    doAfterHitAttackDamageBridge,
    doAfterHitTimedDamageBridge,
    doWeaponDamageRiderDamageBridge,
    doHeldWeaponActiveEffectDamageBridge,
    doSpellHostedWeaponAttackDamageBridge,
  }
}
