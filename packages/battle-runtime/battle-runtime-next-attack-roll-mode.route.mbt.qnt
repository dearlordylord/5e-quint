// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Advantage/Disadvantage defines
//   Advantage and Disadvantage as d20 roll modes.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack defines Attack
//   Rolls as the d20 roll used to determine whether an attack hits.
// - .references/srd-5.2.1/Equipment.md#Sap and #Vex define on-hit next Attack
//   Roll Disadvantage/Advantage riders with source-turn expiration boundaries.
// - .references/srd-5.2.1/Rules-Glossary.md#Help defines an Assist an Attack
//   Roll next-roll Advantage rider and a start-of-next-turn expiration boundary.
// - .references/srd-5.2.1/Classes/Rogue.md#Level 3: Steady Aim defines a
//   Bonus Action self-benefit that grants Advantage on the beneficiary's next
//   Attack Roll on the current turn, with current-turn expiration.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Guiding Bolt,
//   Descriptions-Q-R.md#Ray of Enfeeblement, and
//   Descriptions-S-Z.md#Vicious Mockery define spell-produced next Attack Roll
//   Advantage/Disadvantage riders from attack-hit or save/effect outcomes.
// - UBIQUITOUS_LANGUAGE.md: Advantage, Disadvantage, Attack Roll, Spell Effect,
//   Mastery Property, and Action Lifecycle.
module battleRuntimeNextAttackRollModeRouteMbt {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeNextAttackRollModeRouteFacts.* from "./battle-runtime-next-attack-roll-mode-route-facts"

  type NextAttackRollModeRouteSurface =
    | FreshRouteSurface
    | AdvantageEffectActiveRouteSurface
    | DisadvantageEffectActiveRouteSurface
    | AdvantageEffectConsumedRouteSurface
    | DisadvantageEffectConsumedRouteSurface
    | AdvantageEffectExpiredRouteSurface
    | DisadvantageEffectExpiredRouteSurface

