// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Ability Checks: an Ability
//   Check compares a total against a Difficulty Class.
// - .references/srd-5.2.1/Playing-the-Game.md#Actions and
//   .references/srd-5.2.1/Rules-Glossary.md#Search [Action]: Search is a
//   Wisdom check that discerns something that is not obvious.
// - .references/srd-5.2.1/Rules-Glossary.md#Hide [Action]: a hidden
//   creature's Hide total is the DC to find it with Wisdom (Perception).
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Guidance and
//   #Enhance Ability define skill-choice and ability-choice Ability Check
//   modifier effects.
// - UBIQUITOUS_LANGUAGE.md: Ability Check, Skill, Action, Search, Spell
//   Invocation, Spell Effect, and Concentration.
module battleRuntimeAbilityCheckChoiceSearchRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type AbilityCheckChoiceSearchRouteSurface =
    | AbilityCheckChoiceSearchInit
    | SearchTargetChoiceOpen
    | SearchAbilityCheckOpen
    | SearchInvalidTargetRejected
    | SearchInvalidAbilityFillRejected
    | SearchFails
    | SearchSucceeds
    | GuidanceSkillChoiceOpen
    | GuidanceInvalidAbilityFillRejected
    | GuidanceSkillAthletics
    | EnhanceAbilityChoiceOpen
    | EnhanceAbilityInvalidSkillFillRejected
    | EnhanceAbilityDex

  var qSurface: AbilityCheckChoiceSearchRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def noHoles: Set[BattleHoleFamilyKind] = Set()

  pure def searchDiscover(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(AbilityCheckSearchRouteSubject, holes, owner)

  pure def searchResolve(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(AbilityCheckSearchRouteSubject, fill, holes, owner)

  pure def rollModifierDiscover(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(RollModifierEffectRouteSubject, holes, owner)

  pure def rollModifierResolve(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(RollModifierEffectRouteSubject, fill, holes, owner)

  pure def rollModifierResolveWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      RollModifierEffectRouteSubject,
      noHoles,
      owner,
    )

  pure def searchTargetChoiceRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      searchDiscover(Set(TargetChoiceHoleKind), BattleActionEconomyOwner),
    )

  pure def searchAbilityCheckRoute: List[ReducerRouteEvent] =
    searchTargetChoiceRoute
      .append(
        searchResolve(
          TargetChoiceFillKind,
          Set(AbilityCheckHoleKind),
          BattleTargetSelectionOwner,
        )
      )

  pure def searchInvalidTargetRoute: List[ReducerRouteEvent] =
    searchTargetChoiceRoute
      .append(
        searchResolve(TargetChoiceFillKind, noHoles, BattleTargetSelectionOwner)
      )

  pure def searchInvalidAbilityFillRoute: List[ReducerRouteEvent] =
    searchAbilityCheckRoute
      .append(searchResolve(SkillChoiceFillKind, noHoles, BattleHoleFrontierOwner))

  pure def searchResolvedRoute: List[ReducerRouteEvent] =
    searchAbilityCheckRoute
      .append(searchResolve(AbilityCheckFillKind, noHoles, BattleAbilityCheckOwner))

  pure def rollModifierOpeningRoute(
    choiceHole: BattleHoleFamilyKind,
  ): List[ReducerRouteEvent] =
    List(startRoute)
      .append(
        rollModifierDiscover(
          Set(TargetChoiceHoleKind, choiceHole),
          BattleSpellSlotAndActionEconomyOwner,
        )
      )
      .append(
        rollModifierResolve(
          TargetChoiceFillKind,
          Set(choiceHole),
          BattleTargetSelectionOwner,
        )
      )

  pure def rollModifierChoiceAcceptedRoute(
    choiceHole: BattleHoleFamilyKind,
    fill: BattleFillKind,
  ): List[ReducerRouteEvent] =
    rollModifierOpeningRoute(choiceHole)
      .append(rollModifierResolve(fill, noHoles, BattleActiveEffectOwner))
      .append(rollModifierResolveWithoutFill(BattleConcentrationOwner))

  pure def rollModifierInvalidChoiceRoute(
    choiceHole: BattleHoleFamilyKind,
    fill: BattleFillKind,
  ): List[ReducerRouteEvent] =
    rollModifierOpeningRoute(choiceHole)
      .append(rollModifierResolve(fill, noHoles, BattleHoleFrontierOwner))

  action recordSurface(
    surface: AbilityCheckChoiceSearchRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(AbilityCheckChoiceSearchInit, List(startRoute))

  action doSearchTargetChoiceOpen = all {
    qSurface == AbilityCheckChoiceSearchInit,
    recordSurface(
      SearchTargetChoiceOpen,
      searchTargetChoiceRoute,
    ),
  }

  action doSearchAbilityCheckOpen = all {
    qSurface == SearchTargetChoiceOpen,
    recordSurface(
      SearchAbilityCheckOpen,
      searchAbilityCheckRoute,
    ),
  }

  action doSearchInvalidTargetRejected = all {
    qSurface == SearchAbilityCheckOpen,
    recordSurface(
      SearchInvalidTargetRejected,
      searchInvalidTargetRoute,
    ),
  }

  action doSearchInvalidAbilityFillRejected = all {
    qSurface == SearchInvalidTargetRejected,
    recordSurface(
      SearchInvalidAbilityFillRejected,
      searchInvalidAbilityFillRoute,
    ),
  }

  action doSearchFails = all {
    qSurface == SearchInvalidAbilityFillRejected,
    recordSurface(
      SearchFails,
      searchResolvedRoute,
    ),
  }

  action doSearchSucceeds = all {
    qSurface == SearchFails,
    recordSurface(
      SearchSucceeds,
      searchResolvedRoute,
    ),
  }

  action doGuidanceSkillChoiceOpen = all {
    qSurface == SearchSucceeds,
    recordSurface(
      GuidanceSkillChoiceOpen,
      rollModifierOpeningRoute(SkillChoiceHoleKind),
    ),
  }

  action doGuidanceInvalidAbilityFillRejected = all {
    qSurface == GuidanceSkillChoiceOpen,
    recordSurface(
      GuidanceInvalidAbilityFillRejected,
      rollModifierInvalidChoiceRoute(SkillChoiceHoleKind, AbilityChoiceFillKind),
    ),
  }

  action doGuidanceSkillAthletics = all {
    qSurface == GuidanceInvalidAbilityFillRejected,
    recordSurface(
      GuidanceSkillAthletics,
      rollModifierChoiceAcceptedRoute(SkillChoiceHoleKind, SkillChoiceFillKind),
    ),
  }

  action doEnhanceAbilityChoiceOpen = all {
    qSurface == GuidanceSkillAthletics,
    recordSurface(
      EnhanceAbilityChoiceOpen,
      rollModifierOpeningRoute(AbilityChoiceHoleKind),
    ),
  }

  action doEnhanceAbilityInvalidSkillFillRejected = all {
    qSurface == EnhanceAbilityChoiceOpen,
    recordSurface(
      EnhanceAbilityInvalidSkillFillRejected,
      rollModifierInvalidChoiceRoute(AbilityChoiceHoleKind, SkillChoiceFillKind),
    ),
  }

  action doEnhanceAbilityDex = all {
    qSurface == EnhanceAbilityInvalidSkillFillRejected,
    recordSurface(
      EnhanceAbilityDex,
      rollModifierChoiceAcceptedRoute(
        AbilityChoiceHoleKind,
        AbilityChoiceFillKind,
      ),
    ),
  }

  action step = any {
    doSearchTargetChoiceOpen,
    doSearchAbilityCheckOpen,
    doSearchInvalidTargetRejected,
    doSearchInvalidAbilityFillRejected,
    doSearchFails,
    doSearchSucceeds,
    doGuidanceSkillChoiceOpen,
    doGuidanceInvalidAbilityFillRejected,
    doGuidanceSkillAthletics,
    doEnhanceAbilityChoiceOpen,
    doEnhanceAbilityInvalidSkillFillRejected,
    doEnhanceAbilityDex,
  }
}
