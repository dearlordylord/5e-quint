import {
  battleInitiativePosition,
  battlePendingTransactionView,
  discoverBattleActs,
  isBattleReadyTriggerReportSubject,
  openCreatureFallsRuntimeInterruptWindow,
  settleBattleRuntimeResolution,
  settleBattleRuntimeTransaction,
  sameBattleSubject,
  type BattlePendingTransactionView,
  type BattleFill,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleRuntimeTransactionResult,
  type BattleSubject,
} from "@dnd/battle-runtime";
import { Either, Match } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { battleToolNames, type BattleToolCall } from "./battle-tool-input.ts";
export {
  battleToolDefinitions,
  isBattleToolName,
} from "./battle-tool-definitions.ts";
import {
  characterSessionHandoffErrorContent,
  settleCharacterSessionsFromBattle,
} from "./battle-handoff.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  EndBattleOutputSchema,
  SelectStatBlockOutputSchema,
} from "./battle-tool-output.ts";
import { handleStartBattleToolCall } from "./start-battle-tool.ts";
import { handleBattleLifecycleToolCall } from "./battle-lifecycle-tool.ts";
import {
  battleResolutionPayload,
  battleSessionPayload,
  battleSnapshotPresentationIssueContent,
  initialInitiativeSetupPayload,
  noStoredBattleContent,
  pendingBattleFillsContent,
  unknownStatBlockContent,
} from "./battle-tool-payloads.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";
import { battleStateTransitionErrorContent } from "./battle-state-transition.ts";

export type BattleToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export type BattlePendingSubjectAdmission =
  | { readonly tag: "sameSubject" }
  | { readonly tag: "readyTriggerOverlay" }
  | { readonly tag: "differentSubject" };

export function battlePendingSubjectAdmission(
  pending: BattlePendingTransactionView,
  subject: BattleSubject,
): BattlePendingSubjectAdmission {
  if (sameBattleSubject(pending.subject, subject)) {
    return { tag: "sameSubject" };
  }
  return isBattleReadyTriggerReportSubject(subject) &&
    pending.holes.length > 0 &&
    pending.holes.every((hole) => hole.kind === "interruptDecision")
    ? { tag: "readyTriggerOverlay" }
    : { tag: "differentSubject" };
}

/**
 * Apply the operation's ownership rule to a pending subject admission.
 * Interrupt decisions consume the transaction-owned subject, so a Ready
 * report overlay is valid only for an ordinary subject operation.
 */
export function battlePendingFillAdmission(
  pending: BattlePendingTransactionView,
  subject: BattleSubject,
  fillKind: BattleFill["kind"],
): BattlePendingSubjectAdmission {
  const admission = battlePendingSubjectAdmission(pending, subject);
  return fillKind === "interruptDecision" && admission.tag !== "sameSubject"
    ? { tag: "differentSubject" }
    : admission;
}

