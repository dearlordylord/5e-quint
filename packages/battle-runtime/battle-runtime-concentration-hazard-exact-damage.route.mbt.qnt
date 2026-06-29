// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls defines spell
//   damage dice and damage amounts.
// - .references/srd-5.2.1/Playing-the-Game.md#Saving Throws and Damage and
//   #Half Damage define saving-throw damage policies.
// - .references/srd-5.2.1/Playing-the-Game.md#Hit Points and
//   .references/srd-5.2.1/Rules-Glossary.md#Hit Points define Hit Point loss.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration defines
//   concentration-backed effect persistence and teardown.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Flaming Sphere and
//   Descriptions-M-P.md#Moonbeam provide SRD concentration-backed area hazards
//   with save-triggered Hit Point damage.
// - UBIQUITOUS_LANGUAGE.md: Concentration, Spell Effect, Area of Effect,
//   Saving Throw, Damage, Damage Type, and Hit Points.
module battleRuntimeConcentrationHazardExactDamageRouteMbt {
  import battleRuntimeSpatialEffectRouteFacts.* from "./battle-runtime-spatial-effect-route-facts"
  import battleRuntimeSpatialEffectRouteSurfaces.* from "./battle-runtime-spatial-effect-route-surfaces"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import ruleCoreComponentRoute.* from "./rule-core-component-route"

  type ConcentrationHazardExactDamageScenario =
    | FreshConcentrationHazardExactDamageRoute
    | FailedSaveFullHitPointDamageRoute
    | SuccessfulSaveHalfHitPointDamageRoute

  type ConcentrationHazardDamageType =
    | ConcentrationHazardFireDamage
    | ConcentrationHazardRadiantDamage

  type ConcentrationHazardSaveSuccessDamagePolicy =
    | ConcentrationHazardNoDamageOnSuccessfulSave
    | ConcentrationHazardHalfDamageOnSuccessfulSave

  type ConcentrationHazardExactDamageFacts = {
    damageType: ConcentrationHazardDamageType,
    successPolicy: ConcentrationHazardSaveSuccessDamagePolicy,
    savingThrowFailed: bool,
    damageDiceCount: int,
    damageDieSize: int,
    damageRoll: int,
    damageAmount: int,
    targetInitialHp: int,
    targetHp: int,
    damageToHitPoints: int,
  }

  var qScenario: ConcentrationHazardExactDamageScenario
  var qRoute: List[ReducerRouteEvent]
  var qSpatialFacts: List[SpatialEffectRouteFact]
  var qComponentRoute: List[RuleCoreComponentRouteEvent]
  var qDamageFacts: ConcentrationHazardExactDamageFacts
  var qReplayIndex: int

  pure def targetInitialHp: int = 20

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreSpellProcedureProfileOwner)
      .concat(ruleCoreComponentRoute(RuleCoreHitPointDamageOwner))

  pure def initialDamageFacts: ConcentrationHazardExactDamageFacts = {
    damageType: ConcentrationHazardFireDamage,
    successPolicy: ConcentrationHazardHalfDamageOnSuccessfulSave,
    savingThrowFailed: false,
    damageDiceCount: 0,
    damageDieSize: 0,
    damageRoll: 0,
    damageAmount: 0,
    targetInitialHp: targetInitialHp,
    targetHp: targetInitialHp,
    damageToHitPoints: 0,
  }

  pure def exactDamageRoute: List[ReducerRouteEvent] =
    List(spatialEffectStartRoute)
      .concat(spatialEffectConcentrationBackedAreaHazardAdmissionRoute)
      .concat(spatialEffectHazardSavingThrowDamageRoute)

  pure def exactDamageSpatialFacts: List[SpatialEffectRouteFact] =
    spatialEffectConcentrationBackedAreaHazardBaseFacts
      .concat(spatialEffectHazardSavingThrowDamageFacts)

  action recordRoute(
    scenario: ConcentrationHazardExactDamageScenario,
    route: List[ReducerRouteEvent],
    spatialFacts: List[SpatialEffectRouteFact],
    damageFacts: ConcentrationHazardExactDamageFacts,
    replayIndex: int,
  ): bool = all {
    qScenario' = scenario,
    qRoute' = route,
    qSpatialFacts' = spatialFacts,
    qComponentRoute' = componentRouteEvidence,
    qDamageFacts' = damageFacts,
    qReplayIndex' = replayIndex,
  }

  action init = recordRoute(
    FreshConcentrationHazardExactDamageRoute,
    List(spatialEffectStartRoute),
    List(),
    initialDamageFacts,
    0,
  )

  action doFailedSaveFullHitPointDamageRoute = all {
    qReplayIndex == 0,
    recordRoute(
      FailedSaveFullHitPointDamageRoute,
      exactDamageRoute,
      exactDamageSpatialFacts,
      {
        damageType: ConcentrationHazardFireDamage,
        successPolicy: ConcentrationHazardHalfDamageOnSuccessfulSave,
        savingThrowFailed: true,
        damageDiceCount: 2,
        damageDieSize: 6,
        damageRoll: 7,
        damageAmount: 7,
        targetInitialHp: targetInitialHp,
        targetHp: 13,
        damageToHitPoints: 7,
      },
      1,
    ),
  }

  action doSuccessfulSaveHalfHitPointDamageRoute = all {
    qReplayIndex == 1,
    recordRoute(
      SuccessfulSaveHalfHitPointDamageRoute,
      exactDamageRoute,
      exactDamageSpatialFacts,
      {
        damageType: ConcentrationHazardRadiantDamage,
        successPolicy: ConcentrationHazardHalfDamageOnSuccessfulSave,
        savingThrowFailed: false,
        damageDiceCount: 2,
        damageDieSize: 10,
        damageRoll: 11,
        damageAmount: 5,
        targetInitialHp: targetInitialHp,
        targetHp: 15,
        damageToHitPoints: 5,
      },
      2,
    ),
  }

  action doStutterAfterTerminalSurface = all {
    qReplayIndex == 2,
    recordRoute(
      qScenario,
      qRoute,
      qSpatialFacts,
      qDamageFacts,
      qReplayIndex,
    ),
  }

  action step = any {
    doFailedSaveFullHitPointDamageRoute,
    doSuccessfulSaveHalfHitPointDamageRoute,
    doStutterAfterTerminalSurface,
  }
}
