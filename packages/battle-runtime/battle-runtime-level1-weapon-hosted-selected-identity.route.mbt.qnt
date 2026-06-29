// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Divine Favor defines a
//   weapon-hit Attack Damage Rider Spell Effect.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shillelagh defines a
//   held-weapon active-effect override for attack and damage.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#True Strike defines a
//   spell-hosted weapon attack with damage type choice, target choice, attack
//   roll, and damage.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack and
//   #Damage Rolls define target choice, attack-roll, damage-roll, and Hit
//   Point ownership for weapon-hosted attack surfaces.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Damage Roll, Attack Damage Rider,
//   Bonus Action, Spell Invocation, Spell Effect, Hit Points, and Holding /
//   Wielding.
module battleRuntimeLevel1WeaponHostedSelectedIdentityRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type Level1WeaponHostedSelectedRouteSurface =
    | FreshWeaponHostedSelectedRouteSurface
    | DivineFavorWeaponDamageRiderRouteSurface
    | ShillelaghWeaponAttackOverrideRouteSurface
    | TrueStrikeSpellHostedWeaponAttackRouteSurface

  var qSurface: Level1WeaponHostedSelectedRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val attackRollHoles: Set[BattleHoleFamilyKind] =
    Set(AttackRollHoleKind)
  pure val damageTypeAndTargetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(DamageTypeChoiceHoleKind, TargetChoiceHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] =
    Set(RolledDiceHoleKind)
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverRoute(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(subject, holes, owner)

  pure def resolveRoute(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(subject, fill, holes, owner)

  pure def resolveRouteWithoutFill(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(subject, holes, owner)

  pure def weaponDamageRiderDiscover(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    discoverRoute(WeaponDamageRiderRouteSubject, holes, owner)

  pure def weaponDamageRiderResolve(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRoute(WeaponDamageRiderRouteSubject, fill, holes, owner)

  pure def weaponDamageRiderResolveWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRouteWithoutFill(
      WeaponDamageRiderRouteSubject,
      noHoles,
      owner,
    )

  pure def heldWeaponDiscover(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    discoverRoute(HeldWeaponActiveEffectRouteSubject, holes, owner)

  pure def heldWeaponResolve(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRoute(HeldWeaponActiveEffectRouteSubject, fill, holes, owner)

  pure def heldWeaponResolveWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRouteWithoutFill(
      HeldWeaponActiveEffectRouteSubject,
      noHoles,
      owner,
    )

  pure def spellHostedDiscover(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    discoverRoute(SpellHostedWeaponAttackRouteSubject, holes, owner)

  pure def spellHostedResolve(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRoute(SpellHostedWeaponAttackRouteSubject, fill, holes, owner)

  pure def divineFavorWeaponDamageRiderRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      weaponDamageRiderDiscover(
        noHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      weaponDamageRiderResolveWithoutFill(BattleActiveEffectOwner),
      weaponDamageRiderDiscover(rolledDiceHoles, BattleActiveEffectOwner),
      weaponDamageRiderResolve(
        RolledDiceFillKind,
        noHoles,
        BattleHitPointOwner,
      ),
    )

  pure def shillelaghWeaponAttackOverrideRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      heldWeaponDiscover(noHoles, BattleActionEconomyOwner),
      heldWeaponResolveWithoutFill(BattleActiveEffectOwner),
      heldWeaponDiscover(attackRollHoles, BattleActiveEffectOwner),
      heldWeaponResolve(
        AttackRollFillKind,
        rolledDiceHoles,
        BattleAttackRollOwner,
      ),
      heldWeaponDiscover(rolledDiceHoles, BattleActiveEffectOwner),
      heldWeaponResolve(
        RolledDiceFillKind,
        noHoles,
        BattleHitPointOwner,
      ),
    )

  pure def trueStrikeSpellHostedWeaponAttackRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      spellHostedDiscover(
        damageTypeAndTargetChoiceHoles,
        BattleActionEconomyOwner,
      ),
      spellHostedResolve(
        DamageTypeChoiceFillKind,
        targetChoiceHoles,
        BattleHoleFrontierOwner,
      ),
      spellHostedDiscover(targetChoiceHoles, BattleTargetSelectionOwner),
      spellHostedResolve(
        TargetChoiceFillKind,
        attackRollHoles,
        BattleTargetSelectionOwner,
      ),
      spellHostedDiscover(attackRollHoles, BattleAttackRollOwner),
      spellHostedResolve(
        AttackRollFillKind,
        rolledDiceHoles,
        BattleAttackRollOwner,
      ),
      spellHostedDiscover(rolledDiceHoles, BattleHitPointOwner),
      spellHostedResolve(
        RolledDiceFillKind,
        noHoles,
        BattleHitPointOwner,
      ),
    )

  action recordRoute(
    surface: Level1WeaponHostedSelectedRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init =
    recordRoute(FreshWeaponHostedSelectedRouteSurface, List(startRoute))

  action doDivineFavorWeaponDamageRider =
    all {
      qSurface == FreshWeaponHostedSelectedRouteSurface,
      recordRoute(
        DivineFavorWeaponDamageRiderRouteSurface,
        divineFavorWeaponDamageRiderRoute,
      ),
    }

  action doShillelaghWeaponAttackOverride =
    all {
      qSurface == FreshWeaponHostedSelectedRouteSurface,
      recordRoute(
        ShillelaghWeaponAttackOverrideRouteSurface,
        shillelaghWeaponAttackOverrideRoute,
      ),
    }

  action doTrueStrikeSpellHostedWeaponAttack =
    all {
      qSurface == FreshWeaponHostedSelectedRouteSurface,
      recordRoute(
        TrueStrikeSpellHostedWeaponAttackRouteSurface,
        trueStrikeSpellHostedWeaponAttackRoute,
      ),
    }

  action doStutterAfterTerminalSurface =
    all {
      qSurface != FreshWeaponHostedSelectedRouteSurface,
      recordRoute(qSurface, qRoute),
    }

  action step = any {
    doDivineFavorWeaponDamageRider,
    doShillelaghWeaponAttackOverride,
    doTrueStrikeSpellHostedWeaponAttack,
    doStutterAfterTerminalSurface,
  }
}
