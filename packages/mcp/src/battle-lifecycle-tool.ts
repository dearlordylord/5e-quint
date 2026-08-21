import {
  battleAdmittedSpellPresentations,
  battlePresentedSnapshot,
  discoverBattleActs,
  type InitialInitiativeSetup,
} from "@dnd/battle-runtime";
import { Either, Match } from "effect";

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
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import { completeBattleStateTransition } from "./battle-state-transition.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";

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
    Match.when({ tag: "initialInitiativeSetup" }, (matched) =>
      Match.value(input.operation).pipe(
        Match.when({ kind: "applyInitiativeSwap" }, (operation) =>
          applySwap(root, matched.setup, operation),
        ),
        Match.when({ kind: "finalizeInitialInitiativeSetup" }, () =>
          finalizeSetup(root, matched.setup),
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
          handleActiveBattleRosterOperation(root, matched.session, operation),
        ),
        Match.when({ kind: "removeCombatant" }, (operation) =>
          handleActiveBattleRosterOperation(root, matched.session, operation),
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
  const transition = root.sessionStore.applyInitialInitiativeSwap({
    sourceId: operation.sourceId,
    candidateId: operation.candidateId,
    candidateWitness: operation.candidateWitness,
  });
  if (
    Either.isLeft(transition) &&
    transition.left.tag === "initialInitiativeSwapRejected"
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
          { code: "BATTLE_FINALIZATION_STATE_INVALID" },
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
          ...root.sessionStore.snapshot(),
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
