import {
  applyInitiativeSwap,
  battleAdmittedSpellPresentations,
  battlePresentedSnapshot,
  battleStateInitIssueMessage,
  discoverBattleActs,
  finishInitialInitiativeSetup,
  type InitialInitiativeSetup,
} from "@dnd/battle-runtime";
import { Either, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { BattleLifecycleToolInput } from "./battle-lifecycle-tool-input.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import {
  battleSnapshotPresentationIssueContent,
  initialInitiativeSetupStartPayload,
} from "./battle-tool-payloads.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { completeBattleStateTransition } from "./battle-state-transition.ts";

export function handleBattleLifecycleToolCall(
  root: McpPlaySessionRoot,
  input: BattleLifecycleToolInput,
) {
  const state = root.sessionStore.battleState;
  return Match.value(state).pipe(
    Match.when({ tag: "none" }, () =>
      errorContent("No Battle lifecycle is open.", {
        code: "BATTLE_LIFECYCLE_NOT_OPEN",
      }),
    ),
    Match.when({ tag: "activeBattle" }, (matched) =>
      errorContent("Initial Initiative setup is already finalized.", {
        code: "INITIAL_INITIATIVE_SETUP_ALREADY_FINALIZED",
        battleId: matched.session.state.battleId,
      }),
    ),
    Match.when({ tag: "initialInitiativeSetup" }, (matched) =>
      Match.value(input.operation).pipe(
        Match.when({ kind: "applyInitiativeSwap" }, (operation) =>
          applySwap(root, matched.setup, operation),
        ),
        Match.when({ kind: "finalizeInitialInitiativeSetup" }, () =>
          finalizeSetup(root, matched.setup),
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

function applySwap(
  root: McpPlaySessionRoot,
  setup: InitialInitiativeSetup,
  operation: Extract<
    BattleLifecycleToolInput["operation"],
    { readonly kind: "applyInitiativeSwap" }
  >,
) {
  const result = applyInitiativeSwap({
    setup,
    sourceId: operation.sourceId,
    candidateId: operation.candidateId,
    candidateWitness: operation.candidateWitness,
  });
  if (Either.isLeft(result)) {
    return errorContent("Initiative Swap was rejected.", {
      code: "INITIAL_INITIATIVE_SWAP_REJECTED",
      message: battleStateInitIssueMessage(result.left),
    });
  }

  // The runtime mutates the one opaque setup owner. Re-store that same owner
  // under the same discriminant so every subsequent MCP operation routes via
  // the lifecycle state union.
  return completeBattleStateTransition({
    root,
    transition: root.sessionStore.updateInitialInitiativeSetup(result.right),
    output: () =>
      schemaJsonContent(
        StartBattleOutputSchema,
        initialInitiativeSetupStartPayload(root),
      ),
  });
}

function finalizeSetup(
  root: McpPlaySessionRoot,
  setup: InitialInitiativeSetup,
) {
  const session = finishInitialInitiativeSetup(setup);
  const snapshot = battlePresentedSnapshot(session);
  if (Either.isLeft(snapshot)) {
    return battleSnapshotPresentationIssueContent(snapshot.left);
  }

  return completeBattleStateTransition({
    root,
    transition: root.sessionStore.finalizeInitialInitiativeSetup(session),
    output: () =>
      schemaJsonContent(StartBattleOutputSchema, {
        battleState: root.sessionStore.snapshot().battleState,
        snapshot: snapshot.right,
        availableActs: discoverBattleActs(session),
        admittedSpellPresentations: battleAdmittedSpellPresentations(session),
        presentedInterruptChoices: [],
        session: mcpSessionSummary(root.sessionStore.snapshot()),
      }),
  });
}
