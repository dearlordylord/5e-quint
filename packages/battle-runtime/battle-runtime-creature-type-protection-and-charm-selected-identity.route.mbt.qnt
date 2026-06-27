// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Animal Friendship
//   defines Beast target admission, Wisdom save charm, and source/allied damage
//   ending the spell.
// - .references/srd-5.2.1/Spells/Descriptions-M-P.md#Protection from Evil
//   and Good defines willing touched target admission, scoped creature-type
//   protection, attack-roll Disadvantage, possession/charm/fright prevention,
//   relevant saving-throw Advantage, and Concentration ownership.
// - .references/srd-5.2.1/Rules-Glossary.md#Charmed [Condition],
//   #Possession, and #Concentration define condition, possession, and effect
//   lifecycle language.
// - UBIQUITOUS_LANGUAGE.md: Charmed, Concentration, Spell Invocation, Spell
//   Effect, and D20 Rolls.
module battleRuntimeCreatureTypeProtectionAndCharmSelectedIdentityRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type ProtectionCharmRouteSurface =
    | FreshRouteSurface
    | CreatureTypeTargetAdmissionRouteSurface
    | FailedSaveCharmedRouteSurface
    | SourceDamageCharmBreakRouteSurface
    | ProtectionTargetActiveEffectRouteSurface
    | ProtectionAttackRollModeRouteSurface
    | ProtectionCharmPossessionPreventionRouteSurface
    | ProtectionRelevantSaveRollModeRouteSurface

  var qSurface: ProtectionCharmRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def noHoles: Set[BattleHoleFamilyKind] = Set()

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

  pure def activeEffectDiscovery(
    holes: Set[BattleHoleFamilyKind],
  ): ReducerRouteEvent =
    discover(
      ProtectionCharmActiveEffectRouteSubject,
      holes,
      BattleSpellSlotAndActionEconomyOwner,
    )

  pure def saveCharmedPrefix: List[ReducerRouteEvent] =
    List(
      startRoute,
      activeEffectDiscovery(Set(TargetChoiceHoleKind, SavingThrowOutcomeHoleKind)),
      resolve(
        ProtectionCharmActiveEffectRouteSubject,
        TargetChoiceFillKind,
        Set(SavingThrowOutcomeHoleKind),
        BattleTargetSelectionOwner,
      ),
      resolve(
        ProtectionCharmActiveEffectRouteSubject,
        SavingThrowOutcomeFillKind,
        noHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      resolveWithoutFill(
        ProtectionCharmActiveEffectRouteSubject,
        noHoles,
        BattleConditionLifecycleOwner,
      ),
      resolveWithoutFill(
        ProtectionCharmActiveEffectRouteSubject,
        noHoles,
        BattleActiveEffectOwner,
      ),
    )

  action recordRoute(
    surface: ProtectionCharmRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordRoute(FreshRouteSurface, List(startRoute))

  action doDiscoverAnimalFriendshipBeastTargetAdmission = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      CreatureTypeTargetAdmissionRouteSurface,
      qRoute.append(
        discover(
          CreatureTypeTargetAdmissionRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        )
      ),
    ),
  }

  action doResolveAnimalFriendshipFailedSaveCharmed = all {
    qSurface == FreshRouteSurface,
    recordRoute(FailedSaveCharmedRouteSurface, saveCharmedPrefix),
  }

  action doResolveAnimalFriendshipCasterDamageBreak = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      SourceDamageCharmBreakRouteSurface,
      saveCharmedPrefix
        .append(
          resolveWithoutFill(
            CharmSourceDamageBreakRouteSubject,
            noHoles,
            BattleHitPointOwner,
          )
        )
        .append(
          resolveWithoutFill(
            CharmSourceDamageBreakRouteSubject,
            noHoles,
            BattleConditionLifecycleOwner,
          )
        )
        .append(
          resolveWithoutFill(
            CharmSourceDamageBreakRouteSubject,
            noHoles,
            BattleActiveEffectOwner,
          )
        ),
    ),
  }

  action doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      ProtectionTargetActiveEffectRouteSurface,
      List(
        startRoute,
        activeEffectDiscovery(Set(TargetChoiceHoleKind)),
        resolve(
          ProtectionCharmActiveEffectRouteSubject,
          TargetChoiceFillKind,
          noHoles,
          BattleTargetSelectionOwner,
        ),
        resolveWithoutFill(
          ProtectionCharmActiveEffectRouteSubject,
          noHoles,
          BattleActiveEffectOwner,
        ),
        resolveWithoutFill(
          ProtectionCharmActiveEffectRouteSubject,
          noHoles,
          BattleConcentrationOwner,
        ),
      ),
    ),
  }

  action doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      ProtectionAttackRollModeRouteSurface,
      List(
        startRoute,
        discover(
          ProtectionCharmActiveEffectRouteSubject,
          noHoles,
          BattleActiveEffectOwner,
        ),
        resolveWithoutFill(
          ProtectionCharmActiveEffectRouteSubject,
          noHoles,
          BattleAttackRollOwner,
        ),
      ),
    ),
  }

  action doPreventProtectionFromEvilAndGoodScopedCharmAndPossession = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      ProtectionCharmPossessionPreventionRouteSurface,
      List(
        startRoute,
        discover(
          ProtectionCharmActiveEffectRouteSubject,
          noHoles,
          BattleActiveEffectOwner,
        ),
        resolveWithoutFill(
          ProtectionCharmActiveEffectRouteSubject,
          noHoles,
          BattleConditionLifecycleOwner,
        ),
        resolveWithoutFill(
          ProtectionCharmActiveEffectRouteSubject,
          noHoles,
          BattleCreatureStateOwner,
        ),
      ),
    ),
  }

  action doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage = all {
    qSurface == FreshRouteSurface,
    recordRoute(
      ProtectionRelevantSaveRollModeRouteSurface,
      List(
        startRoute,
        discover(
          ProtectionCharmActiveEffectRouteSubject,
          noHoles,
          BattleActiveEffectOwner,
        ),
        resolveWithoutFill(
          ProtectionCharmActiveEffectRouteSubject,
          noHoles,
          BattleSavingThrowRollModeOwner,
        ),
      ),
    ),
  }

  action step = any {
    doDiscoverAnimalFriendshipBeastTargetAdmission,
    doResolveAnimalFriendshipFailedSaveCharmed,
    doResolveAnimalFriendshipCasterDamageBreak,
    doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection,
    doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage,
    doPreventProtectionFromEvilAndGoodScopedCharmAndPossession,
    doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage,
  }
}
