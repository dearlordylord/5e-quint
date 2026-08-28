import {
  admitBattleRuntimeTransactionOperation,
  battleInitiativePosition,
  battlePendingTransactionView,
  battleHoleAcceptsFill,
  settleCreatureFallsRuntimeTransaction,
  settleBattleRuntimeTransaction,
  sameBattleSubject,
  type BattleCheckpointFrontierEnvelope,
  type BattleFill,
  type BattleHole,
  type BattleInterruptDecisionHole,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleRuntimeTransactionOperation,
  type BattleRuntimeTransactionOperationAdmissionIssue,
  type BattleRuntimeTransactionResult,
  type BattleSubject,
} from "@dnd/battle-runtime";
import { Either, Match, Option } from "effect";

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
  battleMechanicsEnvelopeForSession,
  battlePresentationEnvelopeForSession,
  battleResolutionPayload,
  battlePresentationIssueContent,
  battleSessionPayload,
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

type BattleTransactionOperationContext = "fill" | "resolve";
type FillBattleHoleToolInput = Extract<
  BattleToolCall,
  { readonly name: typeof battleToolNames.fillBattleHole }
>["args"];

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
    Match.when({ name: battleToolNames.fillBattleHole }, (matched) =>
      handleFillBattleHoleToolCall(root, matched.args),
    ),
    Match.when({ name: battleToolNames.resolveBattleAct }, (matched) => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot resolve another act with pending fills.",
      );
      if (Either.isLeft(state)) return state.left;
      if (
        matched.args.subject.tag === "runtimeCommand" &&
        matched.args.subject.command === "creatureFalls"
      ) {
        const result = settleCreatureFallsRuntimeTransaction({
          session: state.right,
          transaction: null,
          fallingCreatureId: matched.args.subject.fallingCreatureId,
          reactionSpellTargetFacts: matched.args.reactionSpellTargetFacts,
          statBlockCatalog: root.statBlockCatalog,
        });
        return storedBattleTransactionContent(root, state.right, result);
      }
      const presentation = battlePresentationEnvelopeForSession(
        root,
        state.right,
      );
      if (Either.isLeft(presentation)) {
        return battlePresentationIssueContent(presentation.left);
      }
      const availableAct =
        presentation.right.frontier.kind === "acts"
          ? presentation.right.frontier.acts.find((act) =>
              sameBattleSubject(act.subject, matched.args.subject),
            )
          : undefined;
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
      const result = settleBattleRuntimeTransaction({
        session: state.right,
        transaction: null,
        operation: battleRuntimeTransactionOperationForSubject(
          matched.args.subject,
        ),
        statBlockCatalog: root.statBlockCatalog,
      });
      return storedBattleTransactionContent(root, state.right, result);
    }),
    Match.when({ name: battleToolNames.endTurn }, (matched) => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot end turn with pending battle fills.",
      );
      if (Either.isLeft(state)) return state.left;
      const subject: BattleSubject = {
        tag: "runtimeCommand",
        actorId: matched.args.actorId,
        command: "endTurn",
      };
      const result = settleBattleRuntimeTransaction({
        session: state.right,
        transaction: null,
        operation: battleRuntimeTransactionOperationForSubject(subject),
        statBlockCatalog: root.statBlockCatalog,
      });
      return storedBattleTransactionContent(root, state.right, result);
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

