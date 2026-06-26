// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration: an effect ends
//   when its creator loses Concentration; voluntary end requires no action;
//   another Concentration effect breaks the prior one; damage offers a
//   Constitution Saving Throw with DC max(10, half damage), capped at 30.
// - UBIQUITOUS_LANGUAGE.md: Concentration, Spell Effect, Saving Throw.
module battleRuntimeConcentrationBreakTeardownRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | ConcentrationSavingThrow | ConcentrationBreakTeardown

  type ConcentrationBreakTeardownScenario =
    | Init
    | ConcentrationSpellCast
    | DamageSaveNeeded
    | DamageFailedTeardownBeforeNextCommand
    | VoluntaryEndTeardown
    | ReplacementTeardownBeforeNewEffect

  type WitnessState = {
    qScenario: ConcentrationBreakTeardownScenario,
    qDamageTaken: int,
    qSaveDc: int,
    qSaveRollTotal: int,
    qConcentrationSaveOffered: bool,
    qCasterConcentrating: bool,
    qBlurredEffectCount: int,
    qSpellSlotExpended: int,
    qTeardownBeforeNextCommand: bool,
    qReplacementStartedAfterTeardown: bool,
    protocol: WitnessProtocol[WitnessHole],
    qRoute: List[ReducerRouteEvent],
  }

  var qState: WitnessState

  pure def qRoute: List[ReducerRouteEvent] = qState.qRoute

  pure def scimitarDamage(diePip: int): int = diePip + 2

  pure def concentrationSaveDcForDamage(damageTaken: int): int =
    if (damageTaken / 2 > 10)
      if (damageTaken / 2 > 30) 30 else damageTaken / 2
    else
      10

  action recordProjection(
    scenario: ConcentrationBreakTeardownScenario,
    damageTaken: int,
    saveDc: int,
    saveRollTotal: int,
    concentrationSaveOffered: bool,
    casterConcentrating: bool,
    blurredEffectCount: int,
    spellSlotExpended: int,
    teardownBeforeNextCommand: bool,
    replacementStartedAfterTeardown: bool,
    protocol: WitnessProtocol[WitnessHole],
    route: List[ReducerRouteEvent],
  ): bool = all {
    qState' = {
      qScenario: scenario,
      qDamageTaken: damageTaken,
      qSaveDc: saveDc,
      qSaveRollTotal: saveRollTotal,
      qConcentrationSaveOffered: concentrationSaveOffered,
      qCasterConcentrating: casterConcentrating,
      qBlurredEffectCount: blurredEffectCount,
      qSpellSlotExpended: spellSlotExpended,
      qTeardownBeforeNextCommand: teardownBeforeNextCommand,
      qReplacementStartedAfterTeardown: replacementStartedAfterTeardown,
      protocol: protocol,
      qRoute: route,
    },
  }

  pure def concentrationCastRoute(route: List[ReducerRouteEvent]): List[ReducerRouteEvent] =
    route
      .append(
        routeDiscoverBattleActs(
          ConcentrationTeardownRouteSubject,
          Set(),
          BattleSpellSlotAndActionEconomyOwner,
        )
      )
      .append(
        routeResolveBattleSubjectWithoutFill(
          ConcentrationTeardownRouteSubject,
          Set(),
          BattleConcentrationOwner,
        )
      )

  action init = recordProjection(
    Init,
    0,
    0,
    0,
    false,
    false,
    0,
    0,
    false,
    false,
    witnessInit(ConcentrationBreakTeardown),
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doCastConcentrationSpell = all {
    qState.qScenario == Init,
    recordProjection(
      ConcentrationSpellCast,
      0,
      0,
      0,
      false,
      true,
      1,
      1,
      false,
      false,
      witnessResolved(ConcentrationBreakTeardown),
      concentrationCastRoute(qRoute),
    ),
  }

  action doDamageRequestsConcentrationSave = {
    nondet damageDiePip = Set(1, 4).oneOf()
    val damageTaken = scimitarDamage(damageDiePip)
    all {
      qState.qScenario == ConcentrationSpellCast,
      recordProjection(
        DamageSaveNeeded,
        damageTaken,
        concentrationSaveDcForDamage(damageTaken),
        0,
        true,
        true,
        1,
        1,
        false,
        false,
        witnessNeedsHoles(Set(ConcentrationSavingThrow)),
        qRoute.append(
          routeResolveBattleSubject(
            ConcentrationTeardownRouteSubject,
            RolledDiceFillKind,
            Set(ConcentrationSavingThrowHoleKind),
            BattleConcentrationOwner,
          )
        ),
      ),
    }
  }

  action doFailConcentrationSave = {
    nondet saveRollTotal = Set(1, 9).oneOf()
    all {
      qState.qScenario == DamageSaveNeeded,
      saveRollTotal < qState.qSaveDc,
      recordProjection(
        DamageFailedTeardownBeforeNextCommand,
        qState.qDamageTaken,
        qState.qSaveDc,
        saveRollTotal,
        false,
        false,
        0,
        1,
        true,
        false,
        witnessResolved(ConcentrationBreakTeardown),
        qRoute.append(
          routeResolveBattleSubject(
            ConcentrationTeardownRouteSubject,
            ConcentrationSavingThrowFillKind,
            Set(),
            BattleConcentrationOwner,
          )
        ),
      ),
    }
  }

  action doVoluntaryEndConcentration = all {
    qState.qScenario == Init,
    recordProjection(
      VoluntaryEndTeardown,
      0,
      0,
      0,
      false,
      false,
      0,
      1,
      true,
      false,
      witnessResolved(ConcentrationBreakTeardown),
      concentrationCastRoute(qRoute).append(
        routeResolveBattleSubjectWithoutFill(
          ConcentrationTeardownRouteSubject,
          Set(),
          BattleConcentrationOwner,
        )
      ),
    ),
  }

  action doCastReplacementConcentrationSpell = all {
    qState.qScenario == Init,
    recordProjection(
      ReplacementTeardownBeforeNewEffect,
      0,
      0,
      0,
      false,
      true,
      1,
      1,
      false,
      true,
      witnessResolved(ConcentrationBreakTeardown),
      concentrationCastRoute(qRoute),
    ),
  }

  action step = any {
    doCastConcentrationSpell,
    doDamageRequestsConcentrationSave,
    doFailConcentrationSave,
    doVoluntaryEndConcentration,
    doCastReplacementConcentrationSpell,
  }
}
