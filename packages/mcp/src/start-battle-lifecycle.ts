import { type BattleId, type BattleRuntimeSession } from "@dnd/battle-runtime";
import { Match, Either } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import {
  battlePresentationEnvelopeForSession,
  battlePresentationIssueContent,
} from "./battle-tool-payloads.ts";
import { completeBattleStateTransition } from "./battle-state-transition.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import type { AvailableCharacterSession } from "./session-store.ts";

export function activeBattleStartError(
  battleState: McpPlaySessionRoot["sessionStore"]["battleState"],
) {
  return Match.value(battleState).pipe(
    Match.when({ tag: "none" }, () => null),
    Match.when({ tag: "initialInitiativeSetup" }, (matched) =>
      alreadyActiveBattleError(matched.setup.state.battleId),
    ),
    Match.when({ tag: "activeBattle" }, (matched) =>
      alreadyActiveBattleError(matched.session.state.battleId),
    ),
    Match.exhaustive,
  );
}

function alreadyActiveBattleError(battleId: BattleId) {
  return errorContent("A battle session is already active.", {
    code: "BATTLE_SESSION_ALREADY_ACTIVE",
    battleId,
  });
}

export function commitActiveBattleStart(input: {
  readonly root: McpPlaySessionRoot;
  readonly session: BattleRuntimeSession;
  readonly characterSessions: readonly {
    readonly session: AvailableCharacterSession;
  }[];
}) {
  const presentedEnvelope = battlePresentationEnvelopeForSession(
    input.root,
    input.session,
  );
  if (Either.isLeft(presentedEnvelope)) {
    return battlePresentationIssueContent(presentedEnvelope.left);
  }
  const envelope = presentedEnvelope.right;
  return completeBattleStateTransition({
    root: input.root,
    transition: input.root.sessionStore.commitBattleStart({
      nextBattleState: { tag: "activeBattle", session: input.session },
      characterSessions: input.characterSessions.map(({ session }) => session),
    }),
    output: () => {
      const session = input.root.sessionStore.snapshot();
      const battleState = battleStateSnapshot(
        input.root.sessionStore.battleState,
      );
      if (battleState.tag !== "activeBattle") {
        throw new Error("Battle start payload requires owned active state.");
      }
      return schemaJsonContent(StartBattleOutputSchema, {
        envelope,
        session: { ...mcpSessionSummary(session), battleState },
      });
    },
  });
}