function handleFillBattleHoleToolCall(
  root: McpPlaySessionRoot,
  input: FillBattleHoleToolInput,
): BattleToolResult {
  const admitted = admitBattleFillToolInput(root, input);
  if (Either.isLeft(admitted)) return admitted.left;

  const { session, previous, subject, fill } = admitted.right;
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
  if (Either.isLeft(visibleSession)) return Either.left(visibleSession.left);

  const previous = root.sessionStore.getPendingBattleTransaction();
  const pendingView =
    previous === null ? Option.none() : battlePendingTransactionView(previous);
  if (previous !== null && Option.isNone(pendingView)) {
    return Either.left(
      errorContent("The stored battle transaction is invalid.", {
        code: "BATTLE_TRANSACTION_DEFECT",
        issue: { tag: "foreignTransaction" },
      }),
    );
  }
  if (
    pendingView !== undefined &&
    Option.isSome(pendingView) &&
    !sameBattleSubject(pendingView.value.subject, input.subject)
  ) {
    return Either.left(
      errorContent("A different battle subject has pending fills.", {
        code: "BATTLE_FILL_SUBJECT_MISMATCH",
        pendingSubject: pendingView.value.subject,
        requestedSubject: input.subject,
      }),
    );
  }
  // Transaction admission owns the ordinary-vs-interrupt frontier rule. Run
  // it before hole matching when a continuation exists so a caller cannot
  // turn an interrupt-vs-ordinary protocol error into a misleading stale-hole
  // error by choosing an arbitrary hole id.
  if (previous !== null) {
    const admission = admitBattleRuntimeTransactionOperation({
      transaction: previous,
      operation: battleRuntimeTransactionOperationForFill({
        subject: input.subject,
        fill: input.fill,
      }),
    });
    if (admission.tag === "rejected") {
      return Either.left(
        battleRuntimeTransactionAdmissionError({
          context: "fill",
          issue: admission.issue,
          requestedSubject: input.subject,
        }),
      );
    }
  }
  const frontier = battleMechanicsEnvelopeForSession(
    root,
    visibleSession.right,
  ).frontier;
  const frontierIssue = pendingFillFrontierIssue(frontier, input.fill);
  if (frontierIssue !== null) {
    return Either.left(
      errorContent(frontierIssue.message, frontierIssue.details),
    );
  }
  if (
    previous === null &&
    !battleSubjectIsAvailableWithoutPendingFills(frontier, input.subject)
  ) {
    return Either.left(
      errorContent("Battle act is not currently available.", {
        code: "BATTLE_ACT_NOT_AVAILABLE",
        subject: input.subject,
      }),
    );
  }
  return Either.right({
    session: visibleSession.right,
    previous,
    subject: input.subject,
    fill: input.fill,
  });
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

function battleRuntimeTransactionOperationForSubject(
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
}): BattleToolResult {
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
): BattleToolResult {
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
): BattleToolResult {
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
      ? battlePresentationIssueContent(payload.left)
      : schemaJsonContent(BattleSessionOutputSchema, payload.right);
  }
  const payload = battleSessionPayload(root, null);
  return Either.isLeft(payload)
    ? battlePresentationIssueContent(payload.left)
    : schemaJsonContent(BattleSessionOutputSchema, payload.right);
}

function battleResolutionContent(
  root: McpPlaySessionRoot,
  result: BattleRuntimeResolutionResult,
): BattleToolResult {
  const payload = battleResolutionPayload(root, result);
  return Either.isLeft(payload)
    ? battlePresentationIssueContent(payload.left)
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
  return Option.isNone(pendingFills)
    ? Either.left(
        errorContent("The stored battle transaction is invalid.", {
          code: "BATTLE_TRANSACTION_DEFECT",
          issue: { tag: "foreignTransaction" },
        }),
      )
    : Either.left(
        pendingBattleFillsContent(pendingFills.value, pendingMessage),
      );
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

function battleSubjectIsAvailableWithoutPendingFills(
  frontier: BattleCheckpointFrontierEnvelope["frontier"],
  subject: FillBattleHoleToolInput["subject"],
): boolean {
  return Match.value(frontier).pipe(
    Match.when({ kind: "acts" }, (actsFrontier) =>
      actsFrontier.acts.some((act) => sameBattleSubject(act.subject, subject)),
    ),
    Match.when({ kind: "holes" }, (holesFrontier) =>
      sameBattleSubject(holesFrontier.subject, subject),
    ),
    Match.when({ kind: "interruptDecision" }, () => false),
    Match.exhaustive,
  );
}

export function pendingFillFrontierIssue(
  frontier: BattleCheckpointFrontierEnvelope["frontier"],
  fill: BattleFill,
): {
  readonly message: string;
  readonly details:
    | {
        readonly code: "BATTLE_FILL_HOLE_MISMATCH";
        readonly currentFrontier: BattleCheckpointFrontierEnvelope["frontier"];
        readonly requestedFill: BattleFill;
      }
    | {
        readonly code: "BATTLE_FILL_KIND_MISMATCH";
        readonly pendingHole: BattleHole | BattleInterruptDecisionHole;
        readonly requestedFill: BattleFill;
      };
} | null {
  const holes =
    frontier.kind === "holes"
      ? frontier.holes
      : frontier.kind === "interruptDecision"
        ? [frontier.decisionHole]
        : frontier.acts.flatMap((act) => act.initialHoles);
  const matchingHoles = holes.filter((hole) => hole.holeId === fill.holeId);
  if (matchingHoles.length === 0) {
    return {
      message: "Battle fill does not match the current Hole frontier.",
      details: {
        code: "BATTLE_FILL_HOLE_MISMATCH" as const,
        currentFrontier: frontier,
        requestedFill: fill,
      },
    };
  }
  const matchingKindHole = matchingHoles.find((hole) =>
    battleHoleAcceptsFill(hole, fill),
  );
  if (matchingKindHole !== undefined) return null;
  const pendingHole = matchingHoles[0];
  if (pendingHole === undefined) return null;
  return {
    message: "Battle fill kind does not match the current Hole.",
    details: {
      code: "BATTLE_FILL_KIND_MISMATCH" as const,
      pendingHole,
      requestedFill: fill,
    },
  };
}
