import {
  applyInitiativeSwap,
  battleAdmittedSpellPresentations,
  battlePresentedSnapshot,
  battleStateInitIssueMessage,
  discoverBattleActs,
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
import { battleStateSnapshot } from "./battle-state-snapshot.ts";

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
  _setup: InitialInitiativeSetup,
  operation: Extract<
    BattleLifecycleToolInput["operation"],
    { readonly kind: "applyInitiativeSwap" }
  >,
) {
  // The registry owns the setup. The transform receives that owned value and
  // may only replace it after the store verifies the battle identity.
  const transition = root.sessionStore.transformInitialInitiativeSetup(
    (setup) => {
      const result = applyInitiativeSwap({
        setup,
        sourceId: operation.sourceId,
        candidateId: operation.candidateId,
        candidateWitness: operation.candidateWitness,
      });
      return Either.mapLeft(result, (issue) =>
        battleStateInitIssueMessage(issue),
      );
    },
  );
  if (
    Either.isLeft(transition) &&
    transition.left.tag === "initialInitiativeSetupTransformRejected"
  ) {
    return errorContent("Initiative Swap was rejected.", {
      code: "INITIAL_INITIATIVE_SWAP_REJECTED",
      message: transition.left.message,
    });
  }
  return completeBattleStateTransition({
    root,
    transition,
    output: () =>
      schemaJsonContent(
        StartBattleOutputSchema,
        initialInitiativeSetupStartPayload(root),
      ),
  });
}

function finalizeSetup(
  root: McpPlaySessionRoot,
  _setup: InitialInitiativeSetup,
) {
  return completeBattleStateTransition({
    root,
    transition: Either.map(
      root.sessionStore.finalizeInitialInitiativeSetup(),
      () => undefined,
    ),
    output: () => {
      const state = root.sessionStore.battleState;
      if (state.tag !== "activeBattle") {
        return errorContent(
          "Battle finalization did not produce an active session.",
          {
            code: "BATTLE_FINALIZATION_STATE_INVALID",
          },
        );
      }
      const snapshot = battlePresentedSnapshot(state.session);
      if (Either.isLeft(snapshot)) {
        return battleSnapshotPresentationIssueContent(snapshot.left);
      }
      const battleState = battleStateSnapshot(state);
      return schemaJsonContent(StartBattleOutputSchema, {
        battleState,
        snapshot: snapshot.right,
        availableActs: discoverBattleActs(state.session),
        admittedSpellPresentations: battleAdmittedSpellPresentations(
          state.session,
        ),
        presentedInterruptChoices: [],
        session: {
          ...mcpSessionSummary(root.sessionStore.snapshot()),
          battleState,
        },
      });
    },
  });
}