  var qSurface: NextAttackRollModeRouteSurface
  var qRoute: List[ReducerRouteEvent]
  var qFacts: List[NextAttackRollModeRouteFact]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val attackRollHoles: Set[BattleHoleFamilyKind] = Set(AttackRollHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] = Set(RolledDiceHoleKind)
  pure val savingThrowOutcomeHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)

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

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def advantageAdmissionFacts: List[NextAttackRollModeRouteFact] =
    List(
      RouteNextAttackRollModeSource({ source: HostAttackHitDamageOutcome }),
      RouteNextAttackRollModeCarrier({ carrier: HostOutcomeTargetCarrier }),
      RouteNextAttackRollModeAttacker({ attacker: SourceAttacker }),
      RouteNextAttackRollModeTargetScope({
        targetScope: AttackAgainstAffectedTargetOnly,
      }),
      RouteNextAttackRollModeExpirationBoundary({
        boundary: BeforeSourceNextTurnEnds,
      }),
      RouteNextAttackRollModeDirection({
        direction: NextAttackRollAdvantage,
      }),
      RouteNextAttackRollModeAdmitted,
    )

  pure def disadvantageAdmissionFacts: List[NextAttackRollModeRouteFact] =
    List(
      RouteNextAttackRollModeSource({ source: HostSaveEffectOutcome }),
      RouteNextAttackRollModeCarrier({ carrier: HostOutcomeTargetCarrier }),
      RouteNextAttackRollModeAttacker({ attacker: AffectedTargetAttacker }),
      RouteNextAttackRollModeTargetScope({ targetScope: AttackAgainstAnyTarget }),
      RouteNextAttackRollModeExpirationBoundary({
        boundary: BeforeAffectedTargetNextTurnEnds,
      }),
      RouteNextAttackRollModeDirection({
        direction: NextAttackRollDisadvantage,
      }),
      RouteNextAttackRollModeAdmitted,
    )

  pure def attackHitAdvantageAdmissionRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(
        SpellAttackRouteSubject,
        targetChoiceHoles,
        BattleActionEconomyOwner,
      ),
      resolveRoute(
        SpellAttackRouteSubject,
        TargetChoiceFillKind,
        attackRollHoles,
        BattleTargetSelectionOwner,
      ),
      resolveRoute(
        SpellAttackRouteSubject,
        AttackRollFillKind,
        rolledDiceHoles,
        BattleAttackRollOwner,
      ),
      resolveRoute(
        SpellAttackRouteSubject,
        RolledDiceFillKind,
        noHoles,
        BattleHitPointOwner,
      ),
      resolveRouteWithoutFill(
        NextAttackRollModeRouteSubject,
        noHoles,
        BattleActiveEffectOwner,
      ),
    )

  pure def saveEffectDisadvantageAdmissionRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(
        SaveGatedSpellRouteSubject,
        targetChoiceHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      resolveRoute(
        SaveGatedSpellRouteSubject,
        TargetChoiceFillKind,
        savingThrowOutcomeHoles,
        BattleTargetSelectionOwner,
      ),
      resolveRoute(
        SaveGatedSpellRouteSubject,
        SavingThrowOutcomeFillKind,
        noHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      resolveRouteWithoutFill(
        NextAttackRollModeRouteSubject,
        noHoles,
        BattleActiveEffectOwner,
      ),
    )

  pure def projectNextAttackRollMode: ReducerRouteEvent =
    resolveRouteWithoutFill(
      NextAttackRollModeRouteSubject,
      noHoles,
      BattleAttackRollModeOwner,
    )

  pure def cleanupActiveEffect: ReducerRouteEvent =
    resolveRouteWithoutFill(
      NextAttackRollModeRouteSubject,
      noHoles,
      BattleActiveEffectOwner,
    )

  pure def expireAtTurnBoundary: ReducerRouteEvent =
    resolveRouteWithoutFill(
      NextAttackRollModeRouteSubject,
      noHoles,
      BattleTurnBoundaryOwner,
    )

  action recordSurface(
    surface: NextAttackRollModeRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[NextAttackRollModeRouteFact],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute), List())

  action doAdmitHostAttackHitNextAttackAdvantageEffect = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      AdvantageEffectActiveRouteSurface,
      qRoute.concat(attackHitAdvantageAdmissionRoute),
      advantageAdmissionFacts,
    ),
  }

  action doAdmitHostEffectNextAttackDisadvantageEffect = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      DisadvantageEffectActiveRouteSurface,
      qRoute.concat(saveEffectDisadvantageAdmissionRoute),
      disadvantageAdmissionFacts,
    ),
  }

  action doProjectAdvantageOnLaterAttackAgainstAffectedTarget = all {
    qSurface == AdvantageEffectActiveRouteSurface,
    recordSurface(
      AdvantageEffectConsumedRouteSurface,
      qRoute.append(projectNextAttackRollMode).append(cleanupActiveEffect),
      qFacts
        .append(RouteNextAttackRollModeProjected)
        .append(RouteNextAttackRollModeConsumed)
        .append(RouteNextAttackRollModeCleanedUp),
    ),
  }

  action doProjectDisadvantageOnAffectedTargetNextAttack = all {
    qSurface == DisadvantageEffectActiveRouteSurface,
    recordSurface(
      DisadvantageEffectConsumedRouteSurface,
      qRoute.append(projectNextAttackRollMode).append(cleanupActiveEffect),
      qFacts
        .append(RouteNextAttackRollModeProjected)
        .append(RouteNextAttackRollModeConsumed)
        .append(RouteNextAttackRollModeCleanedUp),
    ),
  }

  action doExpireAdvantageAtBoundary = all {
    qSurface == AdvantageEffectActiveRouteSurface,
    recordSurface(
      AdvantageEffectExpiredRouteSurface,
      qRoute.append(expireAtTurnBoundary).append(cleanupActiveEffect),
      qFacts
        .append(RouteNextAttackRollModeExpired)
        .append(RouteNextAttackRollModeCleanedUp),
    ),
  }

  action doExpireDisadvantageAtBoundary = all {
    qSurface == DisadvantageEffectActiveRouteSurface,
    recordSurface(
      DisadvantageEffectExpiredRouteSurface,
      qRoute.append(expireAtTurnBoundary).append(cleanupActiveEffect),
      qFacts
        .append(RouteNextAttackRollModeExpired)
        .append(RouteNextAttackRollModeCleanedUp),
    ),
  }

  action doStutterAfterCleanup = all {
    qSurface.in(Set(
      AdvantageEffectConsumedRouteSurface,
      DisadvantageEffectConsumedRouteSurface,
      AdvantageEffectExpiredRouteSurface,
      DisadvantageEffectExpiredRouteSurface,
    )),
    recordSurface(qSurface, qRoute, qFacts),
  }

  action step = any {
    doAdmitHostAttackHitNextAttackAdvantageEffect,
    doAdmitHostEffectNextAttackDisadvantageEffect,
    doProjectAdvantageOnLaterAttackAgainstAffectedTarget,
    doProjectDisadvantageOnAffectedTargetNextAttack,
    doExpireAdvantageAtBoundary,
    doExpireDisadvantageAtBoundary,
    doStutterAfterCleanup,
  }
}
