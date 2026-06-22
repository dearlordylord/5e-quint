// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Bonus Actions defines the
//   single Bonus Action spend used by after-hit smite-style spells.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack permits attacks
//   to cause special effects in addition to damage.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls and #Hit Points
//   define damage rolls and Hit Point loss.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots and
//   #Casting without Slots define slot and slotless spell spends.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration and
//   #Restrained [Condition] define Concentration and condition lifecycles.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Divine Smite,
//   Descriptions-E-L.md#Ensnaring Strike, and
//   Descriptions-S-Z.md#Searing Smite / #Shining Smite define the source
//   after-hit spell shapes represented by these generic owner surfaces.
// - UBIQUITOUS_LANGUAGE.md: Rider, Attack Damage Rider, Spell Invocation,
//   Spell Effect, Spend, Concentration, Condition, Hit Points, and Ability
//   Check.
module battleRuntimeAfterHitDamageRidersRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type AfterHitRouteSurface =
    | FreshRouteSurface
    | InterruptDecisionRouteSurface
    | SaveGatedInterruptDecisionRouteSurface
    | SlotSpendRouteSurface
    | FreeCastSpendRouteSurface
    | SaveGatedSlotAndActionEconomySpendRouteSurface
    | AttackDamageRouteSurface
    | SaveGatedConditionRouteSurface
    | SaveGatedConcentrationRouteSurface
    | TurnStartDamageRouteSurface
    | TurnStartSaveCleanupRouteSurface
    | EscapeCheckRouteSurface
    | EscapeConditionCleanupRouteSurface
    | EscapeConcentrationCleanupRouteSurface
    | IlluminationEffectRouteSurface
    | IlluminationConcentrationRouteSurface
    | IlluminationConcentrationBreakRouteSurface
    | IlluminationEffectCleanupRouteSurface

  var qSurface: AfterHitRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverAfterHit(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      AfterHitDamageRiderRouteSubject,
      holes,
      owner,
    )

  pure def resolveAfterHit(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      AfterHitDamageRiderRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveAfterHitWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      AfterHitDamageRiderRouteSubject,
      holes,
      owner,
    )

  action recordSurface(
    surface: AfterHitRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(
    FreshRouteSurface,
    List(startRoute),
  )

  action doRouteInterruptDecision = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      InterruptDecisionRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(InterruptDecisionHoleKind), BattleInterruptStackOwner),
        resolveAfterHit(
          InterruptDecisionFillKind,
          Set(RolledDiceHoleKind),
          BattleInterruptStackOwner,
        ),
      ),
    ),
  }

  action doRouteSaveGatedInterruptDecision = all {
    qSurface == InterruptDecisionRouteSurface,
    recordSurface(
      SaveGatedInterruptDecisionRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(InterruptDecisionHoleKind), BattleInterruptStackOwner),
        resolveAfterHit(
          InterruptDecisionFillKind,
          Set(SavingThrowOutcomeHoleKind),
          BattleInterruptStackOwner,
        ),
      ),
    ),
  }

  action doRouteSlotSpend = all {
    qSurface == SaveGatedInterruptDecisionRouteSurface,
    recordSurface(
      SlotSpendRouteSurface,
      List(
        startRoute,
        discoverAfterHit(
          Set(InterruptDecisionHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        ),
        resolveAfterHit(
          InterruptDecisionFillKind,
          Set(RolledDiceHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        ),
      ),
    ),
  }

  action doRouteFreeCastSpend = all {
    qSurface == SlotSpendRouteSurface,
    recordSurface(
      FreeCastSpendRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(InterruptDecisionHoleKind), BattleFeatureResourceOwner),
        resolveAfterHit(
          InterruptDecisionFillKind,
          Set(RolledDiceHoleKind),
          BattleFeatureResourceOwner,
        ),
      ),
    ),
  }

  action doRouteSaveGatedSlotAndActionEconomySpend = all {
    qSurface == FreeCastSpendRouteSurface,
    recordSurface(
      SaveGatedSlotAndActionEconomySpendRouteSurface,
      List(
        startRoute,
        discoverAfterHit(
          Set(SavingThrowOutcomeHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        ),
        resolveAfterHit(
          SavingThrowOutcomeFillKind,
          Set(RolledDiceHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        ),
      ),
    ),
  }

  action doRouteAttackDamage = all {
    qSurface == SaveGatedSlotAndActionEconomySpendRouteSurface,
    recordSurface(
      AttackDamageRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(RolledDiceHoleKind), BattleHitPointOwner),
        resolveAfterHit(RolledDiceFillKind, Set(), BattleHitPointOwner),
      ),
    ),
  }

  action doRouteSaveGatedCondition = all {
    qSurface == AttackDamageRouteSurface,
    recordSurface(
      SaveGatedConditionRouteSurface,
      List(
        startRoute,
        discoverAfterHit(
          Set(SavingThrowOutcomeHoleKind),
          BattleConditionLifecycleOwner,
        ),
        resolveAfterHit(
          SavingThrowOutcomeFillKind,
          Set(RolledDiceHoleKind),
          BattleConditionLifecycleOwner,
        ),
      ),
    ),
  }

  action doRouteSaveGatedConcentration = all {
    qSurface == SaveGatedConditionRouteSurface,
    recordSurface(
      SaveGatedConcentrationRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(SavingThrowOutcomeHoleKind), BattleConcentrationOwner),
        resolveAfterHit(
          SavingThrowOutcomeFillKind,
          Set(RolledDiceHoleKind),
          BattleConcentrationOwner,
        ),
      ),
    ),
  }

  action doRouteTurnStartDamage = all {
    qSurface == SaveGatedConcentrationRouteSurface,
    recordSurface(
      TurnStartDamageRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(RolledDiceHoleKind), BattleActiveEffectOwner),
        resolveAfterHit(
          RolledDiceFillKind,
          Set(AbilityCheckHoleKind),
          BattleHitPointOwner,
        ),
      ),
    ),
  }

  action doRouteTurnStartSaveCleanup = all {
    qSurface == TurnStartDamageRouteSurface,
    recordSurface(
      TurnStartSaveCleanupRouteSurface,
      List(
        startRoute,
        discoverAfterHit(
          Set(RolledDiceHoleKind, SavingThrowOutcomeHoleKind),
          BattleActiveEffectOwner,
        ),
        resolveAfterHit(
          RolledDiceFillKind,
          Set(SavingThrowOutcomeHoleKind),
          BattleHitPointOwner,
        ),
        resolveAfterHit(
          SavingThrowOutcomeFillKind,
          Set(),
          BattleActiveEffectOwner,
        ),
      ),
    ),
  }

  action doRouteEscapeCheck = all {
    qSurface == TurnStartSaveCleanupRouteSurface,
    recordSurface(
      EscapeCheckRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(AbilityCheckHoleKind), BattleAbilityCheckOwner),
        resolveAfterHit(AbilityCheckFillKind, Set(), BattleAbilityCheckOwner),
      ),
    ),
  }

  action doRouteEscapeConditionCleanup = all {
    qSurface == EscapeCheckRouteSurface,
    recordSurface(
      EscapeConditionCleanupRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(AbilityCheckHoleKind), BattleConditionLifecycleOwner),
        resolveAfterHit(AbilityCheckFillKind, Set(), BattleConditionLifecycleOwner),
      ),
    ),
  }

  action doRouteEscapeConcentrationCleanup = all {
    qSurface == EscapeConditionCleanupRouteSurface,
    recordSurface(
      EscapeConcentrationCleanupRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(AbilityCheckHoleKind), BattleConcentrationOwner),
        resolveAfterHit(AbilityCheckFillKind, Set(), BattleConcentrationOwner),
      ),
    ),
  }

  action doRouteIlluminationEffect = all {
    qSurface == EscapeConcentrationCleanupRouteSurface,
    recordSurface(
      IlluminationEffectRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(InterruptDecisionHoleKind), BattleActiveEffectOwner),
        resolveAfterHit(
          InterruptDecisionFillKind,
          Set(RolledDiceHoleKind),
          BattleActiveEffectOwner,
        ),
      ),
    ),
  }

  action doRouteIlluminationConcentration = all {
    qSurface == IlluminationEffectRouteSurface,
    recordSurface(
      IlluminationConcentrationRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(InterruptDecisionHoleKind), BattleConcentrationOwner),
        resolveAfterHit(
          InterruptDecisionFillKind,
          Set(RolledDiceHoleKind),
          BattleConcentrationOwner,
        ),
      ),
    ),
  }

  action doRouteIlluminationConcentrationBreak = all {
    qSurface == IlluminationConcentrationRouteSurface,
    recordSurface(
      IlluminationConcentrationBreakRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(), BattleConcentrationOwner),
        resolveAfterHitWithoutFill(Set(), BattleConcentrationOwner),
      ),
    ),
  }

  action doRouteIlluminationEffectCleanup = all {
    qSurface == IlluminationConcentrationBreakRouteSurface,
    recordSurface(
      IlluminationEffectCleanupRouteSurface,
      List(
        startRoute,
        discoverAfterHit(Set(), BattleActiveEffectOwner),
        resolveAfterHitWithoutFill(Set(), BattleActiveEffectOwner),
      ),
    ),
  }

  action step = any {
    doRouteInterruptDecision,
    doRouteSaveGatedInterruptDecision,
    doRouteSlotSpend,
    doRouteFreeCastSpend,
    doRouteSaveGatedSlotAndActionEconomySpend,
    doRouteAttackDamage,
    doRouteSaveGatedCondition,
    doRouteSaveGatedConcentration,
    doRouteTurnStartDamage,
    doRouteTurnStartSaveCleanup,
    doRouteEscapeCheck,
    doRouteEscapeConditionCleanup,
    doRouteEscapeConcentrationCleanup,
    doRouteIlluminationEffect,
    doRouteIlluminationConcentration,
    doRouteIlluminationConcentrationBreak,
    doRouteIlluminationEffectCleanup,
  }
}
