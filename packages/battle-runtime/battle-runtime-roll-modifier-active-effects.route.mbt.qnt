// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Bane and #Bless define
//   attack-roll and Saving Throw modifiers carried by concentration effects.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Enhance Ability,
//   #Enthrall, and #Guidance define ability/skill check modifier effects.
// - .references/srd-5.2.1/Spells/Descriptions-M-P.md#Pass without Trace and
//   Descriptions-S-Z.md#Thaumaturgy define skill modifier active effects.
// - UBIQUITOUS_LANGUAGE.md: D20 Rolls, Advantage and Disadvantage, Spell
//   Invocation, Spell Effect, and Concentration.
module battleRuntimeRollModifierActiveEffectsRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type RollModifierRouteSurface =
    | FreshRouteSurface
    | BaneSaveFrontierRouteSurface
    | BaneFailedActiveEffectRouteSurface
    | DirectConcentrationRollModifierRouteSurface
    | SkillChoiceFrontierRouteSurface
    | GuidanceActiveEffectRouteSurface
    | PassWithoutTraceActiveEffectRouteSurface
    | AbilityChoiceFrontierRouteSurface
    | EnhanceAbilityActiveEffectRouteSurface
    | TargetAbilityChoicesFrontierRouteSurface
    | EnhancePerTargetActiveEffectRouteSurface
    | EnthrallActiveEffectRouteSurface
    | ActiveOneMinuteEffectCountFrontierRouteSurface
    | ThaumaturgyActiveEffectRouteSurface
    | ThaumaturgyCancelledRouteSurface
    | ConcentrationBreakCleanupRouteSurface

  var qSurface: RollModifierRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverRollModifier(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      RollModifierEffectRouteSubject,
      holes,
      owner,
    )

  pure def resolveRollModifier(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      RollModifierEffectRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveRollModifierWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      RollModifierEffectRouteSubject,
      holes,
      owner,
    )

  pure def routeWithDiscovery(
    route: List[ReducerRouteEvent],
    fresh: bool,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): List[ReducerRouteEvent] =
    if (fresh) List(startRoute, discoverRollModifier(holes, owner)) else route

  pure def spellInvocationOwner: ReducerRouteOwnerGroup =
    BattleSpellSlotAndActionEconomyOwner

  pure def noHoles: Set[BattleHoleFamilyKind] = Set()

  action recordSurface(
    surface: RollModifierRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doDiscoverBaneSave = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      BaneSaveFrontierRouteSurface,
      qRoute.append(
        discoverRollModifier(Set(SavingThrowOutcomeHoleKind), spellInvocationOwner)
      ),
    ),
  }

  action doCastBaneFailed = all {
    qSurface == BaneSaveFrontierRouteSurface,
    recordSurface(
      BaneFailedActiveEffectRouteSurface,
      qRoute
        .append(
          resolveRollModifier(
            SavingThrowOutcomeFillKind,
            noHoles,
            BattleActiveEffectOwner,
          )
        )
        .append(resolveRollModifierWithoutFill(noHoles, BattleConcentrationOwner)),
    ),
  }

  action doCastBless = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      DirectConcentrationRollModifierRouteSurface,
      List(
        startRoute,
        discoverRollModifier(noHoles, spellInvocationOwner),
        resolveRollModifierWithoutFill(noHoles, BattleActiveEffectOwner),
        resolveRollModifierWithoutFill(noHoles, BattleConcentrationOwner),
      ),
    ),
  }

  action doDiscoverGuidanceSkillChoice = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      SkillChoiceFrontierRouteSurface,
      qRoute.append(
        discoverRollModifier(Set(SkillChoiceHoleKind), spellInvocationOwner)
      ),
    ),
  }

  action doCastGuidanceStealth = all {
    qSurface.in(Set(FreshRouteSurface, SkillChoiceFrontierRouteSurface)),
    val discovered = routeWithDiscovery(
      qRoute,
      qSurface == FreshRouteSurface,
      Set(SkillChoiceHoleKind),
      spellInvocationOwner,
    )
    recordSurface(
      GuidanceActiveEffectRouteSurface,
      discovered
        .append(
          resolveRollModifier(SkillChoiceFillKind, noHoles, BattleActiveEffectOwner)
        )
        .append(resolveRollModifierWithoutFill(noHoles, BattleConcentrationOwner)),
    ),
  }

  action doCastPassWithoutTrace = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      PassWithoutTraceActiveEffectRouteSurface,
      List(
        startRoute,
        discoverRollModifier(noHoles, spellInvocationOwner),
        resolveRollModifierWithoutFill(noHoles, BattleActiveEffectOwner),
        resolveRollModifierWithoutFill(noHoles, BattleConcentrationOwner),
      ),
    ),
  }

  action doDiscoverEnhanceAbilityChoice = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AbilityChoiceFrontierRouteSurface,
      qRoute.append(
        discoverRollModifier(Set(AbilityChoiceHoleKind), spellInvocationOwner)
      ),
    ),
  }

  action doCastEnhanceDex = all {
    qSurface.in(Set(FreshRouteSurface, AbilityChoiceFrontierRouteSurface)),
    val discovered = routeWithDiscovery(
      qRoute,
      qSurface == FreshRouteSurface,
      Set(AbilityChoiceHoleKind),
      spellInvocationOwner,
    )
    recordSurface(
      EnhanceAbilityActiveEffectRouteSurface,
      discovered
        .append(
          resolveRollModifier(AbilityChoiceFillKind, noHoles, BattleActiveEffectOwner)
        )
        .append(resolveRollModifierWithoutFill(noHoles, BattleConcentrationOwner)),
    ),
  }

  action doDiscoverEnhanceTargetAbilityChoices = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      TargetAbilityChoicesFrontierRouteSurface,
      qRoute.append(
        discoverRollModifier(
          Set(TargetAbilityChoicesHoleKind),
          spellInvocationOwner,
        )
      ),
    ),
  }

  action doCastEnhancePerTarget = all {
    qSurface.in(Set(FreshRouteSurface, TargetAbilityChoicesFrontierRouteSurface)),
    val discovered = routeWithDiscovery(
      qRoute,
      qSurface == FreshRouteSurface,
      Set(TargetAbilityChoicesHoleKind),
      spellInvocationOwner,
    )
    recordSurface(
      EnhancePerTargetActiveEffectRouteSurface,
      discovered
        .append(
          resolveRollModifier(
            TargetAbilityChoicesFillKind,
            noHoles,
            BattleActiveEffectOwner,
          )
        )
        .append(resolveRollModifierWithoutFill(noHoles, BattleConcentrationOwner)),
    ),
  }

  action doCastEnthrall = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      EnthrallActiveEffectRouteSurface,
      List(
        startRoute,
        discoverRollModifier(Set(SavingThrowOutcomeHoleKind), spellInvocationOwner),
        resolveRollModifier(
          SavingThrowOutcomeFillKind,
          noHoles,
          BattleActiveEffectOwner,
        ),
        resolveRollModifierWithoutFill(noHoles, BattleConcentrationOwner),
      ),
    ),
  }

  action doDiscoverThaumaturgyCount = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      ActiveOneMinuteEffectCountFrontierRouteSurface,
      qRoute.append(discoverRollModifier(noHoles, BattleActiveEffectOwner)),
    ),
  }

  action doCastThaumaturgyBoomingVoice = all {
    qSurface.in(Set(FreshRouteSurface, ActiveOneMinuteEffectCountFrontierRouteSurface)),
    val discovered = routeWithDiscovery(
      qRoute,
      qSurface == FreshRouteSurface,
      noHoles,
      BattleActiveEffectOwner,
    )
    recordSurface(
      ThaumaturgyActiveEffectRouteSurface,
      discovered.append(
        resolveRollModifierWithoutFill(noHoles, BattleActiveEffectOwner)
      ),
    ),
  }

  action doCastThaumaturgyCancelled = all {
    qSurface.in(Set(FreshRouteSurface, ActiveOneMinuteEffectCountFrontierRouteSurface)),
    val discovered = routeWithDiscovery(
      qRoute,
      qSurface == FreshRouteSurface,
      noHoles,
      BattleActiveEffectOwner,
    )
    recordSurface(
      ThaumaturgyCancelledRouteSurface,
      discovered.append(
        resolveRollModifierWithoutFill(noHoles, BattleActiveEffectOwner)
      ),
    ),
  }

  action doBreakConcentration = all {
    qSurface.in(Set(
      BaneFailedActiveEffectRouteSurface,
      DirectConcentrationRollModifierRouteSurface,
      GuidanceActiveEffectRouteSurface,
      PassWithoutTraceActiveEffectRouteSurface,
      EnhanceAbilityActiveEffectRouteSurface,
      EnhancePerTargetActiveEffectRouteSurface,
      EnthrallActiveEffectRouteSurface,
    )),
    recordSurface(
      ConcentrationBreakCleanupRouteSurface,
      qRoute
        .append(resolveRollModifierWithoutFill(noHoles, BattleConcentrationOwner))
        .append(resolveRollModifierWithoutFill(noHoles, BattleActiveEffectOwner)),
    ),
  }

  action doStutter = all {
    qSurface.in(Set(
      BaneFailedActiveEffectRouteSurface,
      DirectConcentrationRollModifierRouteSurface,
      GuidanceActiveEffectRouteSurface,
      PassWithoutTraceActiveEffectRouteSurface,
      EnhanceAbilityActiveEffectRouteSurface,
      EnhancePerTargetActiveEffectRouteSurface,
      EnthrallActiveEffectRouteSurface,
      ThaumaturgyActiveEffectRouteSurface,
      ThaumaturgyCancelledRouteSurface,
      ConcentrationBreakCleanupRouteSurface,
    )),
    recordSurface(qSurface, qRoute),
  }

  action step = any {
    doDiscoverBaneSave,
    doCastBaneFailed,
    doCastBless,
    doDiscoverGuidanceSkillChoice,
    doCastGuidanceStealth,
    doCastPassWithoutTrace,
    doDiscoverEnhanceAbilityChoice,
    doCastEnhanceDex,
    doDiscoverEnhanceTargetAbilityChoices,
    doCastEnhancePerTarget,
    doCastEnthrall,
    doDiscoverThaumaturgyCount,
    doCastThaumaturgyBoomingVoice,
    doCastThaumaturgyCancelled,
    doBreakConcentration,
    doStutter,
  }
}
