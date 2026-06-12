// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
//
// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#The Order of Combat: combat
//   advances through initiative-ordered turns and then the next round.
// - .references/srd-5.2.1/Rules-Glossary.md#Simultaneous Effects: multiple
//   same-timing effects on a turn have a table-chosen order.
// - .references/srd-5.2.1/Rules-Glossary.md#Reaction and #Ready Action:
//   effects may last until the start of a creature's next turn.
// - .references/srd-5.2.1/Rules-Glossary.md#Burning: start-of-turn damage is a
//   rules-defined turn-boundary trigger shape.
// - UBIQUITOUS_LANGUAGE.md: Boundary Crossing, Spell Effect, Reaction, Timer.
//
// Boundary: this is a bounded fixture-world composition witness, not an
// exhaustive same-timing ordering model. It covers one source/target pair with
// a target start-turn damage/save hook, a target end-turn damage-and-expiry
// hook, a source "until next turn" start-turn expiry, one start-turn ongoing
// feature expiry, and one end-turn ongoing feature expiry across two turn
// advancements. Death Saving Throw ordering is intentionally outside this
// witness; ASSUMPTIONS.md#A6 records the current owner-decision issue.
module battleRuntimeTurnBoundaryEffectLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | TurnStartDamage | TurnStartSave | TurnEndDamage | TurnBoundaryLifecycle

  type TurnBoundaryLifecycleScenario =
    | Init
    | TargetStartTurnResolved
    | SourceNextTurnResolved

  type TurnBoundaryActor = | SourceTurn | TargetTurn

  type TurnBoundaryHoleOrder =
    | NoBoundaryHoles
    | TurnStartDamageThenSave
    | TurnEndDamageOnly

  type WitnessState = {
    qScenario: TurnBoundaryLifecycleScenario,
    qActor: TurnBoundaryActor,
    qRound: int,
    qTargetHp: int,
    qTurnStartDamageActive: bool,
    qTurnEndDamageActive: bool,
    qUntilNextTurnActive: bool,
    qStartTurnOngoingFeatureActive: bool,
    qEndTurnOngoingFeatureActive: bool,
    qTurnStartDamageAppliedBeforeEndDamage: bool,
    qTurnEndDamageAppliedBeforeExpiry: bool,
    qEndTurnOngoingExpiredAtTargetEnd: bool,
    qUntilNextTurnExpiredAtSourceStart: bool,
    qStartTurnOngoingExpiredAtSourceStart: bool,
    qTurnStartDurationExpiredAfterRoundTick: bool,
    qLastHoleOrder: TurnBoundaryHoleOrder,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qScenario: TurnBoundaryLifecycleScenario = qState.qScenario
  pure def qActor: TurnBoundaryActor = qState.qActor
  pure def qRound: int = qState.qRound
  pure def qTargetHp: int = qState.qTargetHp
  pure def qTurnStartDamageActive: bool = qState.qTurnStartDamageActive
  pure def qTurnEndDamageActive: bool = qState.qTurnEndDamageActive
  pure def qUntilNextTurnActive: bool = qState.qUntilNextTurnActive
  pure def qStartTurnOngoingFeatureActive: bool = qState.qStartTurnOngoingFeatureActive
  pure def qEndTurnOngoingFeatureActive: bool = qState.qEndTurnOngoingFeatureActive
  pure def qTurnStartDamageAppliedBeforeEndDamage: bool = qState.qTurnStartDamageAppliedBeforeEndDamage
  pure def qTurnEndDamageAppliedBeforeExpiry: bool = qState.qTurnEndDamageAppliedBeforeExpiry
  pure def qEndTurnOngoingExpiredAtTargetEnd: bool = qState.qEndTurnOngoingExpiredAtTargetEnd
  pure def qUntilNextTurnExpiredAtSourceStart: bool = qState.qUntilNextTurnExpiredAtSourceStart
  pure def qStartTurnOngoingExpiredAtSourceStart: bool = qState.qStartTurnOngoingExpiredAtSourceStart
  pure def qTurnStartDurationExpiredAfterRoundTick: bool = qState.qTurnStartDurationExpiredAfterRoundTick
  pure def qLastHoleOrder: TurnBoundaryHoleOrder = qState.qLastHoleOrder

  action recordProjection(
    scenario: TurnBoundaryLifecycleScenario,
    actor: TurnBoundaryActor,
    round: int,
    targetHp: int,
    turnStartDamageActive: bool,
    turnEndDamageActive: bool,
    untilNextTurnActive: bool,
    startTurnOngoingFeatureActive: bool,
    endTurnOngoingFeatureActive: bool,
    turnStartDamageAppliedBeforeEndDamage: bool,
    turnEndDamageAppliedBeforeExpiry: bool,
    endTurnOngoingExpiredAtTargetEnd: bool,
    untilNextTurnExpiredAtSourceStart: bool,
    startTurnOngoingExpiredAtSourceStart: bool,
    turnStartDurationExpiredAfterRoundTick: bool,
    lastHoleOrder: TurnBoundaryHoleOrder,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qScenario: scenario,
      qActor: actor,
      qRound: round,
      qTargetHp: targetHp,
      qTurnStartDamageActive: turnStartDamageActive,
      qTurnEndDamageActive: turnEndDamageActive,
      qUntilNextTurnActive: untilNextTurnActive,
      qStartTurnOngoingFeatureActive: startTurnOngoingFeatureActive,
      qEndTurnOngoingFeatureActive: endTurnOngoingFeatureActive,
      qTurnStartDamageAppliedBeforeEndDamage: turnStartDamageAppliedBeforeEndDamage,
      qTurnEndDamageAppliedBeforeExpiry: turnEndDamageAppliedBeforeExpiry,
      qEndTurnOngoingExpiredAtTargetEnd: endTurnOngoingExpiredAtTargetEnd,
      qUntilNextTurnExpiredAtSourceStart: untilNextTurnExpiredAtSourceStart,
      qStartTurnOngoingExpiredAtSourceStart: startTurnOngoingExpiredAtSourceStart,
      qTurnStartDurationExpiredAfterRoundTick: turnStartDurationExpiredAfterRoundTick,
      qLastHoleOrder: lastHoleOrder,
      protocol: protocol,
    },
  }

  action init = recordProjection(
    Init,
    SourceTurn,
    1,
    10,
    true,
    true,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    NoBoundaryHoles,
    witnessInit(TurnBoundaryLifecycle),
  )

  action doResolveTargetStartTurn = all {
    qScenario == Init,
    recordProjection(
      TargetStartTurnResolved,
      TargetTurn,
      1,
      8,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      TurnStartDamageThenSave,
      witnessResolved(TurnBoundaryLifecycle),
    ),
  }

  action doResolveSourceNextTurn = all {
    qScenario == TargetStartTurnResolved,
    recordProjection(
      SourceNextTurnResolved,
      SourceTurn,
      2,
      5,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      true,
      true,
      TurnEndDamageOnly,
      witnessResolved(TurnBoundaryLifecycle),
    ),
  }

  action step = any {
    doResolveTargetStartTurn,
    doResolveSourceNextTurn,
  }
}
