import {
  discoverBattleActs,
  openCreatureFallsInterruptWindow,
  resolveBattleInterrupt,
  resolveBattleSubject,
  sameBattleSubject,
  snapshotBattle,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
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
import type {
  BattleFillSession,
  PendingBattleFillSession,
} from "./session-store.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
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
        session: root.sessionStore.snapshot(),
      });
    }),
    Match.when({ name: battleToolNames.startBattle }, (matched) =>
      handleStartBattleToolCall(root, matched.args),
    ),
    Match.when({ name: battleToolNames.readBattleState }, () =>
      schemaJsonContent(
        BattleSessionOutputSchema,
        battleSessionPayload(root, root.sessionStore.battleState),
      ),
    ),
    Match.when({ name: battleToolNames.discoverBattleActs }, () =>
      schemaJsonContent(
        BattleSessionOutputSchema,
        battleSessionPayload(root, root.sessionStore.battleState),
      ),
    ),
    Match.when({ name: battleToolNames.fillBattleHole }, (matched) => {
      const visibleState = root.sessionStore.battleState;
      if (visibleState == null) return noStoredBattleContent();

      const subject = matched.args.subject;
      const previous = root.sessionStore.pendingBattleFills;
      if (previous !== null && !sameBattleSubject(previous.subject, subject)) {
        return errorContent("A different battle subject has pending fills.", {
          code: "BATTLE_FILL_SUBJECT_MISMATCH",
          pendingSubject: previous.subject,
          requestedSubject: subject,
        });
      }

      const fills = [...(previous?.fills ?? []), matched.args.fill];
      const isInterruptDecision =
        matched.args.fill.kind === "interruptDecision";
      const replayState = isInterruptDecision
        ? visibleState
        : (previous?.baseState ?? visibleState);
      const result = isInterruptDecision
        ? resolveBattleInterrupt({
            state: replayState,
            fill: matched.args.fill,
          })
        : resolveBattleSubject({
            state: replayState,
            subject,
            fills,
            statBlockCatalog: root.statBlockCatalog,
          });
      const pendingTransaction = pendingTransactionForResult({
        result,
        filledSubject: subject,
        previous,
        fills,
        replayState,
        isInterruptDecision,
      });
      if (storeBattleResolution(root, result, pendingTransaction)) {
        publishAdminProjectionBestEffort(root);
      }
      return schemaJsonContent(
        BattleResolutionOutputSchema,
        battleResolutionPayload(root, result),
      );
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
        const result = openCreatureFallsInterruptWindow({
          state: state.right,
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
              replayState: state.right,
              isInterruptDecision: false,
            }),
          )
        ) {
          publishAdminProjectionBestEffort(root);
        }
        return schemaJsonContent(
          BattleResolutionOutputSchema,
          battleResolutionPayload(root, result),
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
      const result = resolveBattleSubject({
        state: state.right,
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
            replayState: state.right,
            isInterruptDecision: false,
          }),
        )
      ) {
        publishAdminProjectionBestEffort(root);
      }
      return schemaJsonContent(
        BattleResolutionOutputSchema,
        battleResolutionPayload(root, result),
      );
    }),
    Match.when({ name: battleToolNames.endTurn }, (matched) => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot end turn with pending battle fills.",
      );
      if (Either.isLeft(state)) return state.left;
      const result = resolveBattleSubject({
        state: state.right,
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
            replayState: state.right,
            isInterruptDecision: false,
          }),
        )
      ) {
        publishAdminProjectionBestEffort(root);
      }
      return schemaJsonContent(
        BattleResolutionOutputSchema,
        battleResolutionPayload(root, result),
      );
    }),
    Match.when({ name: battleToolNames.endBattle }, () => {
      const state = activeBattleWithoutPendingFills(
        root,
        "Cannot end battle with pending battle fills.",
      );
      if (Either.isLeft(state)) return state.left;

      const handoff = finalizeCharacterSessionsFromBattle(root, state.right);
      if (handoff !== null) return handoff;
      root.sessionStore.battleState = null;
      root.sessionStore.pendingBattleFills = null;
      publishAdminProjectionBestEffort(root);

      return schemaJsonContent(EndBattleOutputSchema, {
        endedBattleId: state.right.battleId,
        characters: Array.from(root.sessionStore.characters.entries()).map(
          ([characterId, session]) => ({
            characterId,
            session,
          }),
        ),
        session: root.sessionStore.snapshot(),
      });
    }),
    Match.exhaustive,
  );
}

