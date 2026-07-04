// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING

module battleRuntimeAcidArrowTimingMbt {
  import battleRuntimeAcidArrow.* from "./battle-runtime-acid-arrow"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type AcidArrowScenario = | HitScenario | HitComplete | MissScenario | MissComplete
  type AcidArrowHole = | TargetChoice | AttackRoll | InitialDamageRoll | LaterDamageRoll

  type AcidArrowTimingWitnessState = {
    qScenario: AcidArrowScenario,
    qCurrentTurnRole: AcidArrowTurnRole,
    qTargetHp: int,
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qDelayedDamageTiming: AcidArrowDelayedDamageTiming,
    protocol: WitnessProtocol[AcidArrowHole],
  }

  var qState: AcidArrowTimingWitnessState

  pure def qScenario: AcidArrowScenario = qState.qScenario
  pure def qCurrentTurnRole: AcidArrowTurnRole = qState.qCurrentTurnRole
  pure def qTargetHp: int = qState.qTargetHp
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qDelayedDamageTiming: AcidArrowDelayedDamageTiming = qState.qDelayedDamageTiming
  pure def openHoles: Set[AcidArrowHole] = qState.protocol.holes

  pure val casterTurnRole: AcidArrowTurnRole = AcidArrowCasterTurn
  pure val targetTurnRole: AcidArrowTurnRole = AcidArrowTargetTurn
  pure val targetInitialHp: int = 30
  pure val noHoles: Set[AcidArrowHole] = Set()

  pure def damageAfter(hp: int, damage: int): int =
    if (hp - damage < 0) 0 else hp - damage

  pure def protocolFor(
    holes: Set[AcidArrowHole],
    result: WitnessResult,
  ): WitnessProtocol[AcidArrowHole] = {
    holes: holes,
    result: result,
  }

