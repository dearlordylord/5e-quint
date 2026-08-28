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
        const result = openCreatureFallsRuntimeInterruptWindow({
          session: state.right,
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
            replaySession: state.right,
          }),
        );
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
      const result = resolveBattleRuntimeSubject({
        session: state.right,
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
          replaySession: state.right,
        }),
      );
    }),
    Match.when({ name: battleToolNames.endTurn }, (matched) => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot end turn with pending battle fills.",
      );
      if (Either.isLeft(state)) return state.left;
      const result = resolveBattleRuntimeSubject({
        session: state.right,
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
          replaySession: state.right,
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

function handleFillBattleHoleToolCall(
  root: McpPlaySessionRoot,
  input: FillBattleHoleToolInput,
): BattleToolResult {
  const admitted = admitBattleFillToolInput(root, input);
  if (Either.isLeft(admitted)) return admitted.left;

  const { session, previous, subject, fill } = admitted.right;
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
  if (Either.isLeft(visibleSession)) return Either.left(visibleSession.left);

  const previous = root.sessionStore.pendingBattleFills;
  if (
    previous !== null &&
    !sameBattleSubject(previous.subject, input.subject)
  ) {
    return Either.left(
      errorContent("A different battle subject has pending fills.", {
        code: "BATTLE_FILL_SUBJECT_MISMATCH",
        pendingSubject: previous.subject,
        requestedSubject: input.subject,
      }),
    );
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
    return Either.isLeft(payload)
      ? battlePresentationIssueContent(payload.left)
      : schemaJsonContent(BattleSessionOutputSchema, payload.right);
  }
  const payload = battleSessionPayload(root, null);
  return Either.isLeft(payload)
    ? battlePresentationIssueContent(payload.left)
    : schemaJsonContent(BattleSessionOutputSchema, payload.right);
}

function activeBattleWithoutPendingFills(
  root: McpPlaySessionRoot,
  pendingMessage: string,
): Either.Either<BattleRuntimeSession, ToolError> {
  const session = activeBattleForTool(root);
  if (Either.isLeft(session)) return session;
  const pendingFills = root.sessionStore.pendingBattleFills;
  return pendingFills === null
    ? Either.right(session.right)
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
