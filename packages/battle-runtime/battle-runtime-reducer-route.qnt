// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Executable route vocabulary shared by reducer-route connector drivers. This
// module describes reducer shape, not authored catalog identity.
module battleRuntimeReducerRoute {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeRouteChoicePayloads.* from "./battle-runtime-route-choice-payloads"

  type ReducerRouteSubjectFamily =
    | BattleActionRouteSubject
    | AbilityCheckSearchRouteSubject
    | SlotSpellRouteSubject
    | SaveGatedSpellRouteSubject
    | HitPointRestorationRouteSubject
    | WeaponAttackRouteSubject
    | WeaponMasteryPropertyRouteSubject
    | AttackActionAreaSaveDamageReplacementRouteSubject
    | SpellAttackRouteSubject
    | SpellAttackProcedureRouteSubject
    | SpellHostedWeaponAttackRouteSubject
    | WeaponDamageRiderRouteSubject
    | HeldWeaponActiveEffectRouteSubject
    | WeaponEnhancementItemTargetRouteSubject
    | WeaponHostedSpellEffectCleanupRouteSubject
    | AfterHitDamageRiderRouteSubject
    | StatBlockActionRouteSubject
    | CreatureAttackRouteSubject
    | DeathSavingThrowRouteSubject
    | ZeroHitPointStabilizationRouteSubject
    | ConcentrationTeardownRouteSubject
    | CommandEffectRouteSubject
    | ReactionSpellRouteSubject
    | InterruptStackResumeRouteSubject
    | RollModifierEffectRouteSubject
    | SpellDamageReductionRouteSubject
    | ScalarBuffEffectRouteSubject
    | RepeatSaveConditionEffectRouteSubject
    | TurnBoundaryEffectLifecycleRouteSubject
    | ZeroHitPointSpellEffectTeardownRouteSubject
    | UnitFeatureBonusActionRouteSubject
    | ActiveFeatureSpellSaveDcRouteSubject
    | ActiveFeatureSpellAttackRollModeRouteSubject
    | CompanionLifecycleRouteSubject
    | CompanionSharedSensesRouteSubject
    | CompanionTouchDeliveryRouteSubject
    | CompanionReactionAttackRouteSubject
    | ObjectTargetSpellAttackRouteSubject
    | PassiveDamageAdjustmentRouteSubject
    | PassiveSavingThrowRollModeRouteSubject
    | PassiveAbilityCheckRollModeRouteSubject
    | CreatureSpaceMovementPermissionRouteSubject
    | CreatureStatProjectionRouteSubject
    | MovementResourceRouteSubject
    | SpecialSpeedProjectionRouteSubject
    | ForcedMovementRouteSubject
    | ActiveFormLifecycleRouteSubject
    | CreatureTypeTargetAdmissionRouteSubject
    | ProtectionCharmActiveEffectRouteSubject
    | CharmSourceDamageBreakRouteSubject
    | WardedTargetInterdictionRouteSubject
    | MetamagicSpellGovernorRouteSubject
    | MetamagicBonusActionCastingTimeRouteSubject
    | MetamagicSavingThrowProtectionRouteSubject
    | MetamagicSavingThrowRollModeRouteSubject
    | MetamagicDamageTypeSubstitutionRouteSubject
    | MetamagicEffectiveSpellLevelRouteSubject
    | MetamagicSpellRangeProjectionRouteSubject
    | MetamagicSpellDurationProjectionRouteSubject
    | MetamagicSpellComponentProjectionRouteSubject
    | MetamagicMissedSpellAttackRerollRouteSubject
    | MetamagicDamageDiceRerollRouteSubject
    | SpellBaseArmorClassEffectRouteSubject

  type ReducerRouteOwnerGroup =
    | BattleActionEconomyOwner
    | BattleSpellSlotAndActionEconomyOwner
    | BattleHoleFrontierOwner
    | BattleTargetSelectionOwner
    | BattleAttackRollOwner
    | BattleAttackActionProcedureOwner
    | BattleSpellAttackProcedureOwner
    | BattleAbilityCheckOwner
    | BattleHitPointOwner
    | BattleDamageRollOwner
    | BattleDamageTypeOwner
    | BattleHitPointAndZeroHpLifecycleOwner
    | BattleConditionLifecycleOwner
    | BattleStatBlockActionOwner
    | BattleConcentrationOwner
    | BattleActiveEffectOwner
    | BattleItemTargetBoundaryOwner
    | BattleMovementResourceOwner
    | BattleInterruptStackOwner
    | BattleFeatureResourceOwner
    | BattleTemporaryHitPointOwner
    | BattleTurnBoundaryOwner
    | BattleCompanionOwner
    | BattleObjectTargetBoundaryOwner
    | BattleAreaShapeOwner
    | BattleSavingThrowOutcomeOwner
    | BattleDamageAdjustmentOwner
    | BattleSavingThrowRollModeOwner
    | BattleAbilityCheckRollModeOwner
    | BattleCreatureSpaceMovementOwner
    | BattleCreatureStateOwner
    | BattleArmorClassOwner

  type ReducerRouteFillEvidence =
    | RouteFillKind({ fill: BattleFillKind })
    | RouteSkillChoiceFill({ skill: ReducerRouteSkillChoice })
    | RouteAbilityChoiceFill({ ability: ReducerRouteAbilityChoice })
    | RouteTargetAbilityChoicesFill({
        choices: ReducerRouteTwoTargetAbilityChoices,
      })

  type ReducerRouteEvent =
    | RouteStartBattle({ owner: ReducerRouteOwnerGroup })
    | RouteDiscoverBattleActs({
        subject: ReducerRouteSubjectFamily,
        holes: Set[BattleHoleFamilyKind],
        owner: ReducerRouteOwnerGroup,
      })
    | RouteResolveBattleSubject({
        subject: ReducerRouteSubjectFamily,
        fill: ReducerRouteFillEvidence,
        holes: Set[BattleHoleFamilyKind],
        owner: ReducerRouteOwnerGroup,
      })
    | RouteResolveBattleSubjectWithoutFill({
        subject: ReducerRouteSubjectFamily,
        holes: Set[BattleHoleFamilyKind],
        owner: ReducerRouteOwnerGroup,
      })
    | RouteResolveBattleInterrupt({
        subject: ReducerRouteSubjectFamily,
        fill: ReducerRouteFillEvidence,
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
    routeResolveBattleSubjectWithFillEvidence(
      subject,
      RouteFillKind({ fill: fill }),
      holes,
      owner,
    )

  pure def routeResolveBattleSubjectWithFillEvidence(
    subject: ReducerRouteSubjectFamily,
    fill: ReducerRouteFillEvidence,
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

  pure def routeResolveBattleInterrupt(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    RouteResolveBattleInterrupt({
      subject: subject,
      fill: RouteFillKind({ fill: fill }),
      holes: holes,
      owner: owner,
    })
}
