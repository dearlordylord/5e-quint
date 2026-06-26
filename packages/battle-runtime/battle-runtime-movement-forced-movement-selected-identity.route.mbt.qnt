// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Dash and
//   .references/srd-5.2.1/Rules-Glossary.md#Dash [Action] define Dash as
//   extra Movement equal to the chosen Speed.
// - .references/srd-5.2.1/Playing-the-Game.md#Movement and Position and
//   .references/srd-5.2.1/Rules-Glossary.md#Speed define Movement as spending
//   a turn budget derived from Speed.
// - .references/srd-5.2.1/Rules-Glossary.md#Speed, #Climb Speed,
//   #Swim Speed, and #Fly Speed define special-speed facts and movement-mode
//   choice.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Command and
//   #Dissonant Whispers define spell effects that require target movement.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Expeditious Retreat
//   defines a spell-granted Dash action.
// - UBIQUITOUS_LANGUAGE.md: Speed, Movement, Bonus Action, Reaction, Spell
//   Effect, and Boundary Crossing.
module battleRuntimeMovementForcedMovementSelectedIdentityRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type MovementForcedMovementRouteStage =
    | Init
    | DissonantForcedReactionMovement
    | CommandFleeMovement
    | ExpeditiousRetreatDash
    | RovingSpecialSpeedMovement
    | BarbarianFastMovementDash
    | MonkUnarmoredMovementDash

  var qStage: MovementForcedMovementRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val forcedSpellMovementHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind, SavingThrowOutcomeHoleKind, RolledDiceHoleKind, MovementHoleKind)
  pure val commandMovementHoles: Set[BattleHoleFamilyKind] =
    Set(SpellTargetListHoleKind, CommandOptionChoiceHoleKind, SavingThrowOutcomeHoleKind, MovementHoleKind)
  pure val movementHoles: Set[BattleHoleFamilyKind] =
    Set(MovementHoleKind)

  pure def discoverRouteSubject(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(subject, holes, owner)

  pure def resolveRouteSubjectWithMovementFill(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      subject,
      MovementFillKind,
      holes,
      owner,
    )

  pure def resolveRouteSubjectWithoutFill(
    subject: ReducerRouteSubjectFamily,
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(subject, noHoles, owner)

  pure def appendForcedMovementRoute(
    route: List[ReducerRouteEvent],
    holes: Set[BattleHoleFamilyKind],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverRouteSubject(
          ForcedMovementRouteSubject,
          holes,
          BattleSpellSlotAndActionEconomyOwner,
        )
      )
      .append(
        resolveRouteSubjectWithMovementFill(
          ForcedMovementRouteSubject,
          noHoles,
          BattleMovementResourceOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          ForcedMovementRouteSubject,
          BattleActionEconomyOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          ForcedMovementRouteSubject,
          BattleInterruptStackOwner,
        )
      )

  pure def appendSpellGrantedDashRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverRouteSubject(
          MovementResourceRouteSubject,
          noHoles,
          BattleSpellSlotAndActionEconomyOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          MovementResourceRouteSubject,
          BattleSpellSlotAndActionEconomyOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          MovementResourceRouteSubject,
          BattleActiveEffectOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          MovementResourceRouteSubject,
          BattleMovementResourceOwner,
        )
      )

  pure def appendPassiveSpeedDashRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverRouteSubject(
          MovementResourceRouteSubject,
          noHoles,
          BattleActionEconomyOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          MovementResourceRouteSubject,
          BattleActionEconomyOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          MovementResourceRouteSubject,
          BattleCreatureStateOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          MovementResourceRouteSubject,
          BattleMovementResourceOwner,
        )
      )

  pure def appendSpecialSpeedMovementRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        discoverRouteSubject(
          SpecialSpeedProjectionRouteSubject,
          noHoles,
          BattleCreatureStateOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          SpecialSpeedProjectionRouteSubject,
          BattleCreatureStateOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          SpecialSpeedProjectionRouteSubject,
          BattleMovementResourceOwner,
        )
      )
      .append(
        discoverRouteSubject(
          MovementResourceRouteSubject,
          movementHoles,
          BattleMovementResourceOwner,
        )
      )
      .append(
        resolveRouteSubjectWithMovementFill(
          MovementResourceRouteSubject,
          noHoles,
          BattleMovementResourceOwner,
        )
      )

  action init = all {
    qStage' = Init,
    qRoute' = List(routeStartBattle(BattleActionEconomyOwner)),
  }

  action doDissonantWhispersForcedReactionMovement = all {
    qStage == Init,
    qStage' = DissonantForcedReactionMovement,
    qRoute' = appendForcedMovementRoute(qRoute, forcedSpellMovementHoles),
  }

  action doCommandFleeTargetTurn = all {
    qStage == Init,
    qStage' = CommandFleeMovement,
    qRoute' = appendForcedMovementRoute(qRoute, commandMovementHoles)
      .append(
        resolveRouteSubjectWithoutFill(
          ForcedMovementRouteSubject,
          BattleActiveEffectOwner,
        )
      )
      .append(
        resolveRouteSubjectWithoutFill(
          ForcedMovementRouteSubject,
          BattleTurnBoundaryOwner,
        )
      ),
  }

  action doExpeditiousRetreatImmediateDash = all {
    qStage == Init,
    qStage' = ExpeditiousRetreatDash,
    qRoute' = appendSpellGrantedDashRoute(qRoute),
  }

  action doRangerRovingClimbSwimMovement = all {
    qStage == Init,
    qStage' = RovingSpecialSpeedMovement,
    qRoute' = appendSpecialSpeedMovementRoute(qRoute),
  }

  action doBarbarianFastMovementDash = all {
    qStage == Init,
    qStage' = BarbarianFastMovementDash,
    qRoute' = appendPassiveSpeedDashRoute(qRoute),
  }

  action doMonkUnarmoredMovementDash = all {
    qStage == Init,
    qStage' = MonkUnarmoredMovementDash,
    qRoute' = appendPassiveSpeedDashRoute(qRoute),
  }

  action step = any {
    doDissonantWhispersForcedReactionMovement,
    doCommandFleeTargetTurn,
    doExpeditiousRetreatImmediateDash,
    doRangerRovingClimbSwimMovement,
    doBarbarianFastMovementDash,
    doMonkUnarmoredMovementDash,
  }
}
