// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 1: Innate Sorcery defines
//   a Bonus Action active feature that increases the Spell Save DC of Sorcerer
//   spells and grants Advantage on attack rolls of Sorcerer spells.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Saving Throws and
//   #Attack Rolls define Spell Save DC and spell attack calculations.
// - UBIQUITOUS_LANGUAGE.md: Spell Save DC, Spell Invocation, Spell Effect,
//   Attack Roll, Advantage, Bonus Action, and active feature lifecycle.
module battleRuntimeFeatureSelectedIdentityRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type ActiveFeatureSpellBenefitRouteStage =
    | Init
    | SpellSaveDcBenefitProjected
    | SpellAttackBenefitProjected
    | NonSourceSpellExcluded

  var qStage: ActiveFeatureSpellBenefitRouteStage
  var qRoute: List[ReducerRouteEvent]
  var qSpellSaveDc: int
  var qSpellAttackRollMode: str

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val attackRollHoles: Set[BattleHoleFamilyKind] = Set(AttackRollHoleKind)

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

  pure def activeFeatureActivationRoute: List[ReducerRouteEvent] =
    List(
      routeStartBattle(BattleActionEconomyOwner),
      discoverRoute(
        UnitFeatureBonusActionRouteSubject,
        noHoles,
        BattleFeatureResourceOwner,
      ),
      resolveRouteWithoutFill(
        UnitFeatureBonusActionRouteSubject,
        noHoles,
        BattleActionEconomyOwner,
      ),
      resolveRouteWithoutFill(
        UnitFeatureBonusActionRouteSubject,
        noHoles,
        BattleFeatureResourceOwner,
      ),
      resolveRouteWithoutFill(
        UnitFeatureBonusActionRouteSubject,
        noHoles,
        BattleActiveEffectOwner,
      ),
    )

  pure def activeFeatureSpellSaveDcRoute: List[ReducerRouteEvent] =
    activeFeatureActivationRoute
      .append(
        resolveRouteWithoutFill(
          ActiveFeatureSpellSaveDcRouteSubject,
          noHoles,
          BattleActiveEffectOwner,
        )
      )
      .append(
        resolveRouteWithoutFill(
          ActiveFeatureSpellSaveDcRouteSubject,
          noHoles,
          BattleSpellSlotAndActionEconomyOwner,
        )
      )

  pure def activeFeatureSpellAttackRollModeRoute: List[ReducerRouteEvent] =
    activeFeatureSpellSaveDcRoute
      .append(
        discoverRoute(
          ActiveFeatureSpellAttackRollModeRouteSubject,
          targetChoiceHoles,
          BattleSpellSlotAndActionEconomyOwner,
        )
      )
      .append(
        resolveRoute(
          ActiveFeatureSpellAttackRollModeRouteSubject,
          TargetChoiceFillKind,
          attackRollHoles,
          BattleTargetSelectionOwner,
        )
      )
      .append(
        resolveRouteWithoutFill(
          ActiveFeatureSpellAttackRollModeRouteSubject,
          attackRollHoles,
          BattleActiveEffectOwner,
        )
      )
      .append(
        resolveRouteWithoutFill(
          ActiveFeatureSpellAttackRollModeRouteSubject,
          attackRollHoles,
          BattleSpellAttackProcedureOwner,
        )
      )

  action recordStage(
    stage: ActiveFeatureSpellBenefitRouteStage,
    route: List[ReducerRouteEvent],
    spellSaveDc: int,
    spellAttackRollMode: str,
  ): bool = all {
    qStage' = stage,
    qRoute' = route,
    qSpellSaveDc' = spellSaveDc,
    qSpellAttackRollMode' = spellAttackRollMode,
  }

  action init = recordStage(
    Init,
    List(routeStartBattle(BattleActionEconomyOwner)),
    13,
    "none",
  )

  action doRouteActiveFeatureSpellSaveDcBenefit = all {
    qStage == Init,
    recordStage(
      SpellSaveDcBenefitProjected,
      activeFeatureSpellSaveDcRoute,
      14,
      "none",
    ),
  }

  action doRouteActiveFeatureSpellAttackBenefit = all {
    qStage == Init,
    recordStage(
      SpellAttackBenefitProjected,
      activeFeatureSpellAttackRollModeRoute,
      14,
      "advantage",
    ),
  }

  action doRouteNonSourceSpellExcluded = all {
    qStage == Init,
    recordStage(
      NonSourceSpellExcluded,
      activeFeatureSpellAttackRollModeRoute,
      13,
      "none",
    ),
  }

  action step = any {
    doRouteActiveFeatureSpellSaveDcBenefit,
    doRouteActiveFeatureSpellAttackBenefit,
    doRouteNonSourceSpellExcluded,
  }
}
