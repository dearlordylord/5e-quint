// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Classes/Barbarian.md#Level 2: Danger Sense defines
//   Dexterity Saving Throw Advantage unless the creature has the Incapacitated
//   condition.
// - .references/srd-5.2.1/Playing-the-Game.md#D20 Tests and
//   #Advantage/Disadvantage define Saving Throws and roll mode.
// - .references/srd-5.2.1/Rules-Glossary.md#Incapacitated [Condition] defines
//   the condition fact that suppresses the passive roll mode.
// - UBIQUITOUS_LANGUAGE.md: Saving Throw, Advantage and Disadvantage, D20
//   Rolls, Condition, and Incapacitated.
module battleRuntimeDangerSenseSubstratesRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type DangerSenseSubstrateRouteStage =
    | Init
    | DexteritySavingThrowRollModeProjected
    | IncapacitatedConditionSuppressed

  var qStage: DangerSenseSubstrateRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure def noHoles: Set[BattleHoleFamilyKind] = Set()

  pure def discoverPassiveSavingThrowRollMode(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      PassiveSavingThrowRollModeRouteSubject,
      holes,
      owner,
    )

  pure def resolvePassiveSavingThrowRollMode(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      PassiveSavingThrowRollModeRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolvePassiveSavingThrowRollModeWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      PassiveSavingThrowRollModeRouteSubject,
      holes,
      owner,
    )

  action init = all {
    qStage' = Init,
    qRoute' = List(routeStartBattle(BattleSavingThrowRollModeOwner)),
  }

  action doRouteDangerSenseDexterityAdvantage = all {
    qStage == Init,
    qStage' = DexteritySavingThrowRollModeProjected,
    qRoute' = qRoute
      .append(
        discoverPassiveSavingThrowRollMode(
          Set(SavingThrowOutcomeHoleKind),
          BattleSavingThrowRollModeOwner,
        )
      )
      .append(
        resolvePassiveSavingThrowRollMode(
          SavingThrowOutcomeFillKind,
          noHoles,
          BattleSavingThrowRollModeOwner,
        )
      ),
  }

  action doRouteDangerSenseIncapacitatedSuppression = all {
    qStage == Init,
    qStage' = IncapacitatedConditionSuppressed,
    qRoute' = qRoute
      .append(
        discoverPassiveSavingThrowRollMode(
          noHoles,
          BattleSavingThrowRollModeOwner,
        )
      )
      .append(
        resolvePassiveSavingThrowRollModeWithoutFill(
          noHoles,
          BattleConditionLifecycleOwner,
        )
      ),
  }

  action step = any {
    doRouteDangerSenseDexterityAdvantage,
    doRouteDangerSenseIncapacitatedSuppression,
  }
}
