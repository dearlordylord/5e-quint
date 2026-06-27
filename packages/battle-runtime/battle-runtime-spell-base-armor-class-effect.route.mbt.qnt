// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Targets and #Duration
//   define target admission and duration boundaries.
// - battle-runtime-mage-armor-selected-identity.mbt.qnt supplies the focused
//   selected-identity witness facts for self-target admission, armored-target
//   rejection, base Armor Class projection, and duration expiry. The local SRD
//   5.2.1 corpus does not include a spell-name passage for this selected
//   fixture, so this connector records the generic reducer shape rather than
//   spell identity.
// - UBIQUITOUS_LANGUAGE.md: Armor Class, Spell Effect, Target, Duration, and
//   Boundary Crossing.
module battleRuntimeSpellBaseArmorClassEffectRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type SpellBaseArmorClassEffectRouteSurface =
    | FreshRouteSurface
    | UnarmoredTargetAdmissionRouteSurface
    | ArmoredTargetRejectionRouteSurface
    | BaseArmorClassProjectionRouteSurface
    | DurationExpiryRouteSurface

  var qSurface: SpellBaseArmorClassEffectRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def noHoles: Set[BattleHoleFamilyKind] = Set()
  pure def targetChoiceHoles: Set[BattleHoleFamilyKind] = Set(TargetChoiceHoleKind)

  pure def discoverArmorClass(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      SpellBaseArmorClassEffectRouteSubject,
      holes,
      owner,
    )

  pure def resolveArmorClass(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      SpellBaseArmorClassEffectRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveArmorClassWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      SpellBaseArmorClassEffectRouteSubject,
      holes,
      owner,
    )

  action recordRoute(
    surface: SpellBaseArmorClassEffectRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordRoute(FreshRouteSurface, List(startRoute))

  action doRouteUnarmoredTargetAdmission = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      UnarmoredTargetAdmissionRouteSurface,
      List(
        startRoute,
        discoverArmorClass(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
        resolveArmorClass(TargetChoiceFillKind, noHoles, BattleTargetSelectionOwner),
      ),
    ),
  }

  action doRouteArmoredTargetRejection = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      ArmoredTargetRejectionRouteSurface,
      List(
        startRoute,
        discoverArmorClass(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
        resolveArmorClass(
          TargetChoiceFillKind,
          targetChoiceHoles,
          BattleTargetSelectionOwner,
        ),
      ),
    ),
  }

  action doRouteBaseArmorClassProjection = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      BaseArmorClassProjectionRouteSurface,
      List(
        startRoute,
        discoverArmorClass(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
        resolveArmorClass(TargetChoiceFillKind, noHoles, BattleTargetSelectionOwner),
        resolveArmorClassWithoutFill(noHoles, BattleActiveEffectOwner),
        resolveArmorClassWithoutFill(noHoles, BattleArmorClassOwner),
      ),
    ),
  }

  action doRouteDurationExpiry = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      DurationExpiryRouteSurface,
      List(
        startRoute,
        discoverArmorClass(noHoles, BattleActiveEffectOwner),
        resolveArmorClassWithoutFill(noHoles, BattleTurnBoundaryOwner),
        resolveArmorClassWithoutFill(noHoles, BattleActiveEffectOwner),
        resolveArmorClassWithoutFill(noHoles, BattleArmorClassOwner),
      ),
    ),
  }

  action step = any {
    doRouteUnarmoredTargetAdmission,
    doRouteArmoredTargetRejection,
    doRouteBaseArmorClassProjection,
    doRouteDurationExpiry,
  }
}
