// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Character-Origins.md#Dragonborn defines a feature
//   that replaces one attack in the Attack action with a self-origin Cone or
//   Line, Dexterity Saving Throws, typed damage, half damage on success,
//   Proficiency Bonus uses, and Long Rest reset.
// - .references/srd-5.2.1/Classes/Fighter.md#Level 5: Extra Attack defines
//   additional attacks inside the same Attack action.
// - UBIQUITOUS_LANGUAGE.md: Attack action vs attacks, replace_attack, Area of
//   Effect, Saving Throw, Damage Type, Proficiency Bonus, and Long Rest.
module battleRuntimeAttackActionAreaSaveDamageReplacementRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type AttackActionAreaSaveDamageReplacementRouteStage =
    | Init
    | SavingThrowFrontier
    | DamageRollFrontier
    | DamageResolved
    | Resolved
    | ExtraAttackContinuationOpened
    | RejectMissingResource
    | RejectMismatchedArea
    | RejectInvalidDamageRoll

  var qStage: AttackActionAreaSaveDamageReplacementRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val savingThrowHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)
  pure val damageRollHoles: Set[BattleHoleFamilyKind] =
    Set(RolledDiceHoleKind)
  pure val extraAttackHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)

  pure val substrateSubject: ReducerRouteSubjectFamily =
    AttackActionAreaSaveDamageReplacementRouteSubject

  pure def discoverSubstrate(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(substrateSubject, holes, owner)

  pure def resolveSubstrate(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(substrateSubject, fill, holes, owner)

  pure def resolveSubstrateWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(substrateSubject, holes, owner)

  action recordStage(
    stage: AttackActionAreaSaveDamageReplacementRouteStage,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qStage' = stage,
    qRoute' = route,
  }

  action init =
    recordStage(Init, List(routeStartBattle(BattleActionEconomyOwner)))

  action doDiscoverAreaSaveDamageReplacement = all {
    qStage == Init,
    recordStage(
      SavingThrowFrontier,
      qRoute.append(
        discoverSubstrate(savingThrowHoles, BattleFeatureResourceOwner)
      ),
    ),
  }

  action doFillAreaSavingThrows = all {
    qStage == SavingThrowFrontier,
    recordStage(
      DamageRollFrontier,
      qRoute
        .append(
          resolveSubstrate(
            SavingThrowOutcomeFillKind,
            damageRollHoles,
            BattleAreaShapeOwner,
          )
        )
        .append(
          resolveSubstrateWithoutFill(
            damageRollHoles,
            BattleSavingThrowOutcomeOwner,
          )
        )
        .append(
          resolveSubstrateWithoutFill(
            damageRollHoles,
            BattleDamageTypeOwner,
          )
        ),
    ),
  }

  action doFillDamageRoll = all {
    qStage == DamageRollFrontier,
    recordStage(
      DamageResolved,
      qRoute
        .append(
          resolveSubstrate(
            RolledDiceFillKind,
            noHoles,
            BattleDamageRollOwner,
          )
        )
        .append(resolveSubstrateWithoutFill(noHoles, BattleHitPointOwner))
        .append(resolveSubstrateWithoutFill(noHoles, BattleFeatureResourceOwner)),
    ),
  }

  action doResolveWithoutExtraAttackContinuation = all {
    qStage == DamageResolved,
    recordStage(
      Resolved,
      qRoute.append(
        resolveSubstrateWithoutFill(
          noHoles,
          BattleAttackActionProcedureOwner,
        )
      ),
    ),
  }

  action doOpenExtraAttackContinuation = all {
    qStage == DamageResolved,
    recordStage(
      ExtraAttackContinuationOpened,
      qRoute.append(
        routeDiscoverBattleActs(
          WeaponAttackRouteSubject,
          extraAttackHoles,
          BattleAttackActionProcedureOwner,
        )
      ),
    ),
  }

  action doRejectMissingResource = all {
    qStage == Init,
    recordStage(
      RejectMissingResource,
      qRoute.append(
        resolveSubstrateWithoutFill(noHoles, BattleFeatureResourceOwner)
      ),
    ),
  }

  action doRejectMismatchedArea = all {
    qStage == SavingThrowFrontier,
    recordStage(
      RejectMismatchedArea,
      qRoute.append(
        resolveSubstrate(
          SavingThrowOutcomeFillKind,
          savingThrowHoles,
          BattleAreaShapeOwner,
        )
      ),
    ),
  }

  action doRejectInvalidDamageRoll = all {
    qStage == DamageRollFrontier,
    recordStage(
      RejectInvalidDamageRoll,
      qRoute.append(
        resolveSubstrate(
          RolledDiceFillKind,
          damageRollHoles,
          BattleDamageRollOwner,
        )
      ),
    ),
  }

  action step = any {
    doDiscoverAreaSaveDamageReplacement,
    doFillAreaSavingThrows,
    doFillDamageRoll,
    doResolveWithoutExtraAttackContinuation,
    doOpenExtraAttackContinuation,
    doRejectMissingResource,
    doRejectMismatchedArea,
    doRejectInvalidDamageRoll,
  }
}
