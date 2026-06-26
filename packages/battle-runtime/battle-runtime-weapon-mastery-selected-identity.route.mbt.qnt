// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Equipment.md#Mastery Properties defines weapon
//   mastery properties as weapon-carried properties unlocked by a feature.
// - .references/srd-5.2.1/Equipment.md#Sap defines the on-hit next attack-roll
//   Disadvantage rider.
// - .references/srd-5.2.1/Equipment.md#Topple defines the on-hit Constitution
//   Saving Throw and Prone condition rider.
// - .references/srd-5.2.1/Equipment.md#Cleave defines the on-hit optional
//   once-per-turn second melee attack and weapon-damage rider.
// - UBIQUITOUS_LANGUAGE.md: Mastery Property, Weapon Mastery, Attack Roll,
//   Saving Throw, Condition, Rider, and Hit Points.
module battleRuntimeWeaponMasterySelectedIdentityRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type WeaponMasteryPropertyRouteStage =
    | Init
    | SapPropertyActiveEffectRider
    | TopplePropertySaveGate
    | TopplePropertyConditionRider
    | CleavePropertyDecision
    | CleavePropertySecondTarget
    | CleavePropertySecondAttack
    | CleavePropertySecondDamage

  var qStage: WeaponMasteryPropertyRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val weaponAttackStartHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val weaponAttackRollHoles: Set[BattleHoleFamilyKind] =
    Set(AttackRollHoleKind)
  pure val weaponDamageHoles: Set[BattleHoleFamilyKind] =
    Set(RolledDiceHoleKind)

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

  pure def weaponAttackRollRoute: List[ReducerRouteEvent] =
    List(
      routeStartBattle(BattleActionEconomyOwner),
      discoverRoute(
        WeaponAttackRouteSubject,
        weaponAttackStartHoles,
        BattleActionEconomyOwner,
      ),
      resolveRoute(
        WeaponAttackRouteSubject,
        TargetChoiceFillKind,
        weaponAttackRollHoles,
        BattleTargetSelectionOwner,
      ),
    )

  pure def weaponHitDamageRoute: List[ReducerRouteEvent] =
    weaponAttackRollRoute.append(
      resolveRoute(
        WeaponAttackRouteSubject,
        AttackRollFillKind,
        weaponDamageHoles,
        BattleAttackRollOwner,
      )
    )

  action recordStage(
    stage: WeaponMasteryPropertyRouteStage,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qStage' = stage,
    qRoute' = route,
  }

  action init = recordStage(Init, weaponAttackRollRoute)

  action doRouteSapPropertyActiveEffectRider = all {
    qStage == Init,
    recordStage(
      SapPropertyActiveEffectRider,
      weaponHitDamageRoute
        .append(
          resolveRoute(
            WeaponAttackRouteSubject,
            RolledDiceFillKind,
            noHoles,
            BattleHitPointOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            WeaponMasteryPropertyRouteSubject,
            noHoles,
            BattleActiveEffectOwner,
          )
        ),
    ),
  }

  action doRouteTopplePropertySaveGate = all {
    qStage == Init,
    recordStage(
      TopplePropertySaveGate,
      weaponAttackRollRoute.append(
        resolveRoute(
          WeaponMasteryPropertyRouteSubject,
          AttackRollFillKind,
          Set(SavingThrowOutcomeHoleKind),
          BattleConditionLifecycleOwner,
        )
      ),
    ),
  }

  action doRouteTopplePropertyConditionRider = all {
    qStage == TopplePropertySaveGate,
    recordStage(
      TopplePropertyConditionRider,
      qRoute.append(
        resolveRoute(
          WeaponMasteryPropertyRouteSubject,
          SavingThrowOutcomeFillKind,
          weaponDamageHoles,
          BattleConditionLifecycleOwner,
        )
      ),
    ),
  }

  action doRouteCleavePropertyDecision = all {
    qStage == Init,
    recordStage(
      CleavePropertyDecision,
      weaponHitDamageRoute
        .append(
          resolveRoute(
            WeaponAttackRouteSubject,
            RolledDiceFillKind,
            Set(UnitFeatureDecisionHoleKind),
            BattleHitPointOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            WeaponMasteryPropertyRouteSubject,
            Set(UnitFeatureDecisionHoleKind),
            BattleFeatureResourceOwner,
          )
        ),
    ),
  }

  action doRouteCleavePropertySecondTarget = all {
    qStage == CleavePropertyDecision,
    recordStage(
      CleavePropertySecondTarget,
      qRoute.append(
        resolveRoute(
          WeaponMasteryPropertyRouteSubject,
          UnitFeatureDecisionFillKind,
          Set(TargetChoiceHoleKind),
          BattleFeatureResourceOwner,
        )
      ),
    ),
  }

  action doRouteCleavePropertySecondAttack = all {
    qStage == CleavePropertySecondTarget,
    recordStage(
      CleavePropertySecondAttack,
      qRoute.append(
        resolveRoute(
          WeaponMasteryPropertyRouteSubject,
          TargetChoiceFillKind,
          weaponAttackRollHoles,
          BattleTargetSelectionOwner,
        )
      ),
    ),
  }

  action doRouteCleavePropertySecondDamage = all {
    qStage == CleavePropertySecondAttack,
    recordStage(
      CleavePropertySecondDamage,
      qRoute
        .append(
          resolveRoute(
            WeaponMasteryPropertyRouteSubject,
            AttackRollFillKind,
            weaponDamageHoles,
            BattleAttackRollOwner,
          )
        )
        .append(
          resolveRoute(
            WeaponMasteryPropertyRouteSubject,
            RolledDiceFillKind,
            noHoles,
            BattleHitPointOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            WeaponMasteryPropertyRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        ),
    ),
  }

  action step = any {
    doRouteSapPropertyActiveEffectRider,
    doRouteTopplePropertySaveGate,
    doRouteTopplePropertyConditionRider,
    doRouteCleavePropertyDecision,
    doRouteCleavePropertySecondTarget,
    doRouteCleavePropertySecondAttack,
    doRouteCleavePropertySecondDamage,
  }
}