export function handleBattleToolCall(
  root: McpPlaySessionRoot,
  call: BattleToolCall,
): BattleToolResult {
  return Match.value(call).pipe(
    Match.when({ name: battleToolNames.selectStatBlock }, (matched) => {
      const previousSelectedStatBlockId =
        root.sessionStore.snapshot().selectedStatBlockId;
      const selected = root.sessionStore.selectStatBlock(
        matched.args.statBlockId,
      );
      if (Either.isLeft(selected)) {
        return unknownStatBlockContent(
          matched.args.statBlockId,
          selected.left.message,
        );
      }
      if (previousSelectedStatBlockId !== selected.right.id) {
        publishAdminProjectionBestEffort(root);
      }
      return schemaJsonContent(SelectStatBlockOutputSchema, {
        selectedStatBlock: selected.right,
        session: mcpSessionSummary(root.sessionStore.snapshot()),
      });
    }),
    Match.when({ name: battleToolNames.startBattle }, (matched) =>
      handleStartBattleToolCall(root, matched.args),
    ),
    Match.when({ name: battleToolNames.battleLifecycle }, (matched) =>
      handleBattleLifecycleToolCall(root, matched.args),
    ),
    Match.when({ name: battleToolNames.readBattleState }, () =>
      battleSessionContent(root),
    ),
    Match.when({ name: battleToolNames.discoverBattleActs }, () =>
      battleSessionContent(root),
    ),
    Match.when({ name: battleToolNames.fillBattleHole }, (matched) => {
      const visibleSession = activeBattleForTool(root);
      if (Either.isLeft(visibleSession)) return visibleSession.left;

      const subject = matched.args.subject;
      const previous = root.sessionStore.getPendingBattleTransaction();
      const previousView =
        previous === null ? null : battlePendingTransactionView(previous);
      if (previousView === undefined) {
        return errorContent("The stored battle transaction is invalid.", {
          code: "BATTLE_TRANSACTION_DEFECT",
          issue: { tag: "foreignTransaction" },
        });
      }
      const pendingSubjectAdmission =
        previousView === null
          ? undefined
          : battlePendingFillAdmission(
              previousView,
              subject,
              matched.args.fill.kind,
            );
      if (
        previous !== null &&
        previousView !== null &&
        isBattleReadyTriggerReportSubject(subject) &&
        pendingSubjectAdmission?.tag === "sameSubject" &&
        matched.args.fill.kind !== "interruptDecision"
      ) {
        return pendingBattleFillsContent(
          previousView,
          "The Ready trigger report is already pending.",
        );
      }
      if (
        previous !== null &&
        previousView !== null &&
        pendingSubjectAdmission?.tag === "differentSubject"
      ) {
        return errorContent("A different battle subject has pending fills.", {
          code: "BATTLE_FILL_SUBJECT_MISMATCH",
          pendingSubject: previousView.subject,
          requestedSubject: subject,
        });
      }
      const discoveredAct = discoverBattleActs(visibleSession.right).find(
        (act) => sameBattleSubject(act.subject, subject),
      );
      if (previous === null && discoveredAct === undefined) {
        return errorContent("Battle act is not currently available.", {
          code: "BATTLE_ACT_NOT_AVAILABLE",
          subject,
        });
      }

      const transaction = settleBattleRuntimeTransaction({
        session: visibleSession.right,
        transaction: previous,
        operation:
          matched.args.fill.kind === "interruptDecision"
            ? { kind: "interruptDecision", fill: matched.args.fill }
            : {
                kind: "ordinarySubject",
                subject,
                fills: [matched.args.fill],
              },
        statBlockCatalog: root.statBlockCatalog,
      });
      return storedBattleTransactionContent(
        root,
        visibleSession.right,
        transaction,
      );
    }),
    Match.when({ name: battleToolNames.resolveBattleAct }, (matched) => {
      const state = activeBattleForTool(root);
      if (Either.isLeft(state)) return state.left;
      const pending = root.sessionStore.getPendingBattleTransaction();
      if (pending !== null) {
        const pendingView = battlePendingTransactionView(pending);
        if (pendingView === undefined) {
          return errorContent("The stored battle transaction is invalid.", {
            code: "BATTLE_TRANSACTION_DEFECT",
            issue: { tag: "foreignTransaction" },
          });
        }
        if (
          battlePendingSubjectAdmission(pendingView, matched.args.subject)
            .tag !== "readyTriggerOverlay"
        ) {
          return pendingBattleFillsContent(
            pendingView,
            "Cannot resolve another act with pending fills.",
          );
        }
      }
      if (
        matched.args.subject.tag === "runtimeCommand" &&
        matched.args.subject.command === "creatureFalls"
      ) {
        const result = openCreatureFallsRuntimeInterruptWindow({
          session: state.right,
          fallingCreatureId: matched.args.subject.fallingCreatureId,
          reactionSpellTargetFacts: matched.args.reactionSpellTargetFacts,
        });
        return storedBattleTransactionContent(
          root,
          state.right,
          settleBattleRuntimeResolution({
            session: state.right,
            transaction: pending,
            operation: {
              kind: "ordinarySubject",
              subject: matched.args.subject,
              fills: [],
            },
            resolution: result,
            statBlockCatalog: root.statBlockCatalog,
          }),
        );
      }
      const availableAct = discoverBattleActs(state.right).find((act) =>
        sameBattleSubject(act.subject, matched.args.subject),
      );
      if (availableAct === undefined) {
        return errorContent("Battle act is not currently available.", {
          code: "BATTLE_ACT_NOT_AVAILABLE",
          subject: matched.args.subject,
        });
      }
      if (availableAct.initialHoles.length > 0) {
        return errorContent("Battle act requires hole fills.", {
          code: "BATTLE_ACT_REQUIRES_HOLES",
          subject: matched.args.subject,
        });
      }
      return storedBattleTransactionContent(
        root,
        state.right,
        settleBattleRuntimeTransaction({
          session: state.right,
          transaction: pending,
          operation: {
            kind: "ordinarySubject",
            subject: matched.args.subject,
            fills: [],
          },
          statBlockCatalog: root.statBlockCatalog,
        }),
      );
    }),
    Match.when({ name: battleToolNames.endTurn }, (matched) => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot end turn with pending battle fills.",
      );
      if (Either.isLeft(state)) return state.left;
      return storedBattleTransactionContent(
        root,
        state.right,
        settleBattleRuntimeTransaction({
          session: state.right,
          transaction: null,
          operation: {
            kind: "ordinarySubject",
            subject: {
              tag: "runtimeCommand",
              actorId: matched.args.actorId,
              command: "endTurn",
            },
            fills: [],
          },
          statBlockCatalog: root.statBlockCatalog,
        }),
      );
    }),
    Match.when({ name: battleToolNames.endBattle }, () => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot end battle with pending battle fills.",
      );
      if (Either.isLeft(state)) return state.left;

      const handoff = settleCharacterSessionsFromBattle(root, state.right);
      if (Either.isLeft(handoff)) {
        return characterSessionHandoffErrorContent(handoff.left);
      }
      const committed = root.sessionStore.commitBattleEnd({
        battleSession: state.right,
        characterSettlements: handoff.right,
      });
      if (Either.isLeft(committed)) {
        return battleStateTransitionErrorContent(committed.left);
      }
      publishAdminProjectionBestEffort(root);

      return schemaJsonContent(EndBattleOutputSchema, {
        endedBattleId: state.right.state.battleId,
        closedAt: battleInitiativePosition(state.right.state),
        characters: Array.from(root.sessionStore.characters.entries()).map(
          ([characterId, session]) => ({
            characterId,
            session,
          }),
        ),
        session: mcpSessionSummary(root.sessionStore.snapshot()),
      });
    }),
    Match.exhaustive,
  );
}

