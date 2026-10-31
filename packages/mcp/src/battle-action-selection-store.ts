import {
  battlePendingActionCancellationForSession,
  type BattleActionCancellationUnavailableReason,
  type BattlePendingTransaction,
  type BattleRuntimeSession,
} from "@dnd/battle-runtime";
import { Match, Result, Schema } from "effect";
import {
  BattleActionSelectionIdSchema,
  type BattleActionSelectionId,
} from "./battle-action-selection-id.ts";
import type { McpBattleStateTransitionIssue } from "./session-store-types.ts";

export type McpPendingBattleSelection = {
  readonly transaction: BattlePendingTransaction;
  readonly selectionId: BattleActionSelectionId;
};

export type McpBattleActionCancellationIssue =
  | McpBattleStateTransitionIssue
  | {
      readonly tag: "battleActionCancellationUnavailable";
      readonly reason:
        | BattleActionCancellationUnavailableReason
        | "staleSelection";
    };

export function createBattleActionSelectionStore() {
  let selection: McpPendingBattleSelection | null = null;
  let ordinal = 0n;
  return {
    get selection() {
      return selection;
    },
    get transaction() {
      return selection?.transaction ?? null;
    },
    clear(): void {
      selection = null;
    },
    commitContinuation(
      transaction: BattlePendingTransaction,
      commitSession: () => Result.Result<void, McpBattleStateTransitionIssue>,
    ): Result.Result<void, McpBattleStateTransitionIssue> {
      const previous = selection;
      const committed = commitSession();
      if (Result.isFailure(committed)) return committed;
      if (previous === null) ordinal += 1n;
      const selectionId =
        previous?.selectionId ??
        Schema.decodeUnknownSync(BattleActionSelectionIdSchema)(
          `battle-action-selection:${ordinal}`,
        );
      selection = { transaction, selectionId };
      return Result.succeed(undefined);
    },
    cancel(
      expectedSession: BattleRuntimeSession,
      expectedTransaction: BattlePendingTransaction | null,
      expectedSelectionId: BattleActionSelectionId,
    ): Result.Result<void, McpBattleActionCancellationIssue> {
      if ((selection?.transaction ?? null) !== expectedTransaction)
        return Result.fail({
          tag: "battleStateSessionChanged",
          battleId: expectedSession.state.battleId,
        });
      if (selection !== null && selection.selectionId !== expectedSelectionId)
        return Result.fail({
          tag: "battleActionCancellationUnavailable",
          reason: "staleSelection",
        });
      return Match.value(
        battlePendingActionCancellationForSession(
          expectedTransaction,
          expectedSession,
        ),
      ).pipe(
        Match.when({ kind: "unavailable" }, ({ reason }) =>
          Result.fail({
            tag: "battleActionCancellationUnavailable" as const,
            reason,
          }),
        ),
        Match.when({ kind: "available" }, () => {
          selection = null;
          return Result.succeed(undefined);
        }),
        Match.exhaustive,
      );
    },
  };
}
