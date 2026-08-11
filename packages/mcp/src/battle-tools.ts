import {
  discoverBattleActs,
  battleSubjectPresentation,
  openCreatureFallsRuntimeInterruptWindow,
  resolveBattleRuntimeInterrupt,
  resolveBattleRuntimeSubject,
  sameBattleSubject,
  type BattleFill,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
} from "@dnd/battle-runtime";
import { Either, Match } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import { battleToolNames, type BattleToolCall } from "./battle-tool-input.ts";
export {
  battleToolDefinitions,
  isBattleToolName,
} from "./battle-tool-definitions.ts";
import { finalizeCharacterSessionsFromBattle } from "./battle-handoff.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  EndBattleOutputSchema,
  SelectStatBlockOutputSchema,
} from "./battle-tool-output.ts";
import { handleStartBattleToolCall } from "./start-battle-tool.ts";
import {
  battleResolutionPayload,
  battleSessionPayload,
  battleSnapshotPresentationIssueContent,
  noStoredBattleContent,
  pendingBattleFillsContent,
  unknownStatBlockContent,
} from "./battle-tool-payloads.ts";
import type {
  BattleFillSession,
  PendingBattleFillSession,
} from "./session-store.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

export type BattleToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function handleBattleToolCall(
  root: McpCompositionRoot,
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
    Match.when({ name: battleToolNames.readBattleState }, () =>
      battleSessionContent(root),
    ),
    Match.when({ name: battleToolNames.discoverBattleActs }, () =>
      battleSessionContent(root),
    ),
    Match.when({ name: battleToolNames.fillBattleHole }, (matched) => {
      const visibleSession = root.sessionStore.battleSession;
      if (visibleSession == null) return noStoredBattleContent();

      const subject = matched.args.subject;
      const previous = root.sessionStore.pendingBattleFills;
      if (previous !== null && !sameBattleSubject(previous.subject, subject)) {
        return errorContent("A different battle subject has pending fills.", {
          code: "BATTLE_FILL_SUBJECT_MISMATCH",
          pendingSubject: previous.subject,
          requestedSubject: subject,
        });
      }
      const discoveredAct = discoverBattleActs(visibleSession).find((act) =>
        sameBattleSubject(act.subject, subject),
      );
      if (previous === null && discoveredAct === undefined) {
        return errorContent("Battle act is not currently available.", {
          code: "BATTLE_ACT_NOT_AVAILABLE",
          subject,
        });
      }

      const fills = [...(previous?.fills ?? []), matched.args.fill];
      const isInterruptDecision =
        matched.args.fill.kind === "interruptDecision";
      const replaySession = isInterruptDecision
        ? visibleSession
        : (previous?.baseSession ?? visibleSession);
      const result = isInterruptDecision
        ? resolveBattleRuntimeInterrupt({
            session: replaySession,
            fill: matched.args.fill,
          })
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
        isInterruptDecision,
      });
      if (storeBattleResolution(root, result, pendingTransaction)) {
        publishAdminProjectionBestEffort(root);
      }
      return battleResolutionContent(root, result);
    }),
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
        if (
          storeBattleResolution(
            root,
            result,
            pendingTransactionForResult({
              result,
              filledSubject: matched.args.subject,
              previous: null,
              fills: [],
              replaySession: state.right,
              isInterruptDecision: false,
            }),
          )
        ) {
          publishAdminProjectionBestEffort(root);
        }
        return battleResolutionContent(root, result);
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
      const result = resolveBattleRuntimeSubject({
        session: state.right,
        subject: matched.args.subject,
        fills: [],
        statBlockCatalog: root.statBlockCatalog,
      });
      if (
        storeBattleResolution(
          root,
          result,
          pendingTransactionForResult({
            result,
            filledSubject: matched.args.subject,
            previous: null,
            fills: [],
            replaySession: state.right,
            isInterruptDecision: false,
          }),
        )
      ) {
        publishAdminProjectionBestEffort(root);
      }
      return battleResolutionContent(root, result);
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
      if (
        storeBattleResolution(
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
            isInterruptDecision: false,
          }),
        )
      ) {
        publishAdminProjectionBestEffort(root);
      }
      return battleResolutionContent(root, result);
    }),
    Match.when({ name: battleToolNames.endBattle }, () => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot end battle with pending battle fills.",
      );
      if (Either.isLeft(state)) return state.left;

      const handoff = finalizeCharacterSessionsFromBattle(root, state.right);
      if (handoff !== null) return handoff;
      root.sessionStore.battleSession = null;
      root.sessionStore.pendingBattleFills = null;
      publishAdminProjectionBestEffort(root);

      return schemaJsonContent(EndBattleOutputSchema, {
        endedBattleId: state.right.state.battleId,
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

function battleSessionContent(root: McpCompositionRoot): BattleToolResult {
  const payload = battleSessionPayload(root, root.sessionStore.battleSession);
  return Either.isLeft(payload)
    ? battleSnapshotPresentationIssueContent(payload.left)
    : schemaJsonContent(BattleSessionOutputSchema, payload.right);
}

function battleResolutionContent(
  root: McpCompositionRoot,
  result: BattleRuntimeResolutionResult,
): BattleToolResult {
  const payload = battleResolutionPayload(
    root,
    result,
    root.sessionStore.battleSession ?? result.session,
  );
  return Either.isLeft(payload)
    ? battleSnapshotPresentationIssueContent(payload.left)
    : schemaJsonContent(BattleResolutionOutputSchema, payload.right);
}

export function storeBattleResolution(
  root: McpCompositionRoot,
  result: BattleRuntimeResolutionResult,
  pendingTransaction: PendingBattleFillSession | null,
): boolean {
  if (result.tag === "resolved") {
    root.sessionStore.battleSession = result.session;
    root.sessionStore.pendingBattleFills = null;
    return true;
  }
  if (result.tag === "needsHoles") {
    if (pendingTransaction === null) return false;
    root.sessionStore.battleSession = result.session;
    root.sessionStore.pendingBattleFills = pendingTransaction;
    return true;
  }
  return false;
}

function pendingTransactionForResult({
  result,
  filledSubject,
  previous,
  fills,
  replaySession,
  isInterruptDecision,
}: {
  readonly result: BattleRuntimeResolutionResult;
  readonly filledSubject: BattleFillSession["subject"];
  readonly previous: PendingBattleFillSession | null;
  readonly fills: readonly BattleFill[];
  readonly replaySession: BattleRuntimeSession;
  readonly isInterruptDecision: boolean;
}): PendingBattleFillSession | null {
  if (result.tag !== "needsHoles") return null;
  const resultPresentation = battleSubjectPresentation(
    result.session,
    result.subject,
  );
  if (resultPresentation === undefined) return null;
  if (
    isInterruptDecision &&
    previous !== null &&
    sameBattleSubject(result.subject, filledSubject)
  ) {
    return {
      baseSession: previous.baseSession,
      subject: result.subject,
      fills: previous.fills,
    };
  }
  return {
    baseSession: isInterruptDecision ? result.session : replaySession,
    subject: result.subject,
    fills: isInterruptDecision ? [] : fills,
  };
}

function activeBattleWithoutPendingFills(
  root: McpCompositionRoot,
  pendingMessage: string,
): Either.Either<BattleRuntimeSession, ToolError> {
  const session = root.sessionStore.battleSession;
  if (session == null) return Either.left(noStoredBattleContent());
  const pendingFills = root.sessionStore.pendingBattleFills;
  return pendingFills === null
    ? Either.right(session)
    : Either.left(pendingBattleFillsContent(pendingFills, pendingMessage));
}
