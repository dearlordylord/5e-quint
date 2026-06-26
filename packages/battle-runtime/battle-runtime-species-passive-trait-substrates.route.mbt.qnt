// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Character-Origins.md#Species Traits defines species
//   Size, Speed, and Special Traits as character-owned creature facts.
// - .references/srd-5.2.1/Character-Origins.md#Dragonborn and #Dwarf define
//   passive Resistance traits.
// - .references/srd-5.2.1/Character-Origins.md#Dwarf and #Halfling define
//   condition-scoped Saving Throw Advantage traits.
// - .references/srd-5.2.1/Character-Origins.md#Goliath defines Advantage on
//   Ability Checks made to end Grappled.
// - .references/srd-5.2.1/Character-Origins.md#Halfling defines movement
//   through larger creatures' spaces without stopping there.
// - .references/srd-5.2.1/Rules-Glossary.md#Grappling and #Resistance define
//   Grapple escape checks and Resistance damage halving.
// - UBIQUITOUS_LANGUAGE.md: Creature, Character Sheet, Damage, Saving Throw,
//   Ability Check, Grappled, Movement, Size, and Speed.
module battleRuntimeSpeciesPassiveTraitSubstratesRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type PassiveTraitSubstrateRouteStage =
    | Init
    | BaseStatsProjected
    | DamageAdjusted
    | SavingThrowRollModeProjected
    | AbilityCheckRollModeProjected
    | MovementTraversalAccepted
    | OccupiedStopRejected
    | MissingMovementPermissionRejected
    | SameSizeTraversalRejected

  var qStage: PassiveTraitSubstrateRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure def noHoles: Set[BattleHoleFamilyKind] = Set()

  pure def discoverSubstrate(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(subject, holes, owner)

  pure def resolveSubstrateWithoutFill(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(subject, holes, owner)

  pure def resolveSubstrateWithFill(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(subject, fill, holes, owner)

  pure def appendCreatureStatProjection(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverSubstrate(
          CreatureStatProjectionRouteSubject,
          noHoles,
          BattleCreatureStateOwner,
        )
      )
      .append(
        resolveSubstrateWithoutFill(
          CreatureStatProjectionRouteSubject,
          noHoles,
          BattleCreatureStateOwner,
        )
      )
      .append(
        resolveSubstrateWithoutFill(
          CreatureStatProjectionRouteSubject,
          noHoles,
          BattleMovementResourceOwner,
        )
      )

  pure def appendDamageAdjustment(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverSubstrate(
          PassiveDamageAdjustmentRouteSubject,
          noHoles,
          BattleDamageAdjustmentOwner,
        )
      )
      .append(
        resolveSubstrateWithoutFill(
          PassiveDamageAdjustmentRouteSubject,
          noHoles,
          BattleDamageAdjustmentOwner,
        )
      )

  pure def appendSavingThrowRollMode(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverSubstrate(
          PassiveSavingThrowRollModeRouteSubject,
          Set(SavingThrowOutcomeHoleKind),
          BattleSavingThrowRollModeOwner,
        )
      )
      .append(
        resolveSubstrateWithFill(
          PassiveSavingThrowRollModeRouteSubject,
          SavingThrowOutcomeFillKind,
          noHoles,
          BattleSavingThrowRollModeOwner,
        )
      )

  pure def appendAbilityCheckRollMode(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverSubstrate(
          PassiveAbilityCheckRollModeRouteSubject,
          Set(GrappleOutcomeHoleKind),
          BattleAbilityCheckRollModeOwner,
        )
      )
      .append(
        resolveSubstrateWithFill(
          PassiveAbilityCheckRollModeRouteSubject,
          GrappleOutcomeFillKind,
          noHoles,
          BattleAbilityCheckRollModeOwner,
        )
      )

  pure def appendAcceptedCreatureSpaceMovement(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverSubstrate(
          CreatureSpaceMovementPermissionRouteSubject,
          Set(MovementHoleKind),
          BattleCreatureSpaceMovementOwner,
        )
      )
      .append(
        resolveSubstrateWithFill(
          CreatureSpaceMovementPermissionRouteSubject,
          MovementFillKind,
          noHoles,
          BattleCreatureSpaceMovementOwner,
        )
      )
      .append(
        resolveSubstrateWithoutFill(
          CreatureSpaceMovementPermissionRouteSubject,
          noHoles,
          BattleMovementResourceOwner,
        )
      )

  pure def appendRejectedCreatureSpaceMovement(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverSubstrate(
          CreatureSpaceMovementPermissionRouteSubject,
          Set(MovementHoleKind),
          BattleCreatureSpaceMovementOwner,
        )
      )
      .append(
        resolveSubstrateWithFill(
          CreatureSpaceMovementPermissionRouteSubject,
          MovementFillKind,
          Set(MovementHoleKind),
          BattleCreatureSpaceMovementOwner,
        )
      )

  action init = all {
    qStage' = Init,
    qRoute' = List(routeStartBattle(BattleCreatureStateOwner)),
  }

  action doProjectSpeciesBaseSizeSpeed = all {
    qStage == Init,
    qStage' = BaseStatsProjected,
    qRoute' = appendCreatureStatProjection(qRoute),
  }

  action doRoutePassiveDamageAdjustment = all {
    qStage == BaseStatsProjected,
    qStage' = DamageAdjusted,
    qRoute' = appendDamageAdjustment(qRoute),
  }

  action doRoutePassiveSavingThrowRollMode = all {
    qStage == DamageAdjusted,
    qStage' = SavingThrowRollModeProjected,
    qRoute' = appendSavingThrowRollMode(qRoute),
  }

  action doRoutePassiveAbilityCheckRollMode = all {
    qStage == SavingThrowRollModeProjected,
    qStage' = AbilityCheckRollModeProjected,
    qRoute' = appendAbilityCheckRollMode(qRoute),
  }

  action doMoveThroughLargerCreatureSpace = all {
    qStage == AbilityCheckRollModeProjected,
    qStage' = MovementTraversalAccepted,
    qRoute' = appendAcceptedCreatureSpaceMovement(qRoute),
  }

  action doRejectOccupiedStop = all {
    qStage == MovementTraversalAccepted,
    qStage' = OccupiedStopRejected,
    qRoute' = appendRejectedCreatureSpaceMovement(qRoute),
  }

  action doRejectMissingMovementPermission = all {
    qStage == OccupiedStopRejected,
    qStage' = MissingMovementPermissionRejected,
    qRoute' = appendRejectedCreatureSpaceMovement(qRoute),
  }

  action doRejectSameSizeTraversal = all {
    qStage == MissingMovementPermissionRejected,
    qStage' = SameSizeTraversalRejected,
    qRoute' = appendRejectedCreatureSpaceMovement(qRoute),
  }

  action step = any {
    doProjectSpeciesBaseSizeSpeed,
    doRoutePassiveDamageAdjustment,
    doRoutePassiveSavingThrowRollMode,
    doRoutePassiveAbilityCheckRollMode,
    doMoveThroughLargerCreatureSpace,
    doRejectOccupiedStop,
    doRejectMissingMovementPermission,
    doRejectSameSizeTraversal,
  }
}
