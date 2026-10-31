import {
  battlePendingTransactionViewForSession,
  battleRuntimeSessionDescendsFrom,
  type BattlePendingTransaction,
  type BattleRuntimeSession,
} from "@dnd/battle-runtime";
import { Result } from "effect";

import type {
  McpBattleState,
  McpBattleStateTransitionIssue,
} from "./session-store-types.ts";

export function invalidBattleStateTransition(
  from: McpBattleState["tag"],
  to: McpBattleState["tag"],
): Result.Result<
  never,
  Extract<
    McpBattleStateTransitionIssue,
    { readonly tag: "invalidBattleStateTransition" }
  >
> {
  return Result.fail({
    tag: "invalidBattleStateTransition",
    from,
    to,
  });
}

export function validateBattleResultSessionLineage(
  expectedSession: BattleRuntimeSession,
  resultSession: BattleRuntimeSession,
): Result.Result<void, McpBattleStateTransitionIssue> {
  return battleRuntimeSessionDescendsFrom(resultSession, expectedSession)
    ? Result.succeed(undefined)
    : Result.fail({
        tag: "battleStateSessionChanged",
        battleId: expectedSession.state.battleId,
      });
}

export function validatePendingBattleTransactionSession(
  transaction: BattlePendingTransaction,
  session: BattleRuntimeSession,
): Result.Result<void, McpBattleStateTransitionIssue> {
  const view = battlePendingTransactionViewForSession(transaction, session);
  if (view.tag !== "valid")
    return Result.fail({
      tag: "battleStatePendingTransactionInvalid",
      battleId: session.state.battleId,
      reason: view.tag,
    });
  return Result.succeed(undefined);
}

export function validateExpectedActiveBattleSession(
  battleState: McpBattleState,
  expectedSession: BattleRuntimeSession,
): Result.Result<void, McpBattleStateTransitionIssue> {
  return battleState.tag === "activeBattle" &&
    battleState.session === expectedSession
    ? Result.succeed(undefined)
    : Result.fail({
        tag: "battleStateSessionChanged",
        battleId: expectedSession.state.battleId,
      });
}

export function activeBattleSessionTransition(
  battleState: McpBattleState,
  session: BattleRuntimeSession,
): Result.Result<
  Extract<McpBattleState, { readonly tag: "activeBattle" }>,
  McpBattleStateTransitionIssue
> {
  if (battleState.tag === "initialInitiativeSetup")
    return invalidBattleStateTransition(battleState.tag, "activeBattle");
  if (
    battleState.tag === "activeBattle" &&
    session.state.battleId !== battleState.session.state.battleId
  )
    return Result.fail({
      tag: "battleStateBattleOwnershipConflict",
      expectedBattleId: battleState.session.state.battleId,
      actualBattleId: session.state.battleId,
    });
  return Result.succeed({ tag: "activeBattle", session });
}