function storeBattleResolution(
  root: McpCompositionRoot,
  result: BattleResolutionResult,
  pendingTransaction: PendingBattleFillSession | null,
): boolean {
  if (result.tag === "resolved") {
    root.sessionStore.battleState = result.state;
    root.sessionStore.pendingBattleFills = null;
    return true;
  }
  if (result.tag === "needsHoles") {
    root.sessionStore.battleState = result.state;
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
  replayState,
  isInterruptDecision,
}: {
  readonly result: BattleResolutionResult;
  readonly filledSubject: BattleFillSession["subject"];
  readonly previous: PendingBattleFillSession | null;
  readonly fills: readonly BattleFill[];
  readonly replayState: BattleState;
  readonly isInterruptDecision: boolean;
}): PendingBattleFillSession | null {
  if (result.tag !== "needsHoles") return null;
  if (
    isInterruptDecision &&
    previous !== null &&
    sameBattleSubject(result.subject, filledSubject)
  ) {
    return {
      baseState: previous.baseState,
      subject: result.subject,
      fills: previous.fills,
    };
  }
  return {
    baseState: isInterruptDecision ? result.state : replayState,
    subject: result.subject,
    fills: isInterruptDecision ? [] : fills,
  };
}

function unknownStatBlockContent(statBlockId: string, error: unknown) {
  return errorContent(`Unknown Stat Block: ${statBlockId}`, {
    code: "UNKNOWN_STAT_BLOCK",
    statBlockId,
    message: error instanceof Error ? error.message : String(error),
  });
}

function battleSessionPayload(
  root: McpCompositionRoot,
  state: BattleState | null,
) {
  return {
    snapshot: state === null ? null : snapshotBattle(state),
    session: root.sessionStore.snapshot(),
  };
}

function battleResolutionPayload(
  root: McpCompositionRoot,
  result: BattleResolutionResult,
) {
  return {
    result: battleResolutionResultPayload(result),
    snapshot: result.snapshot,
    session: root.sessionStore.snapshot(),
  };
}

function battleResolutionResultPayload(result: BattleResolutionResult) {
  if (result.tag === "resolved") {
    return {
      tag: result.tag,
      snapshot: result.snapshot,
      ...(result.objectDamages === undefined
        ? {}
        : { objectDamages: result.objectDamages }),
      ...(result.objectIgnitions === undefined
        ? {}
        : { objectIgnitions: result.objectIgnitions }),
      ...(result.droppedObjects === undefined
        ? {}
        : { droppedObjects: result.droppedObjects }),
      ...(result.shovePushes === undefined
        ? {}
        : { shovePushes: result.shovePushes }),
    };
  }
  if (result.tag === "needsHoles") {
    return {
      tag: result.tag,
      subject: result.subject,
      holes: result.holes,
      snapshot: result.snapshot,
    };
  }

  return result;
}

function noStoredBattleContent() {
  return errorContent("No battle session has been started.", {
    code: "NO_BATTLE_SESSION",
  });
}

function activeBattleWithoutPendingFills(
  root: McpCompositionRoot,
  pendingMessage: string,
): Either.Either<BattleState, ToolError> {
  const state = root.sessionStore.battleState;
  if (state == null) return Either.left(noStoredBattleContent());
  const pendingFills = root.sessionStore.pendingBattleFills;
  return pendingFills === null
    ? Either.right(state)
    : Either.left(pendingBattleFillsContent(pendingFills, pendingMessage));
}

function pendingBattleFillsContent(
  pendingFills: BattleFillSession,
  message: string,
) {
  return errorContent(message, {
    code: "BATTLE_FILLS_PENDING",
    pendingSubject: pendingFills.subject,
  });
}
