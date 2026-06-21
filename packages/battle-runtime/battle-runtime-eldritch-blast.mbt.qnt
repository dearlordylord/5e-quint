// -*- mode: Bluespec; -*-

module battleRuntimeEldritchBlastMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole =
    | TargetChoice
    | ObjectTargetChoice
    | AttackRoll
    | SpellDamageRoll

  type EldritchBlastWitnessState = {
    qActionAvailable: bool,
    qTargetHp: int,
    qResolvedBeams: int,
    protocol: WitnessProtocol[Hole],
  }

  var qState: EldritchBlastWitnessState

  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qTargetHp: int = qState.qTargetHp
  pure def qResolvedBeams: int = qState.qResolvedBeams
  pure def openHoles: Set[Hole] = qState.protocol.holes

  pure def eldritchBlastState(
    actionAvailable: bool,
    targetHp: int,
    resolvedBeams: int,
    protocol: WitnessProtocol[Hole],
  ): EldritchBlastWitnessState = {
    qActionAvailable: actionAvailable,
    qTargetHp: targetHp,
    qResolvedBeams: resolvedBeams,
    protocol: protocol,
  }

  action init = all {
    qState' = eldritchBlastState(
      true,
      13,
      0,
      {
        holes: Set(TargetChoice, ObjectTargetChoice),
        result: WInit,
      }
    ),
  }

  action doFillTwoCreatureTargets = all {
    qActionAvailable,
    openHoles == Set(TargetChoice, ObjectTargetChoice),
    qState' = eldritchBlastState(
      qActionAvailable,
      qTargetHp,
      qResolvedBeams,
      witnessNeedsHoles(Set(AttackRoll))
    ),
  }

  action doFillFirstAttackMiss = all {
    qActionAvailable,
    qResolvedBeams == 0,
    openHoles == Set(AttackRoll),
    qState' = eldritchBlastState(
      qActionAvailable,
      qTargetHp,
      1,
      witnessNeedsHoles(Set(AttackRoll))
    ),
  }

  action doFillFirstAttackHit = all {
    qActionAvailable,
    qResolvedBeams == 0,
    openHoles == Set(AttackRoll),
    qState' = eldritchBlastState(
      qActionAvailable,
      qTargetHp,
      qResolvedBeams,
      witnessNeedsHoles(Set(SpellDamageRoll))
    ),
  }

  action doFillFirstDamageLow = all {
    qActionAvailable,
    qResolvedBeams == 0,
    openHoles == Set(SpellDamageRoll),
    qState' = eldritchBlastState(
      qActionAvailable,
      9,
      1,
      witnessNeedsHoles(Set(AttackRoll))
    ),
  }

  action doFillSecondAttackMiss = all {
    qActionAvailable,
    qResolvedBeams == 1,
    openHoles == Set(AttackRoll),
    qState' = eldritchBlastState(
      false,
      qTargetHp,
      2,
      witnessResolved(TargetChoice)
    ),
  }

  action doFillSecondAttackHit = all {
    qActionAvailable,
    qResolvedBeams == 1,
    openHoles == Set(AttackRoll),
    qState' = eldritchBlastState(
      qActionAvailable,
      qTargetHp,
      qResolvedBeams,
      witnessNeedsHoles(Set(SpellDamageRoll))
    ),
  }

  action doFillSecondDamageLow = all {
    qActionAvailable,
    qResolvedBeams == 1,
    openHoles == Set(SpellDamageRoll),
    qState' = eldritchBlastState(
      false,
      qTargetHp - 4,
      2,
      witnessResolved(TargetChoice)
    ),
  }

  action doRejectStaleAfterResolved = all {
    not(qActionAvailable),
    openHoles == Set(),
    qState' = eldritchBlastState(
      qActionAvailable,
      qTargetHp,
      qResolvedBeams,
      witnessInvalid(TargetChoice, WStaleSubject)
    ),
  }

  action step = any {
    doFillTwoCreatureTargets,
    doFillFirstAttackMiss,
    doFillFirstAttackHit,
    doFillFirstDamageLow,
    doFillSecondAttackMiss,
    doFillSecondAttackHit,
    doFillSecondDamageLow,
    doRejectStaleAfterResolved,
  }
}
