// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic defines
//   temporary spell modification, Sorcery Point spend, and the default
//   one-option-per-spell limit.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Metamagic Options defines
//   save protection, range projection, damage dice rerolls, duration
//   projection, save roll mode, Bonus Action casting-time rewrite, missed
//   spell Attack rerolls, component projection, damage-type substitution, and
//   effective spell level projection.
// - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Spell Effect, Pool, Spend,
//   Lock, Saving Throw, Attack Roll, Damage Type, Spell Component, Magic
//   Action, and Bonus Action.
module battleRuntimeSorcererMetamagicRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type MetamagicRouteStage =
    | Init
    | ResourceGovernorRouted
    | ResourceGovernorRejected
    | BonusActionCastingTimeRouted
    | PriorLevelOnePlusSpellRejected
    | SavingThrowProtectionRouted
    | SavingThrowRollModeRouted
    | DamageTypeSubstitutionRouted
    | EffectiveSpellLevelRouted
    | SpellRangeProjectionRouted
    | SpellDurationProjectionRouted
    | SpellComponentProjectionRouted
    | MissedSpellAttackRerollRouted
    | DamageDiceRerollRouted

  var qStage: MetamagicRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val attackRollHoles: Set[BattleHoleFamilyKind] = Set(AttackRollHoleKind)
  pure val damageRollHoles: Set[BattleHoleFamilyKind] = Set(RolledDiceHoleKind)
  pure val damageTypeHoles: Set[BattleHoleFamilyKind] =
    Set(DamageTypeChoiceHoleKind)
  pure val savingThrowHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val targetListHoles: Set[BattleHoleFamilyKind] =
    Set(SpellTargetListHoleKind)

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

  pure def initialRoute: List[ReducerRouteEvent] =
    List(routeStartBattle(BattleSpellSlotAndActionEconomyOwner))

  action recordStage(
    stage: MetamagicRouteStage,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qStage' = stage,
    qRoute' = route,
  }

  action init = recordStage(Init, initialRoute)

  action doRouteMetamagicResourceGovernor = all {
    qStage == Init,
    recordStage(
      ResourceGovernorRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicSpellGovernorRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSpellGovernorRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        ),
    ),
  }

  action doRejectMetamagicResourceGovernor = all {
    qStage == Init,
    recordStage(
      ResourceGovernorRejected,
      initialRoute
        .append(
          discoverRoute(
            MetamagicSpellGovernorRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSpellGovernorRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        ),
    ),
  }

  action doRouteBonusActionCastingTime = all {
    qStage == Init,
    recordStage(
      BonusActionCastingTimeRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicBonusActionCastingTimeRouteSubject,
            targetChoiceHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicBonusActionCastingTimeRouteSubject,
            targetChoiceHoles,
            BattleActionEconomyOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicBonusActionCastingTimeRouteSubject,
            targetChoiceHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicBonusActionCastingTimeRouteSubject,
            TargetChoiceFillKind,
            attackRollHoles,
            BattleTargetSelectionOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicBonusActionCastingTimeRouteSubject,
            AttackRollFillKind,
            damageRollHoles,
            BattleSpellAttackProcedureOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicBonusActionCastingTimeRouteSubject,
            noHoles,
            BattleTurnBoundaryOwner,
          )
        ),
    ),
  }

  action doRejectPriorLevelOnePlusSpell = all {
    qStage == Init,
    recordStage(
      PriorLevelOnePlusSpellRejected,
      initialRoute
        .append(
          discoverRoute(
            MetamagicBonusActionCastingTimeRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicBonusActionCastingTimeRouteSubject,
            noHoles,
            BattleTurnBoundaryOwner,
          )
        ),
    ),
  }

  action doRouteSavingThrowProtection = all {
    qStage == Init,
    recordStage(
      SavingThrowProtectionRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicSavingThrowProtectionRouteSubject,
            savingThrowHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicSavingThrowProtectionRouteSubject,
            SavingThrowOutcomeFillKind,
            damageRollHoles,
            BattleSavingThrowOutcomeOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSavingThrowProtectionRouteSubject,
            damageRollHoles,
            BattleDamageAdjustmentOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSavingThrowProtectionRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        ),
    ),
  }

  action doRouteSavingThrowRollMode = all {
    qStage == Init,
    recordStage(
      SavingThrowRollModeRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicSavingThrowRollModeRouteSubject,
            savingThrowHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSavingThrowRollModeRouteSubject,
            savingThrowHoles,
            BattleSavingThrowRollModeOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicSavingThrowRollModeRouteSubject,
            SavingThrowOutcomeFillKind,
            noHoles,
            BattleSavingThrowOutcomeOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSavingThrowRollModeRouteSubject,
            noHoles,
            BattleConditionLifecycleOwner,
          )
        ),
    ),
  }

  action doRouteDamageTypeSubstitution = all {
    qStage == Init,
    recordStage(
      DamageTypeSubstitutionRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicDamageTypeSubstitutionRouteSubject,
            damageTypeHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicDamageTypeSubstitutionRouteSubject,
            DamageTypeChoiceFillKind,
            damageRollHoles,
            BattleDamageTypeOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicDamageTypeSubstitutionRouteSubject,
            RolledDiceFillKind,
            noHoles,
            BattleDamageRollOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicDamageTypeSubstitutionRouteSubject,
            noHoles,
            BattleHitPointOwner,
          )
        ),
    ),
  }

  action doRouteEffectiveSpellLevel = all {
    qStage == Init,
    recordStage(
      EffectiveSpellLevelRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicEffectiveSpellLevelRouteSubject,
            targetListHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicEffectiveSpellLevelRouteSubject,
            targetListHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicEffectiveSpellLevelRouteSubject,
            SpellTargetListFillKind,
            noHoles,
            BattleTargetSelectionOwner,
          )
        ),
    ),
  }

  action doRouteSpellRangeProjection = all {
    qStage == Init,
    recordStage(
      SpellRangeProjectionRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicSpellRangeProjectionRouteSubject,
            targetChoiceHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSpellRangeProjectionRouteSubject,
            targetChoiceHoles,
            BattleObjectTargetBoundaryOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicSpellRangeProjectionRouteSubject,
            TargetChoiceFillKind,
            noHoles,
            BattleTargetSelectionOwner,
          )
        ),
    ),
  }

  action doRouteSpellDurationProjection = all {
    qStage == Init,
    recordStage(
      SpellDurationProjectionRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicSpellDurationProjectionRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSpellDurationProjectionRouteSubject,
            noHoles,
            BattleActiveEffectOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSpellDurationProjectionRouteSubject,
            noHoles,
            BattleConcentrationOwner,
          )
        ),
    ),
  }

  action doRouteSpellComponentProjection = all {
    qStage == Init,
    recordStage(
      SpellComponentProjectionRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicSpellComponentProjectionRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicSpellComponentProjectionRouteSubject,
            noHoles,
            BattleSpellSlotAndActionEconomyOwner,
          )
        ),
    ),
  }

  action doRouteMissedSpellAttackReroll = all {
    qStage == Init,
    recordStage(
      MissedSpellAttackRerollRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicMissedSpellAttackRerollRouteSubject,
            attackRollHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicMissedSpellAttackRerollRouteSubject,
            AttackRollFillKind,
            attackRollHoles,
            BattleAttackRollOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicMissedSpellAttackRerollRouteSubject,
            AttackRollFillKind,
            damageRollHoles,
            BattleAttackRollOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicMissedSpellAttackRerollRouteSubject,
            noHoles,
            BattleFeatureResourceOwner,
          )
        ),
    ),
  }

  action doRouteDamageDiceReroll = all {
    qStage == Init,
    recordStage(
      DamageDiceRerollRouted,
      initialRoute
        .append(
          discoverRoute(
            MetamagicDamageDiceRerollRouteSubject,
            damageRollHoles,
            BattleFeatureResourceOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicDamageDiceRerollRouteSubject,
            RolledDiceFillKind,
            damageRollHoles,
            BattleDamageRollOwner,
          )
        )
        .append(
          resolveRoute(
            MetamagicDamageDiceRerollRouteSubject,
            RolledDiceFillKind,
            noHoles,
            BattleDamageRollOwner,
          )
        )
        .append(
          resolveRouteWithoutFill(
            MetamagicDamageDiceRerollRouteSubject,
            noHoles,
            BattleHitPointOwner,
          )
        ),
    ),
  }

  action step = any {
    doRouteMetamagicResourceGovernor,
    doRejectMetamagicResourceGovernor,
    doRouteBonusActionCastingTime,
    doRejectPriorLevelOnePlusSpell,
    doRouteSavingThrowProtection,
    doRouteSavingThrowRollMode,
    doRouteDamageTypeSubstitution,
    doRouteEffectiveSpellLevel,
    doRouteSpellRangeProjection,
    doRouteSpellDurationProjection,
    doRouteSpellComponentProjection,
    doRouteMissedSpellAttackReroll,
    doRouteDamageDiceReroll,
  }
}
