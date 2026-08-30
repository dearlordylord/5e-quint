import {
  admitBattleRuntimeTransactionOperation,
  battlePendingTransactionView,
  sameBattleSubject,
  settleBattleRuntimeTransaction,
  type BattleFill,
  type BattlePendingTransaction,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleRuntimeTransactionOperation,
  type BattleRuntimeTransactionOperationAdmissionIssue,
  type BattleRuntimeTransactionResult,
  type BattleSubject,
} from "@dnd/battle-runtime";
import { Result, Match, Option } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { battleToolNames, type BattleToolCall } from "./battle-tool-input.ts";
import { BattleResolutionOutputSchema } from "./battle-tool-output.ts";
import {
  battleMechanicsEnvelopeForSession,
  battlePresentationIssueContent,
  battleResolutionPayload,
  noStoredBattleContent,
  pendingBattleFillsContent,
} from "./battle-tool-payloads.ts";
import { battleStateTransitionErrorContent } from "./battle-state-transition.ts";
import {
  battleSubjectIsAvailableWithoutPendingFills,
  pendingFillFrontierIssue,
} from "./battle-tool-frontier.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import type { BattleToolResult } from "./battle-tool-types.ts";

type BattleTransactionOperationContext = "fill" | "resolve";
type FillBattleHoleToolInput = Extract<
  BattleToolCall,
  { readonly name: typeof battleToolNames.fillBattleHole }
>["args"];

export function handleFillBattleHoleToolCall(
  root: McpPlaySessionRoot,
  input: FillBattleHoleToolInput,
): BattleToolResult {
  const admitted = admitBattleFillToolInput(root, input);
  if (Result.isFailure(admitted)) return admitted.failure;

  const { session, previous, subject, fill } = admitted.success;
  const operation = battleRuntimeTransactionOperationForFill({
    subject,
    fill,
  });
  const admission = admitBattleRuntimeTransactionOperation({
    transaction: previous,
    operation,
  });
  if (admission.tag === "rejected") {
    return battleRuntimeTransactionAdmissionError({
      context: "fill",
      issue: admission.issue,
      requestedSubject: subject,
    });
  }
  const result = settleBattleRuntimeTransaction({
    session,
    transaction: previous,
    operation: admission.operation,
    statBlockCatalog: root.statBlockCatalog,
  });
  return storedBattleTransactionContent(root, session, result);
}

function admitBattleFillToolInput(
  root: McpPlaySessionRoot,
  input: FillBattleHoleToolInput,
) {
  const visibleSession = activeBattleForTool(root);
  if (Result.isFailure(visibleSession))
    return Result.fail(visibleSession.failure);

  const previous = root.sessionStore.getPendingBattleTransaction();
  const pendingIssue = battleFillPendingTransactionIssue(previous, input);
  if (pendingIssue !== undefined) return Result.fail(pendingIssue);
  const frontier = battleMechanicsEnvelopeForSession(
    root,
    visibleSession.success,
  ).frontier;
  const frontierIssue = pendingFillFrontierIssue(frontier, input.fill);
  if (frontierIssue !== null) {
    return Result.fail(
      errorContent(frontierIssue.message, frontierIssue.details),
    );
  }
  if (
    previous === null &&
    !battleSubjectIsAvailableWithoutPendingFills(frontier, input.subject)
  ) {
    return Result.fail(
      errorContent("Battle act is not currently available.", {
        code: "BATTLE_ACT_NOT_AVAILABLE",
        subject: input.subject,
      }),
    );
  }
  return Result.succeed({
    session: visibleSession.success,
    previous,
    subject: input.subject,
    fill: input.fill,
  });
}

function battleFillPendingTransactionIssue(
  previous: BattlePendingTransaction | null,
  input: FillBattleHoleToolInput,
): ToolError | undefined {
  if (previous === null) return undefined;
  const pendingView = battlePendingTransactionView(previous);
  if (Option.isNone(pendingView)) {
    return errorContent("The stored battle transaction is invalid.", {
      code: "BATTLE_TRANSACTION_DEFECT",
      issue: { tag: "foreignTransaction" },
    });
  }
  if (!sameBattleSubject(pendingView.value.subject, input.subject)) {
    return errorContent("A different battle subject has pending fills.", {
      code: "BATTLE_FILL_SUBJECT_MISMATCH",
      pendingSubject: pendingView.value.subject,
      requestedSubject: input.subject,
    });
  }
  // Transaction admission owns the ordinary-vs-interrupt frontier rule. Run
  // it before hole matching when a continuation exists so a caller cannot
  // turn an interrupt-vs-ordinary protocol error into a misleading stale-hole
  // error by choosing an arbitrary hole id.
  const admission = admitBattleRuntimeTransactionOperation({
    transaction: previous,
    operation: battleRuntimeTransactionOperationForFill({
      subject: input.subject,
      fill: input.fill,
    }),
  });
  return admission.tag === "rejected"
    ? battleRuntimeTransactionAdmissionError({
        context: "fill",
        issue: admission.issue,
        requestedSubject: input.subject,
      })
    : undefined;
}

function battleRuntimeTransactionOperationForFill(input: {
  readonly subject: BattleSubject;
  readonly fill: BattleFill;
}): BattleRuntimeTransactionOperation {
  return input.fill.kind === "interruptDecision"
    ? { kind: "interruptDecision", fill: input.fill }
    : {
        kind: "ordinarySubject",
        subject: input.subject,
        fills: [input.fill],
      };
}

export function battleRuntimeTransactionOperationForSubject(
  subject: BattleSubject,
): BattleRuntimeTransactionOperation {
  return {
    kind: "ordinarySubject",
    subject,
    fills: [],
  };
}

