// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#True Strike defines a
//   spell-hosted weapon attack with spellcasting ability substitution, damage
//   type choice, and cantrip-scaling extra Radiant damage.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack and
//   #Damage Rolls define target choice, attack-roll, damage-roll, and HP
//   ownership for the hosted attack surface.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Damage Roll, Spell Invocation, and
//   Hit Points.
module battleRuntimeSpellHostedWeaponAttackRouteMbt {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type SpellHostedWeaponAttackRouteSurface =
    | FreshRouteSurface
    | SpellHostedDamageTypeChoiceRouteSurface
    | SpellHostedTargetChoiceRouteSurface
    | SpellHostedAttackRollRouteSurface
    | SpellHostedDamageRouteSurface

  var qSurface: SpellHostedWeaponAttackRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def routeSpellHostedAttack(
    fill: BattleFillKind,
    nextHoles: Set[BattleHoleFamilyKind],
    resolveOwner: ReducerRouteOwnerGroup,
    discoverOwner: ReducerRouteOwnerGroup,
  ): List[ReducerRouteEvent] =
    List(
      startRoute,
      routeResolveBattleSubject(
        SpellHostedWeaponAttackRouteSubject,
        fill,
        nextHoles,
        resolveOwner,
      ),
      routeDiscoverBattleActs(
        SpellHostedWeaponAttackRouteSubject,
        nextHoles,
        discoverOwner,
      ),
    )

  pure def routeFinalSpellHostedDamage: List[ReducerRouteEvent] =
    List(
      startRoute,
      routeResolveBattleSubject(
        SpellHostedWeaponAttackRouteSubject,
        RolledDiceFillKind,
        Set(),
        BattleHitPointOwner,
      ),
    )

  action recordSurface(
    surface: SpellHostedWeaponAttackRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doRouteSpellHostedDamageTypeChoice = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      SpellHostedDamageTypeChoiceRouteSurface,
      routeSpellHostedAttack(
        DamageTypeChoiceFillKind,
        Set(TargetChoiceHoleKind),
        BattleHoleFrontierOwner,
        BattleTargetSelectionOwner,
      ),
    ),
  }

  action doRouteSpellHostedTargetChoice = all {
    qSurface == SpellHostedDamageTypeChoiceRouteSurface,
    recordSurface(
      SpellHostedTargetChoiceRouteSurface,
      routeSpellHostedAttack(
        TargetChoiceFillKind,
        Set(AttackRollHoleKind),
        BattleTargetSelectionOwner,
        BattleAttackRollOwner,
      ),
    ),
  }

  action doRouteSpellHostedAttackRoll = all {
    qSurface == SpellHostedTargetChoiceRouteSurface,
    recordSurface(
      SpellHostedAttackRollRouteSurface,
      routeSpellHostedAttack(
        AttackRollFillKind,
        Set(RolledDiceHoleKind),
        BattleAttackRollOwner,
        BattleHitPointOwner,
      ),
    ),
  }

  action doRouteSpellHostedDamage = all {
    qSurface == SpellHostedAttackRollRouteSurface,
    recordSurface(
      SpellHostedDamageRouteSurface,
      routeFinalSpellHostedDamage,
    ),
  }

  action step = any {
    doRouteSpellHostedDamageTypeChoice,
    doRouteSpellHostedTargetChoice,
    doRouteSpellHostedAttackRoll,
    doRouteSpellHostedDamage,
  }
}
