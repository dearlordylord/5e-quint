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
    holes: Set[BattleHoleFamilyKind],
    discoverOwner: ReducerRouteOwnerGroup,
    fill: BattleFillKind,
    nextHoles: Set[BattleHoleFamilyKind],
    resolveOwner: ReducerRouteOwnerGroup,
  ): List[ReducerRouteEvent] =
    List(
      startRoute,
      routeDiscoverBattleActs(
        SpellHostedWeaponAttackRouteSubject,
        holes,
        discoverOwner,
      ),
      routeResolveBattleSubject(
        SpellHostedWeaponAttackRouteSubject,
        fill,
        nextHoles,
        resolveOwner,
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
        Set(DamageTypeChoiceHoleKind, TargetChoiceHoleKind),
        BattleActionEconomyOwner,
        DamageTypeChoiceFillKind,
        Set(TargetChoiceHoleKind),
        BattleHoleFrontierOwner,
      ),
    ),
  }

  action doRouteSpellHostedTargetChoice = all {
    qSurface == SpellHostedDamageTypeChoiceRouteSurface,
    recordSurface(
      SpellHostedTargetChoiceRouteSurface,
      routeSpellHostedAttack(
        Set(TargetChoiceHoleKind),
        BattleTargetSelectionOwner,
        TargetChoiceFillKind,
        Set(AttackRollHoleKind),
        BattleTargetSelectionOwner,
      ),
    ),
  }

  action doRouteSpellHostedAttackRoll = all {
    qSurface == SpellHostedTargetChoiceRouteSurface,
    recordSurface(
      SpellHostedAttackRollRouteSurface,
      routeSpellHostedAttack(
        Set(AttackRollHoleKind),
        BattleAttackRollOwner,
        AttackRollFillKind,
        Set(RolledDiceHoleKind),
        BattleAttackRollOwner,
      ),
    ),
  }

  action doRouteSpellHostedDamage = all {
    qSurface == SpellHostedAttackRollRouteSurface,
    recordSurface(
      SpellHostedDamageRouteSurface,
      routeSpellHostedAttack(
        Set(RolledDiceHoleKind),
        BattleHitPointOwner,
        RolledDiceFillKind,
        Set(),
        BattleHitPointOwner,
      ),
    ),
  }

  action step = any {
    doRouteSpellHostedDamageTypeChoice,
    doRouteSpellHostedTargetChoice,
    doRouteSpellHostedAttackRoll,
    doRouteSpellHostedDamage,
  }
}