function battleRuntimeTransactionAdmissionError(input: {
  readonly context: BattleTransactionOperationContext;
  readonly issue: BattleRuntimeTransactionOperationAdmissionIssue;
  readonly requestedSubject: BattleSubject;
}): ToolError {
  return Match.value(input.issue).pipe(
    Match.when({ tag: "foreignTransaction" }, (issue) =>
      errorContent("The stored battle transaction is invalid.", {
        code: "BATTLE_TRANSACTION_DEFECT",
        issue,
      }),
    ),
    Match.when({ tag: "interruptRequiresPendingTransaction" }, () =>
      errorContent("Battle act is not currently available.", {
        code: "BATTLE_ACT_NOT_AVAILABLE",
        subject: input.requestedSubject,
      }),
    ),
    Match.when({ tag: "interruptDecisionRequiresInterruptFrontier" }, (issue) =>
      battleRuntimeTransactionPendingAdmissionError(
        input.context,
        issue.pendingSubject,
        "The pending battle transaction requires ordinary hole fills.",
        input.requestedSubject,
      ),
    ),
    Match.when({ tag: "ordinarySubjectRequiresOrdinaryFrontier" }, (issue) =>
      battleRuntimeTransactionPendingAdmissionError(
        input.context,
        issue.pendingSubject,
        "The pending interrupt decision requires an interrupt-decision fill.",
        issue.requestedSubject,
      ),
    ),
    Match.when({ tag: "repeatedReadyTrigger" }, (issue) =>
      battleRuntimeTransactionPendingAdmissionError(
        input.context,
        issue.pendingSubject,
        "The Ready trigger report is already pending.",
        input.requestedSubject,
      ),
    ),
    Match.when(
      { tag: "readyTriggerOverlayRequiresInterruptFrontier" },
      (issue) =>
        battleRuntimeTransactionSubjectAdmissionError(
          input.context,
          issue.pendingSubject,
          issue.requestedSubject,
        ),
    ),
    Match.when({ tag: "differentPendingSubject" }, (issue) =>
      battleRuntimeTransactionSubjectAdmissionError(
        input.context,
        issue.pendingSubject,
        issue.requestedSubject,
      ),
    ),
    Match.exhaustive,
  );
}

function battleRuntimeTransactionPendingAdmissionError(
  context: BattleTransactionOperationContext,
  pendingSubject: BattleSubject,
  fillMessage: string,
  requestedSubject: BattleSubject,
): ToolError {
  return Match.value(context).pipe(
    Match.when("fill", () =>
      errorContent(fillMessage, {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject,
      }),
    ),
    Match.when("resolve", () =>
      errorContent("Cannot resolve another act with pending fills.", {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject,
        requestedSubject,
      }),
    ),
    Match.exhaustive,
  );
}

function battleRuntimeTransactionSubjectAdmissionError(
  context: BattleTransactionOperationContext,
  pendingSubject: BattleSubject,
  requestedSubject: BattleSubject,
): ToolError {
  return Match.value(context).pipe(
    Match.when("fill", () =>
      errorContent("A different battle subject has pending fills.", {
        code: "BATTLE_FILL_SUBJECT_MISMATCH",
        pendingSubject,
        requestedSubject,
      }),
    ),
    Match.when("resolve", () =>
      errorContent("Cannot resolve another act with pending fills.", {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject,
        requestedSubject,
      }),
    ),
    Match.exhaustive,
  );
}

function battleResolutionContent(
  root: McpPlaySessionRoot,
  result: BattleRuntimeResolutionResult,
): BattleToolResult {
  const payload = battleResolutionPayload(root, result);
  return Result.isFailure(payload)
    ? battlePresentationIssueContent(payload.failure)
    : schemaJsonContent(BattleResolutionOutputSchema, payload.success);
}

export function storedBattleTransactionContent(
  root: McpPlaySessionRoot,
  expectedSession: BattleRuntimeSession,
  result: BattleRuntimeTransactionResult,
): BattleToolResult {
  const stored = root.sessionStore.storeBattleTransactionResult(
    expectedSession,
    result,
  );
  if (Result.isFailure(stored)) {
    return battleStateTransitionErrorContent(stored.failure);
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

export function activeBattleWithoutPendingFills(
  root: McpPlaySessionRoot,
  pendingMessage: string,
): Result.Result<BattleRuntimeSession, ToolError> {
  const session = activeBattleForTool(root);
  if (Result.isFailure(session)) return session;
  const pendingTransaction = root.sessionStore.getPendingBattleTransaction();
  if (pendingTransaction === null) return Result.succeed(session.success);
  const pendingFills = battlePendingTransactionView(pendingTransaction);
  return Option.isNone(pendingFills)
    ? Result.fail(
        errorContent("The stored battle transaction is invalid.", {
          code: "BATTLE_TRANSACTION_DEFECT",
          issue: { tag: "foreignTransaction" },
        }),
      )
    : Result.fail(
        pendingBattleFillsContent(pendingFills.value, pendingMessage),
      );
}

function activeBattleForTool(
  root: McpPlaySessionRoot,
): Result.Result<BattleRuntimeSession, ToolError> {
  const state = root.sessionStore.battleState;
  if (state.tag === "none") return Result.fail(noStoredBattleContent());
  if (state.tag === "initialInitiativeSetup") {
    return Result.fail(
      errorContent("Initial Initiative setup is not finalized.", {
        code: "INITIAL_INITIATIVE_SETUP_NOT_FINALIZED",
      }),
    );
  }
  return Result.succeed(state.session);
}