  action recordAcidArrowState(
    scenario: AcidArrowScenario,
    currentTurnRole: AcidArrowTurnRole,
    targetHp: int,
    actionAvailable: bool,
    spellAvailable: bool,
    delayedDamageTiming: AcidArrowDelayedDamageTiming,
    holes: Set[AcidArrowHole],
    result: WitnessResult,
  ): bool = all {
    qState' = {
      qScenario: scenario,
      qCurrentTurnRole: currentTurnRole,
      qTargetHp: targetHp,
      qActionAvailable: actionAvailable,
      qSpellAvailable: spellAvailable,
      qDelayedDamageTiming: delayedDamageTiming,
      protocol: protocolFor(holes, result),
    },
  }

  action recordFreshScenario(scenario: AcidArrowScenario): bool =
    recordAcidArrowState(
      scenario,
      casterTurnRole,
      targetInitialHp,
      true,
      true,
      NoAcidArrowDelayedDamage,
      noHoles,
      WResolved,
    )

  action init = recordAcidArrowState(
    HitScenario,
    casterTurnRole,
    targetInitialHp,
    true,
    true,
    NoAcidArrowDelayedDamage,
    noHoles,
    WInit,
  )

  action doDiscoverAcidArrow = all {
    qScenario == HitScenario or qScenario == MissScenario,
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    openHoles == noHoles,
    recordAcidArrowState(
      qScenario,
      casterTurnRole,
      qTargetHp,
      true,
      true,
      NoAcidArrowDelayedDamage,
      Set(TargetChoice),
      WNeedsHoles,
    ),
  }

  action doFillTargetChoice = all {
    qScenario == HitScenario or qScenario == MissScenario,
    qCurrentTurnRole == casterTurnRole,
    openHoles == Set(TargetChoice),
    recordAcidArrowState(
      qScenario,
      casterTurnRole,
      qTargetHp,
      true,
      true,
      NoAcidArrowDelayedDamage,
      Set(AttackRoll),
      WNeedsHoles,
    ),
  }

  action doFillHitAttackRoll = all {
    qScenario == HitScenario,
    qCurrentTurnRole == casterTurnRole,
    openHoles == Set(AttackRoll),
    recordAcidArrowState(
      HitScenario,
      casterTurnRole,
      qTargetHp,
      true,
      true,
      NoAcidArrowDelayedDamage,
      Set(InitialDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillMissAttackRoll = all {
    qScenario == MissScenario,
    qCurrentTurnRole == casterTurnRole,
    openHoles == Set(AttackRoll),
    recordAcidArrowState(
      MissScenario,
      casterTurnRole,
      qTargetHp,
      true,
      true,
      NoAcidArrowDelayedDamage,
      Set(InitialDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillHitInitialDamage = {
    nondet initialDiePip = Set(1, 4).oneOf()
    all {
      qScenario == HitScenario,
      qCurrentTurnRole == casterTurnRole,
      openHoles == Set(InitialDamageRoll),
      recordAcidArrowState(
        HitScenario,
        casterTurnRole,
        damageAfter(qTargetHp, initialDiePip * 4),
        false,
        false,
        acidArrowDelayedDamageTiming(true),
        noHoles,
        WResolved,
      ),
    }
  }

  action doFillMissInitialDamage = {
    nondet initialDiePip = Set(1, 4).oneOf()
    all {
      qScenario == MissScenario,
      qCurrentTurnRole == casterTurnRole,
      openHoles == Set(InitialDamageRoll),
      recordAcidArrowState(
        MissScenario,
        casterTurnRole,
        damageAfter(qTargetHp, acidArrowMissDamage(initialDiePip * 4)),
        false,
        false,
        NoAcidArrowDelayedDamage,
        noHoles,
        WResolved,
      ),
    }
  }

  action doEndCasterTurn = all {
    qScenario == HitScenario or qScenario == MissScenario,
    qCurrentTurnRole == casterTurnRole,
    openHoles == noHoles,
    not(qActionAvailable),
    not(qSpellAvailable),
    recordAcidArrowState(
      qScenario,
      targetTurnRole,
      qTargetHp,
      true,
      false,
      qDelayedDamageTiming,
      noHoles,
      WResolved,
    ),
  }

  action doDiscoverLaterDamage = all {
    qScenario == HitScenario,
    qCurrentTurnRole == targetTurnRole,
    acidArrowDelayedDamageIsActive(qDelayedDamageTiming),
    openHoles == noHoles,
    recordAcidArrowState(
      HitScenario,
      targetTurnRole,
      qTargetHp,
      true,
      false,
      qDelayedDamageTiming,
      Set(LaterDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillLaterDamage = {
    nondet laterDiePip = Set(1, 4).oneOf()
    all {
      qScenario == HitScenario,
      qCurrentTurnRole == targetTurnRole,
      acidArrowDelayedDamageIsActive(qDelayedDamageTiming),
      openHoles == Set(LaterDamageRoll),
      recordAcidArrowState(
        HitComplete,
        casterTurnRole,
        damageAfter(qTargetHp, laterDiePip * 2),
        true,
        false,
        NoAcidArrowDelayedDamage,
        noHoles,
        WResolved,
      ),
    }
  }

  action doStartMissScenario = all {
    qScenario == HitComplete,
    openHoles == noHoles,
    recordFreshScenario(MissScenario),
  }

  action doEndTargetTurnAfterMiss = all {
    qScenario == MissScenario,
    qCurrentTurnRole == targetTurnRole,
    openHoles == noHoles,
    not(acidArrowDelayedDamageIsActive(qDelayedDamageTiming)),
    recordAcidArrowState(
      MissComplete,
      casterTurnRole,
      qTargetHp,
      true,
      false,
      NoAcidArrowDelayedDamage,
      noHoles,
      WResolved,
    ),
  }

  action step = any {
    doDiscoverAcidArrow,
    doFillTargetChoice,
    doFillHitAttackRoll,
    doFillMissAttackRoll,
    doFillHitInitialDamage,
    doFillMissInitialDamage,
    doEndCasterTurn,
    doDiscoverLaterDamage,
    doFillLaterDamage,
    doStartMissScenario,
    doEndTargetTurnAfterMiss,
  }
}