function battleSessionContent(root: McpPlaySessionRoot): BattleToolResult {
  const state = root.sessionStore.battleState;
  if (state.tag === "initialInitiativeSetup") {
    return schemaJsonContent(
      BattleSessionOutputSchema,
      initialInitiativeSetupPayload(root),
    );
  }
  if (state.tag === "activeBattle") {
    const payload = battleSessionPayload(root, state.session);
    return Either.isLeft(payload)
      ? battleSnapshotPresentationIssueContent(payload.left)
      : schemaJsonContent(BattleSessionOutputSchema, payload.right);
  }
  const payload = battleSessionPayload(root, null);
  return Either.isLeft(payload)
    ? battleSnapshotPresentationIssueContent(payload.left)
    : schemaJsonContent(BattleSessionOutputSchema, payload.right);
}

function battleResolutionContent(
  root: McpPlaySessionRoot,
  result: BattleRuntimeResolutionResult,
): BattleToolResult {
  const payload = battleResolutionPayload(root, result);
  return Either.isLeft(payload)
    ? battleSnapshotPresentationIssueContent(payload.left)
    : schemaJsonContent(BattleResolutionOutputSchema, payload.right);
}

function storedBattleTransactionContent(
  root: McpPlaySessionRoot,
  expectedSession: BattleRuntimeSession,
  result: BattleRuntimeTransactionResult,
): BattleToolResult {
  const stored = root.sessionStore.storeBattleTransactionResult(
    expectedSession,
    result,
  );
  if (Either.isLeft(stored)) {
    return battleStateTransitionErrorContent(stored.left);
  }
  return Match.value(result).pipe(
    Match.when({ tag: "invalid" }, ({ resolution }) =>
      battleResolutionContent(root, resolution),
    ),
    Match.when({ tag: "needsHoles" }, ({ resolution }) => {
      publishAdminProjectionBestEffort(root);
      return battleResolutionContent(root, resolution);
    }),
    Match.when({ tag: "settled" }, ({ resolution }) => {
      publishAdminProjectionBestEffort(root);
      return battleResolutionContent(root, resolution);
    }),
    Match.when({ tag: "defect" }, ({ issue }) =>
      errorContent("Battle transaction settlement failed.", {
        code: "BATTLE_TRANSACTION_DEFECT",
        issue,
      }),
    ),
    Match.exhaustive,
  );
}

function activeBattleWithoutPendingFills(
  root: McpPlaySessionRoot,
  pendingMessage: string,
): Either.Either<BattleRuntimeSession, ToolError> {
  const session = activeBattleForTool(root);
  if (Either.isLeft(session)) return session;
  const pendingTransaction = root.sessionStore.getPendingBattleTransaction();
  if (pendingTransaction === null) return Either.right(session.right);
  const pendingFills = battlePendingTransactionView(pendingTransaction);
  return pendingFills === undefined
    ? Either.left(
        errorContent("The stored battle transaction is invalid.", {
          code: "BATTLE_TRANSACTION_DEFECT",
          issue: { tag: "foreignTransaction" },
        }),
      )
    : Either.left(pendingBattleFillsContent(pendingFills, pendingMessage));
}

function activeBattleForTool(
  root: McpPlaySessionRoot,
): Either.Either<BattleRuntimeSession, ToolError> {
  const state = root.sessionStore.battleState;
  if (state.tag === "none") return Either.left(noStoredBattleContent());
  if (state.tag === "initialInitiativeSetup") {
    return Either.left(
      errorContent("Initial Initiative setup is not finalized.", {
        code: "INITIAL_INITIATIVE_SETUP_NOT_FINALIZED",
      }),
    );
  }
  return Either.right(state.session);
}
