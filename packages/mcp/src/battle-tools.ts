import {
  battleInitiativePosition,
  settleCreatureFallsRuntimeTransaction,
  settleBattleRuntimeTransaction,
  sameBattleSubject,
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
  BattleSessionOutputSchema,
  EndBattleOutputSchema,
  SelectStatBlockOutputSchema,
} from "./battle-tool-output.ts";
import { handleStartBattleToolCall } from "./start-battle-tool.ts";
import { handleBattleLifecycleToolCall } from "./battle-lifecycle-tool.ts";
import {
  battlePresentationEnvelopeForSession,
  battlePresentationIssueContent,
  battleSessionPayload,
  initialInitiativeSetupPayload,
  unknownStatBlockContent,
} from "./battle-tool-payloads.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";
import { battleStateTransitionErrorContent } from "./battle-state-transition.ts";
import type { BattleToolResult } from "./battle-tool-types.ts";
import {
  activeBattleWithoutPendingFills,
  battleRuntimeTransactionOperationForSubject,
  handleFillBattleHoleToolCall,
  storedBattleTransactionContent,
} from "./battle-tool-transaction.ts";

export { pendingFillFrontierIssue } from "./battle-tool-frontier.ts";

export type { BattleToolResult } from "./battle-tool-types.ts";

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
