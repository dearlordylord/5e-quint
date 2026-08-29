import {
  battleInitiativePosition,
  battleHoleAcceptsFill,
  openCreatureFallsRuntimeInterruptWindow,
  resolveBattleRuntimeInterrupt,
  resolveBattleRuntimeSubject,
  sameBattleSubject,
  type BattleCheckpointFrontierEnvelope,
  type BattleHole,
  type BattleInterruptDecisionHole,
  type BattleRuntimeSession,
  type BattleFill,
} from "@dnd/battle-runtime";
import { Result, Match } from "effect";

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
  BattleSessionOutputSchema,
  EndBattleOutputSchema,
  SelectStatBlockOutputSchema,
} from "./battle-tool-output.ts";
import { handleStartBattleToolCall } from "./start-battle-tool.ts";
import { handleBattleLifecycleToolCall } from "./battle-lifecycle-tool.ts";
import { pendingTransactionForResult } from "./battle-pending-transaction.ts";
import {
  battleMechanicsEnvelopeForSession,
  battlePresentationEnvelopeForSession,
  battleSessionPayload,
  battlePresentationIssueContent,
  initialInitiativeSetupPayload,
  noStoredBattleContent,
  pendingBattleFillsContent,
  unknownStatBlockContent,
} from "./battle-tool-payloads.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";
import { battleStateTransitionErrorContent } from "./battle-state-transition.ts";
import { storedBattleResolutionContent } from "./battle-resolution-storage.ts";

export type BattleToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

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
      if (Result.isFailure(selected)) {
        return unknownStatBlockContent(
          matched.args.statBlockId,
          selected.failure.message,
        );
      }
      if (previousSelectedStatBlockId !== selected.success.id) {
        publishAdminProjectionBestEffort(root);
      }
      return schemaJsonContent(SelectStatBlockOutputSchema, {
        selectedStatBlock: selected.success,
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
      if (Result.isFailure(state)) return state.failure;
      if (
        matched.args.subject.tag === "runtimeCommand" &&
        matched.args.subject.command === "creatureFalls"
      ) {
        const result = openCreatureFallsRuntimeInterruptWindow({
          session: state.success,
          fallingCreatureId: matched.args.subject.fallingCreatureId,
          reactionSpellTargetFacts: matched.args.reactionSpellTargetFacts,
        });
        return storedBattleResolutionContent(
          root,
          result,
          pendingTransactionForResult({
            result,
            filledSubject: matched.args.subject,
            previous: null,
            fills: [],
            replaySession: state.success,
          }),
        );
      }
      const presentation = battlePresentationEnvelopeForSession(
        root,
        state.success,
      );
      if (Result.isFailure(presentation)) {
        return battlePresentationIssueContent(presentation.failure);
      }
      const availableAct =
        presentation.success.frontier.kind === "acts"
          ? presentation.success.frontier.acts.find((act) =>
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
      const result = resolveBattleRuntimeSubject({
        session: state.success,
        subject: matched.args.subject,
        fills: [],
        statBlockCatalog: root.statBlockCatalog,
      });
      return storedBattleResolutionContent(
        root,
        result,
        pendingTransactionForResult({
          result,
          filledSubject: matched.args.subject,
          previous: null,
          fills: [],
          replaySession: state.success,
        }),
      );
    }),
    Match.when({ name: battleToolNames.endTurn }, (matched) => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot end turn with pending battle fills.",
      );
      if (Result.isFailure(state)) return state.failure;
      const result = resolveBattleRuntimeSubject({
        session: state.success,
        subject: {
          tag: "runtimeCommand",
          actorId: matched.args.actorId,
          command: "endTurn",
        },
        fills: [],
        statBlockCatalog: root.statBlockCatalog,
      });
      return storedBattleResolutionContent(
        root,
        result,
        pendingTransactionForResult({
          result,
          filledSubject: {
            tag: "runtimeCommand",
            actorId: matched.args.actorId,
            command: "endTurn",
          },
          previous: null,
          fills: [],
          replaySession: state.success,
        }),
      );
    }),
    Match.when({ name: battleToolNames.endBattle }, () => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot end battle with pending battle fills.",
      );
      if (Result.isFailure(state)) return state.failure;

      const handoff = settleCharacterSessionsFromBattle(root, state.success);
      if (Result.isFailure(handoff)) {
        return characterSessionHandoffErrorContent(handoff.failure);
      }
      const committed = root.sessionStore.commitBattleEnd({
        battleSession: state.success,
        characterSettlements: handoff.success,
      });
      if (Result.isFailure(committed)) {
        return battleStateTransitionErrorContent(committed.failure);
      }
      publishAdminProjectionBestEffort(root);

      return schemaJsonContent(EndBattleOutputSchema, {
        endedBattleId: state.success.state.battleId,
        closedAt: battleInitiativePosition(state.success.state),
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
  if (Result.isFailure(admitted)) return admitted.failure;

  const { session, previous, subject, fill } = admitted.success;
  const fills = [...(previous?.fills ?? []), fill];
  const replaySession =
    fill.kind === "interruptDecision"
      ? session
      : (previous?.baseSession ?? session);
  const result =
    fill.kind === "interruptDecision"
      ? resolveBattleRuntimeInterrupt({ session: replaySession, fill })
      : resolveBattleRuntimeSubject({
          session: replaySession,
          subject,
          fills,
          statBlockCatalog: root.statBlockCatalog,
        });
  const pendingTransaction = pendingTransactionForResult({
    result,
    filledSubject: subject,
    previous,
    fills,
    replaySession,
  });
  return storedBattleResolutionContent(root, result, pendingTransaction);
}

function admitBattleFillToolInput(
  root: McpPlaySessionRoot,
  input: FillBattleHoleToolInput,
) {
  const visibleSession = activeBattleForTool(root);
  if (Result.isFailure(visibleSession))
    return Result.fail(visibleSession.failure);

  const previous = root.sessionStore.pendingBattleFills;
  if (
    previous !== null &&
    !sameBattleSubject(previous.subject, input.subject)
  ) {
    return Result.fail(
      errorContent("A different battle subject has pending fills.", {
        code: "BATTLE_FILL_SUBJECT_MISMATCH",
        pendingSubject: previous.subject,
        requestedSubject: input.subject,
      }),
    );
  }
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
    return Result.isFailure(payload)
      ? battlePresentationIssueContent(payload.failure)
      : schemaJsonContent(BattleSessionOutputSchema, payload.success);
  }
  const payload = battleSessionPayload(root, null);
  return Result.isFailure(payload)
    ? battlePresentationIssueContent(payload.failure)
    : schemaJsonContent(BattleSessionOutputSchema, payload.success);
}

function activeBattleWithoutPendingFills(
  root: McpPlaySessionRoot,
  pendingMessage: string,
): Result.Result<BattleRuntimeSession, ToolError> {
  const session = activeBattleForTool(root);
  if (Result.isFailure(session)) return session;
  const pendingFills = root.sessionStore.pendingBattleFills;
  return pendingFills === null
    ? Result.succeed(session.success)
    : Result.fail(pendingBattleFillsContent(pendingFills, pendingMessage));
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
