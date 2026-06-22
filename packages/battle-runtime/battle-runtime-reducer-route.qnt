// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Executable route vocabulary shared by reducer-route connector drivers. This
// module describes reducer shape, not authored catalog identity.
module battleRuntimeReducerRoute {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  type ReducerRouteSubjectFamily =
    | BattleActionRouteSubject
    | SlotSpellRouteSubject
    | SaveGatedSpellRouteSubject
    | HitPointRestorationRouteSubject
    | WeaponAttackRouteSubject
    | SpellAttackRouteSubject
    | AfterHitDamageRiderRouteSubject
    | StatBlockActionRouteSubject
    | CreatureAttackRouteSubject
    | DeathSavingThrowRouteSubject
    | ConcentrationTeardownRouteSubject
    | CommandEffectRouteSubject
    | ScalarBuffEffectRouteSubject
    | UnitFeatureBonusActionRouteSubject

  type ReducerRouteOwnerGroup =
    | BattleActionEconomyOwner
    | BattleSpellSlotAndActionEconomyOwner
    | BattleHoleFrontierOwner
    | BattleTargetSelectionOwner
    | BattleAttackRollOwner
    | BattleAbilityCheckOwner
    | BattleHitPointOwner
    | BattleHitPointAndZeroHpLifecycleOwner
    | BattleConditionLifecycleOwner
    | BattleStatBlockActionOwner
    | BattleConcentrationOwner
    | BattleActiveEffectOwner
    | BattleMovementResourceOwner
    | BattleInterruptStackOwner
    | BattleFeatureResourceOwner
    | BattleTemporaryHitPointOwner

  type ReducerRouteEvent =
    | RouteStartBattle({ owner: ReducerRouteOwnerGroup })
    | RouteDiscoverBattleActs({
        subject: ReducerRouteSubjectFamily,
        holes: Set[BattleHoleFamilyKind],
        owner: ReducerRouteOwnerGroup,
      })
    | RouteResolveBattleSubject({
        subject: ReducerRouteSubjectFamily,
        fill: BattleFillKind,
        holes: Set[BattleHoleFamilyKind],
        owner: ReducerRouteOwnerGroup,
      })
    | RouteResolveBattleSubjectWithoutFill({
        subject: ReducerRouteSubjectFamily,
        holes: Set[BattleHoleFamilyKind],
        owner: ReducerRouteOwnerGroup,
      })

  pure def routeStartBattle(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    RouteStartBattle({ owner: owner })

  pure def routeDiscoverBattleActs(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    RouteDiscoverBattleActs({
      subject: subject,
      holes: holes,
      owner: owner,
    })

  pure def routeResolveBattleSubject(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    RouteResolveBattleSubject({
      subject: subject,
      fill: fill,
      holes: holes,
      owner: owner,
    })

  pure def routeResolveBattleSubjectWithoutFill(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    RouteResolveBattleSubjectWithoutFill({
      subject: subject,
      holes: holes,
      owner: owner,
    })
}
