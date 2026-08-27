import {
  battleAdmittedSpellPresentations,
  battlePresentedSnapshot,
  discoverBattleActs,
} from "@dnd/battle-runtime";
import { Match, Result } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { BattleLifecycleToolInput } from "./battle-lifecycle-tool-input.ts";
import {
  battleLifecycleError,
  handleActiveBattleRosterOperation,
} from "./battle-roster-lifecycle.ts";
import {
  battleSnapshotPresentationIssueContent,
  initialInitiativeSetupStartPayload,
} from "./battle-tool-payloads.ts";
import { BattleLifecycleOutputSchema } from "./battle-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import { completeBattleStateTransition } from "./battle-state-transition.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";

export function handleBattleLifecycleToolCall(
  root: McpPlaySessionRoot,
  input: BattleLifecycleToolInput,
) {
  return Match.value(root.sessionStore.battleState).pipe(
    Match.when({ tag: "none" }, () =>
      errorContent("No Battle lifecycle is open.", {
        code: "BATTLE_LIFECYCLE_NOT_OPEN",
      }),
    ),
    Match.when({ tag: "initialInitiativeSetup" }, () =>
      Match.value(input.operation).pipe(
        Match.when({ kind: "applyInitiativeSwap" }, (operation) =>
          applySwap(root, operation),
        ),
        Match.when({ kind: "finalizeInitialInitiativeSetup" }, () =>
          finalizeSetup(root),
        ),
        Match.when({ kind: "addCombatant" }, () =>
          activeBattleOnlyOperationError("addCombatant"),
        ),
        Match.when({ kind: "removeCombatant" }, () =>
          activeBattleOnlyOperationError("removeCombatant"),
        ),
        Match.exhaustive,
      ),
    ),
    Match.when({ tag: "activeBattle" }, (matched) =>
      Match.value(input.operation).pipe(
        Match.when({ kind: "applyInitiativeSwap" }, () =>
          errorContent("Initial Initiative setup is already finalized.", {
            code: "INITIAL_INITIATIVE_SETUP_ALREADY_FINALIZED",
            battleId: matched.session.state.battleId,
          }),
        ),
        Match.when({ kind: "finalizeInitialInitiativeSetup" }, () =>
          errorContent("Initial Initiative setup is already finalized.", {
            code: "INITIAL_INITIATIVE_SETUP_ALREADY_FINALIZED",
            battleId: matched.session.state.battleId,
          }),
        ),
        Match.when({ kind: "addCombatant" }, (operation) =>
          handleActiveBattleRosterOperation(root, operation),
        ),
        Match.when({ kind: "removeCombatant" }, (operation) =>
          handleActiveBattleRosterOperation(root, operation),
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

function applySwap(
  root: McpPlaySessionRoot,
  operation: Extract<
    BattleLifecycleToolInput["operation"],
    { readonly kind: "applyInitiativeSwap" }
  >,
) {
  const transition = root.sessionStore.applyInitialInitiativeSwap({
    sourceId: operation.sourceId,
    candidateId: operation.candidateId,
    candidateWitness: operation.candidateWitness,
  });
  if (
    Result.isFailure(transition) &&
    transition.failure.tag === "initialInitiativeSwapRejected"
  ) {
    return errorContent("Initiative Swap was rejected.", {
      code: "INITIAL_INITIATIVE_SWAP_REJECTED",
      message: transition.failure.message,
    });
  }
  return completeBattleStateTransition({
    root,
    transition,
    output: () =>
      schemaJsonContent(
        BattleLifecycleOutputSchema,
        initialInitiativeSetupStartPayload(root),
      ),
  });
}

function finalizeSetup(root: McpPlaySessionRoot) {
  return completeBattleStateTransition({
    root,
    transition: Result.map(
      root.sessionStore.finalizeInitialInitiativeSetup(),
      () => undefined,
    ),
    output: () => {
      const state = root.sessionStore.battleState;
      if (state.tag !== "activeBattle") {
        return errorContent(
          "Battle finalization did not produce an active session.",
          { code: "BATTLE_FINALIZATION_STATE_INVALID" },
        );
      }
      const snapshot = battlePresentedSnapshot(state.session);
      if (Result.isFailure(snapshot)) {
        return battleSnapshotPresentationIssueContent(snapshot.failure);
      }
      const battleState = battleStateSnapshot(state);
      return schemaJsonContent(BattleLifecycleOutputSchema, {
        battleState,
        snapshot: snapshot.success,
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

function activeBattleOnlyOperationError(
  operation: "addCombatant" | "removeCombatant",
) {
  return battleLifecycleError(
    `The ${operation} operation requires an active Battle.`,
    { code: "BATTLE_LIFECYCLE_ACTIVE_BATTLE_REQUIRED", operation },
  );
}
