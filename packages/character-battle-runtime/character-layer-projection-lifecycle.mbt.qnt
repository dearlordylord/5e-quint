// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CHARACTER.LIFECYCLE.LAYER_PROJECTION
module characterLayerProjectionLifecycleMbt {
  // Draft: mutable creation state with holes.
  // Build: finalized build-only evidence from a legal draft.
  // Sheet: persistent in-play PC state.
  // BattleInitProjection: a boundary, not durable state; projects sheet/build facts into uniform battle creature init.
  // BattleRuntime: durable battle reducer state with subjects, holes/fills, turn/action resources, and combat vitals.
  // Settlement: a boundary, not durable state; writes accepted battle-owned deltas back to the sheet and preserves/rejects source-owned facts.
  type CharacterLifecycleLayer =
    | Draft
    | Build
    | Sheet
    | BattleInitProjection
    | BattleRuntime
    | Settlement

  type CharacterLifecycleFacts = {
    draftHasOpenHoles: bool,
    buildFinalized: bool,
    sheetOwnsHitPoints: bool,
    sheetCurrentHp: int,
    sheetMaxHp: int,
    battleInitCharacterCombatant: bool,
    battleRuntimeCharacterHp: int,
    battleRuntimeHpChanged: bool,
    settlementCurrentHp: int,
    settlementPersistedBattleHp: bool,
    buildIdentityUnchanged: bool,
  }

  var qLayer: CharacterLifecycleLayer
  var qDraftHasOpenHoles: bool
  var qBuildFinalized: bool
  var qSheetOwnsHitPoints: bool
  var qSheetCurrentHp: int
  var qSheetMaxHp: int
  var qBattleInitCharacterCombatant: bool
  var qBattleRuntimeCharacterHp: int
  var qBattleRuntimeHpChanged: bool
  var qSettlementCurrentHp: int
  var qSettlementPersistedBattleHp: bool
  var qBuildIdentityUnchanged: bool
  var qReplayIndex: int

  pure def emptyLifecycleFacts = {
    draftHasOpenHoles: false,
    buildFinalized: false,
    sheetOwnsHitPoints: false,
    sheetCurrentHp: 0,
    sheetMaxHp: 0,
    battleInitCharacterCombatant: false,
    battleRuntimeCharacterHp: 0,
    battleRuntimeHpChanged: false,
    settlementCurrentHp: 0,
    settlementPersistedBattleHp: false,
    buildIdentityUnchanged: false,
  }

  action recordProjection(
    layer: CharacterLifecycleLayer,
    facts: CharacterLifecycleFacts,
    replayIndex: int,
  ): bool = all {
    qLayer' = layer,
    qDraftHasOpenHoles' = facts.draftHasOpenHoles,
    qBuildFinalized' = facts.buildFinalized,
    qSheetOwnsHitPoints' = facts.sheetOwnsHitPoints,
    qSheetCurrentHp' = facts.sheetCurrentHp,
    qSheetMaxHp' = facts.sheetMaxHp,
    qBattleInitCharacterCombatant' = facts.battleInitCharacterCombatant,
    qBattleRuntimeCharacterHp' = facts.battleRuntimeCharacterHp,
    qBattleRuntimeHpChanged' = facts.battleRuntimeHpChanged,
    qSettlementCurrentHp' = facts.settlementCurrentHp,
    qSettlementPersistedBattleHp' = facts.settlementPersistedBattleHp,
    qBuildIdentityUnchanged' = facts.buildIdentityUnchanged,
    qReplayIndex' = replayIndex,
  }

  action init = recordProjection(
    Draft,
    emptyLifecycleFacts.with("draftHasOpenHoles", true),
    0,
  )

  action doFinalizeDraftToBuild = all {
    qReplayIndex == 0,
    recordProjection(
      Build,
      emptyLifecycleFacts
        .with("buildFinalized", true),
      1,
    ),
  }

  action doCreateSheetFromBuild = all {
    qReplayIndex == 1,
    recordProjection(
      Sheet,
      emptyLifecycleFacts
        .with("buildFinalized", true)
        .with("sheetOwnsHitPoints", true)
        .with("sheetCurrentHp", 12)
        .with("sheetMaxHp", 12),
      2,
    ),
  }

  action doProjectSheetToBattleInit = all {
    qReplayIndex == 2,
    recordProjection(
      BattleInitProjection,
      emptyLifecycleFacts
        .with("buildFinalized", true)
        .with("sheetOwnsHitPoints", true)
        .with("sheetCurrentHp", 12)
        .with("sheetMaxHp", 12)
        .with("battleInitCharacterCombatant", true),
      3,
    ),
  }

  action doResolveSkeletonShortswordAttack = all {
    qReplayIndex == 3,
    recordProjection(
      BattleRuntime,
      emptyLifecycleFacts
        .with("buildFinalized", true)
        .with("sheetOwnsHitPoints", true)
        .with("sheetCurrentHp", 12)
        .with("sheetMaxHp", 12)
        .with("battleInitCharacterCombatant", true)
        .with("battleRuntimeCharacterHp", 8)
        .with("battleRuntimeHpChanged", true),
      4,
    ),
  }

  action doSettleBattleToSheet = all {
    qReplayIndex == 4,
    recordProjection(
      Settlement,
      emptyLifecycleFacts
        .with("buildFinalized", true)
        .with("sheetOwnsHitPoints", true)
        .with("sheetCurrentHp", 12)
        .with("sheetMaxHp", 12)
        .with("battleInitCharacterCombatant", true)
        .with("battleRuntimeCharacterHp", 8)
        .with("battleRuntimeHpChanged", true)
        .with("settlementCurrentHp", 8)
        .with("settlementPersistedBattleHp", true)
        .with("buildIdentityUnchanged", true),
      5,
    ),
  }

  action step = any {
    doFinalizeDraftToBuild,
    doCreateSheetFromBuild,
    doProjectSheetToBattleInit,
    doResolveSkeletonShortswordAttack,
    doSettleBattleToSheet,
  }
}
