// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING

module battleRuntimeAcidArrowTimingMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type AcidArrowScenario = | HitScenario | HitComplete | MissScenario | MissComplete
  type AcidArrowHole = | TargetChoice | AttackRoll | InitialDamageRoll | LaterDamageRoll

  type AcidArrowTimingWitnessState = {
    qScenario: AcidArrowScenario,
    qCurrentTurnRole: str,
    qTargetHp: int,
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qDelayedDamageActive: bool,
    protocol: WitnessProtocol[AcidArrowHole],
  }

  var qState: AcidArrowTimingWitnessState

  pure def qScenario: AcidArrowScenario = qState.qScenario
  pure def qCurrentTurnRole: str = qState.qCurrentTurnRole
  pure def qTargetHp: int = qState.qTargetHp
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qDelayedDamageActive: bool = qState.qDelayedDamageActive
  pure def openHoles: Set[AcidArrowHole] = qState.protocol.holes

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val targetInitialHp: int = 30
  pure val noHoles: Set[AcidArrowHole] = Set()

  pure def damageAfter(hp: int, damage: int): int =
    if (hp - damage < 0) 0 else hp - damage

  pure def acidArrowMissDamage(initialDamageRoll: int): int =
    initialDamageRoll / 2

  pure def protocolFor(
    holes: Set[AcidArrowHole],
    result: WitnessResult,
  ): WitnessProtocol[AcidArrowHole] = {
    holes: holes,
    result: result,
  }

  action recordAcidArrowState(
    scenario: AcidArrowScenario,
    currentTurnRole: str,
    targetHp: int,
    actionAvailable: bool,
    spellAvailable: bool,
    delayedDamageActive: bool,
    holes: Set[AcidArrowHole],
    result: WitnessResult,
  ): bool = all {
    qState' = {
      qScenario: scenario,
      qCurrentTurnRole: currentTurnRole,
      qTargetHp: targetHp,
      qActionAvailable: actionAvailable,
      qSpellAvailable: spellAvailable,
      qDelayedDamageActive: delayedDamageActive,
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
      false,
      noHoles,
      WResolved,
    )

  action init = recordAcidArrowState(
    HitScenario,
    casterTurnRole,
    targetInitialHp,
    true,
    true,
    false,
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
      false,
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
      false,
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
      false,
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
      false,
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
        true,
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
        false,
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
      qDelayedDamageActive,
      noHoles,
      WResolved,
    ),
  }

  action doDiscoverLaterDamage = all {
    qScenario == HitScenario,
    qCurrentTurnRole == targetTurnRole,
    qDelayedDamageActive,
    openHoles == noHoles,
    recordAcidArrowState(
      HitScenario,
      targetTurnRole,
      qTargetHp,
      true,
      false,
      true,
      Set(LaterDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillLaterDamage = {
    nondet laterDiePip = Set(1, 4).oneOf()
    all {
      qScenario == HitScenario,
      qCurrentTurnRole == targetTurnRole,
      qDelayedDamageActive,
      openHoles == Set(LaterDamageRoll),
      recordAcidArrowState(
        HitComplete,
        casterTurnRole,
        damageAfter(qTargetHp, laterDiePip * 2),
        true,
        false,
        false,
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
    not(qDelayedDamageActive),
    recordAcidArrowState(
      MissComplete,
      casterTurnRole,
      qTargetHp,
      true,
      false,
      false,
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
