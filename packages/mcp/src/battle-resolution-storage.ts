import type { BattleRuntimeResolutionResult } from "@dnd/battle-runtime";
import { Either, Match } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { BattleResolutionOutputSchema } from "./battle-tool-output.ts";
import {
  battleResolutionPayload,
  battleSnapshotPresentationIssueContent,
} from "./battle-tool-payloads.ts";
import type {
  McpBattleStateTransitionIssue,
  PendingBattleFillSession,
} from "./session-store.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

type BattleResolutionStorageResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function storeBattleResolution(
  root: McpPlaySessionRoot,
  result: BattleRuntimeResolutionResult,
  pendingTransaction: PendingBattleFillSession | null,
): Either.Either<
  { readonly tag: "stored" } | { readonly tag: "invalidResultNotStored" },
  | McpBattleStateTransitionIssue
  | { readonly tag: "pendingBattleFillTransactionMissing" }
> {
  return Match.value(result).pipe(
    Match.when({ tag: "resolved" }, (resolved) => {
      const retainsPendingInterrupt =
        resolved.envelope.frontier.kind === "interruptDecision";
      if (retainsPendingInterrupt && pendingTransaction === null) {
        return Either.left({
          tag: "pendingBattleFillTransactionMissing" as const,
        });
      }
      return Either.map(
        root.sessionStore.storeActiveBattle(resolved.session),
        () => {
          root.sessionStore.pendingBattleFills = retainsPendingInterrupt
            ? pendingTransaction
            : null;
          return { tag: "stored" } as const;
        },
      );
    }),
    Match.when({ tag: "needsHoles" }, (needsHoles) => {
      if (pendingTransaction === null) {
        return Either.left({
          tag: "pendingBattleFillTransactionMissing" as const,
        });
      }
      return Either.map(
        root.sessionStore.storeActiveBattle(needsHoles.session),
        () => {
          root.sessionStore.pendingBattleFills = pendingTransaction;
          return { tag: "stored" } as const;
        },
      );
    }),
    Match.when({ tag: "invalid" }, () =>
      Either.right({ tag: "invalidResultNotStored" } as const),
    ),
    Match.exhaustive,
  );
}

export function storedBattleResolutionContent(
  root: McpPlaySessionRoot,
  result: BattleRuntimeResolutionResult,
  pendingTransaction: PendingBattleFillSession | null,
): BattleResolutionStorageResult {
  const stored = storeBattleResolution(root, result, pendingTransaction);
  if (Either.isLeft(stored)) {
    return errorContent("Battle state transition failed.", {
      code: "BATTLE_STATE_TRANSITION_INVALID",
      transition: stored.left,
    });
  }
  if (stored.right.tag === "stored") {
    publishAdminProjectionBestEffort(root);
  }
  const payload = battleResolutionPayload(root, result);
  return Either.isLeft(payload)
    ? battleSnapshotPresentationIssueContent(payload.left)
    : schemaJsonContent(BattleResolutionOutputSchema, payload.right);
}
