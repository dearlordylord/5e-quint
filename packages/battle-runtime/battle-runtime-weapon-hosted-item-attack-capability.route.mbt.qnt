// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack defines attack
//   structure: choose target, determine modifiers, resolve attack, and roll
//   damage on a hit unless the attack says otherwise.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls defines weapon,
//   spell, and monster ability damage rolls and weapon ability-modifier damage.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shillelagh defines a
//   held-weapon effect that replaces attack profile, damage profile, damage
//   die, and damage type choice for attacks using the held weapon.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#True Strike defines a
//   spell procedure that supplies a weapon attack using the component weapon,
//   attack/damage profile substitution, damage type choice, and extra damage.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Damage Roll, Spell Invocation, Spell
//   Effect, Hit Points, and Holding / Wielding.
module battleRuntimeWeaponHostedItemAttackCapabilityRouteMbt {
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeWeaponHostedCapabilityFacts.* from "./battle-runtime-weapon-hosted-capability-facts"

  type WeaponHostedItemAttackCapabilityRouteSurface =
    | FreshWeaponHostedCapabilityRouteSurface
    | HeldWeaponHostedAttackCapabilityRouteSurface
    | SpellHostedWeaponAttackCapabilityRouteSurface

  var qSurface: WeaponHostedItemAttackCapabilityRouteSurface
  var qRoute: List[ReducerRouteEvent]
  var qFacts: List[WeaponHostedCapabilityFact]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val attackRollHoles: Set[BattleHoleFamilyKind] =
    Set(AttackRollHoleKind)
  pure val damageRollHoles: Set[BattleHoleFamilyKind] =
    Set(RolledDiceHoleKind)
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val damageTypeAndTargetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(DamageTypeChoiceHoleKind, TargetChoiceHoleKind)

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discover(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(subject, holes, owner)

  pure def resolve(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(subject, fill, holes, owner)

  pure def resolveWithoutFill(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(subject, holes, owner)

  pure def heldWeaponHostedAttackCapabilityRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      discover(
        HeldWeaponActiveEffectRouteSubject,
        noHoles,
        BattleActionEconomyOwner,
      ),
      resolveWithoutFill(
        HeldWeaponActiveEffectRouteSubject,
        noHoles,
        BattleActiveEffectOwner,
      ),
      discover(
        HeldWeaponActiveEffectRouteSubject,
        attackRollHoles,
        BattleActiveEffectOwner,
      ),
      resolve(
        HeldWeaponActiveEffectRouteSubject,
        AttackRollFillKind,
        damageRollHoles,
        BattleAttackRollOwner,
      ),
      discover(
        HeldWeaponActiveEffectRouteSubject,
        damageRollHoles,
        BattleActiveEffectOwner,
      ),
      resolve(
        HeldWeaponActiveEffectRouteSubject,
        RolledDiceFillKind,
        noHoles,
        BattleHitPointOwner,
      ),
    )

  pure def spellHostedWeaponAttackCapabilityRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      discover(
        SpellHostedWeaponAttackRouteSubject,
        damageTypeAndTargetChoiceHoles,
        BattleActionEconomyOwner,
      ),
      resolve(
        SpellHostedWeaponAttackRouteSubject,
        DamageTypeChoiceFillKind,
        targetChoiceHoles,
        BattleHoleFrontierOwner,
      ),
      discover(
        SpellHostedWeaponAttackRouteSubject,
        targetChoiceHoles,
        BattleTargetSelectionOwner,
      ),
      resolve(
        SpellHostedWeaponAttackRouteSubject,
        TargetChoiceFillKind,
        attackRollHoles,
        BattleTargetSelectionOwner,
      ),
      discover(
        SpellHostedWeaponAttackRouteSubject,
        attackRollHoles,
        BattleAttackRollOwner,
      ),
      resolve(
        SpellHostedWeaponAttackRouteSubject,
        AttackRollFillKind,
        damageRollHoles,
        BattleAttackRollOwner,
      ),
      discover(
        SpellHostedWeaponAttackRouteSubject,
        damageRollHoles,
        BattleHitPointOwner,
      ),
      resolve(
        SpellHostedWeaponAttackRouteSubject,
        RolledDiceFillKind,
        noHoles,
        BattleHitPointOwner,
      ),
    )

  pure def heldWeaponHostedAttackCapabilityFacts:
    List[WeaponHostedCapabilityFact] =
    List(
      RouteWeaponHostedAttackHost({
        host: HeldWeaponAvailableAttackHost,
      }),
      RouteWeaponHostedComponent({
        component: HeldWeaponAlreadyChosen,
      }),
      RouteWeaponHostedAttackProfile({
        profile: SpellcastingAbilityAttackProfile,
      }),
      RouteWeaponHostedAttackProfile({
        profile: SpellcastingAbilityDamageProfile,
      }),
      RouteWeaponHostedAttackProfile({
        profile: WeaponDamageDieOverride,
      }),
      RouteWeaponHostedAttackProfile({
        profile: DamageTypeChoiceProfile,
      }),
      RouteWeaponHostedAttackFrontier({
        frontier: AttackRollFrontier,
      }),
      RouteWeaponHostedAttackFrontier({
        frontier: DamageRollFrontier,
      }),
      RouteWeaponHostedAttackFrontier({
        frontier: HitPointApplicationFrontier,
      }),
    )

  pure def spellHostedWeaponAttackCapabilityFacts:
    List[WeaponHostedCapabilityFact] =
    List(
      RouteWeaponHostedAttackHost({
        host: SpellProcedureSuppliedWeaponAttackHost,
      }),
      RouteWeaponHostedComponent({
        component: ComponentWeaponChoiceRequired,
      }),
      RouteWeaponHostedAttackProfile({
        profile: SpellcastingAbilityAttackProfile,
      }),
      RouteWeaponHostedAttackProfile({
        profile: SpellcastingAbilityDamageProfile,
      }),
      RouteWeaponHostedAttackProfile({
        profile: DamageTypeChoiceProfile,
      }),
      RouteWeaponHostedAttackProfile({
        profile: ExtraDamageDiceProfile,
      }),
      RouteWeaponHostedAttackFrontier({
        frontier: TargetChoiceFrontier,
      }),
      RouteWeaponHostedAttackFrontier({
        frontier: AttackRollFrontier,
      }),
      RouteWeaponHostedAttackFrontier({
        frontier: DamageRollFrontier,
      }),
      RouteWeaponHostedAttackFrontier({
        frontier: HitPointApplicationFrontier,
      }),
    )

  action recordRoute(
    surface: WeaponHostedItemAttackCapabilityRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[WeaponHostedCapabilityFact],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init =
    recordRoute(
      FreshWeaponHostedCapabilityRouteSurface,
      List(startRoute),
      List(),
    )

  action doHeldWeaponHostedAttackCapability =
    all {
      qSurface == FreshWeaponHostedCapabilityRouteSurface,
      recordRoute(
        HeldWeaponHostedAttackCapabilityRouteSurface,
        heldWeaponHostedAttackCapabilityRoute,
        heldWeaponHostedAttackCapabilityFacts,
      ),
    }

  action doSpellHostedWeaponAttackCapability =
    all {
      qSurface == FreshWeaponHostedCapabilityRouteSurface,
      recordRoute(
        SpellHostedWeaponAttackCapabilityRouteSurface,
        spellHostedWeaponAttackCapabilityRoute,
        spellHostedWeaponAttackCapabilityFacts,
      ),
    }

  action doStutterAfterTerminalSurface =
    all {
      qSurface != FreshWeaponHostedCapabilityRouteSurface,
      recordRoute(qSurface, qRoute, qFacts),
    }

  action step = any {
    doHeldWeaponHostedAttackCapability,
    doSpellHostedWeaponAttackCapability,
    doStutterAfterTerminalSurface,
  }
}
