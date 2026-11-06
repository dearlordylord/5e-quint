import type {
  CharacterDraft,
  CharacterDraftId,
} from "@dnd/character-creation-runtime";
import type {
  BattlePendingTransaction,
  BattleRuntimeSession,
} from "@dnd/battle-runtime";
import {
  applyInitiativeSwap,
  battleStateInitIssueMessage,
  finishInitialInitiativeSetup,
} from "@dnd/battle-runtime";
import {
  characterSheetCurrentHp,
  characterSheetSpellSlots,
  rebuildCharacterSheet,
  characterSheetId,
  type CharacterSheetId,
} from "@dnd/character-sheet-runtime";
type CharacterId = CharacterSheetId;
import type {
  SrdStatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Result, Match, Option } from "effect";
import { createBattleActionSelectionStore } from "./battle-action-selection-store.ts";
export type {
  McpPendingBattleSelection,
  McpBattleActionCancellationIssue,
} from "./battle-action-selection-store.ts";
import type { SrdStatBlockRecord } from "@dnd/surface/surface/types";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import { createBattleRosterTransitionPlanner } from "./battle-roster-session-store.ts";
import type {
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterOperation,
  McpBattleRosterTransitionIssue,
} from "./battle-roster-session-types.ts";
import { createCharacterSessionRegistry } from "./character-session-registry.ts";
import {
  invalidBattleStateTransition,
  activeBattleSessionTransition,
  validateBattleResultSessionLineage,
  validateExpectedActiveBattleSession,
  validatePendingBattleTransactionSession,
} from "./session-store-state-transition.ts";
import {
  commitBattleEndTransition,
  commitBattleStartTransition,
} from "./battle-session-store-commit.ts";
import type {
  AvailableCharacterSession,
  AvailableCharacterSessionInput,
  CharacterSessionIssue,
  McpBattleState,
  McpBattleStateTransitionIssue,
  McpSessionSnapshot,
  McpSessionStore,
  McpSessionStoreContinuation,
} from "./session-store-types.ts";

export type {
  ActiveBattleRosterTransitionPlan,
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterOperation,
  McpBattleRosterTransitionIssue,
} from "./battle-roster-session-types.ts";
export type * from "./session-store-types.ts";

export function availableCharacterSession(
  input: AvailableCharacterSessionInput,
): Result.Result<AvailableCharacterSession, CharacterSessionIssue> {
  const sheet = rebuildCharacterSheet(input);
  return Result.isFailure(sheet)
    ? characterSessionIssue(sheet.failure.message)
    : Result.succeed(sheet.success);
}

export function characterSessionIssue(
  message: string,
): Result.Result<never, CharacterSessionIssue> {
  return Result.fail({
    tag: "characterSessionIssue",
    message: message.replaceAll("Character Sheet", "character session"),
  });
}

export function characterSessionCurrentHp(
  session: AvailableCharacterSession,
): ReturnType<typeof characterSheetCurrentHp> {
  return characterSheetCurrentHp(session);
}

export function characterBattleSpellSlots(
  session: AvailableCharacterSession,
): ReturnType<typeof characterSheetSpellSlots> {
  return characterSheetSpellSlots(session);
}

export function characterIdFromDraftId(draftId: CharacterDraftId): CharacterId {
  return characterSheetId(`character:${encodeURIComponent(String(draftId))}`);
}

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
export function createMcpSessionStore(input: {
  readonly statBlockCatalog: SrdStatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly continuation?: McpSessionStoreContinuation;
}): McpSessionStore {
  const { statBlockCatalog, unitLibrary } = input;
  const drafts = new Map(input.continuation?.drafts);
  const characters = createCharacterSessionRegistry();
  for (const character of input.continuation?.characters ?? [])
    characters.set(character);
  const storeIdentity = {};
  const battleRosterPlanner = createBattleRosterTransitionPlanner({
    characters,
    statBlockCatalog,
    unitLibrary,
    storeIdentity,
  });
  let selectedStatBlockId: StatBlockId | null =
    input.continuation?.selectedStatBlockId ?? null;
  const actionSelection = createBattleActionSelectionStore(
    input.continuation?.actionSelection,
  );
  let battleState: McpBattleState = input.continuation?.battleState ?? {
    tag: "none",
  };

  function planActiveBattleRosterTransition(
    operation: Extract<McpBattleRosterOperation, { readonly kind: "remove" }>,
  ): Result.Result<
    Extract<ActiveBattleRosterTransitionPreview, { readonly kind: "remove" }>,
    McpBattleRosterTransitionIssue
  >;
  function planActiveBattleRosterTransition(
    operation: Extract<
      McpBattleRosterOperation,
      { readonly kind: "addCharacter" | "addStatBlock" }
    >,
  ): Result.Result<
    Extract<ActiveBattleRosterTransitionPreview, { readonly kind: "add" }>,
    McpBattleRosterTransitionIssue
  >;
  function planActiveBattleRosterTransition(
    operation: McpBattleRosterOperation,
  ): Result.Result<
    ActiveBattleRosterTransitionPreview,
    McpBattleRosterTransitionIssue
  > {
    if (battleState.tag !== "activeBattle") {
      return invalidBattleStateTransition(battleState.tag, "activeBattle");
    }
    return battleRosterPlanner.plan(
      operation,
      battleState.session,
      actionSelection.transaction,
    );
  }

  function storeActiveBattleSession(
    session: BattleRuntimeSession,
  ): Result.Result<void, McpBattleStateTransitionIssue> {
    const transition = activeBattleSessionTransition(battleState, session);
    if (Result.isFailure(transition)) return Result.fail(transition.failure);
    battleState = transition.success;
    actionSelection.clear();
    return Result.succeed(undefined);
  }

  function storePending(
    expected: BattleRuntimeSession,
    session: BattleRuntimeSession,
    transaction: BattlePendingTransaction,
  ): Result.Result<void, McpBattleStateTransitionIssue> {
    const current = validateExpectedActiveBattleSession(battleState, expected);
    if (Result.isFailure(current)) return current;
    const lineage = validateBattleResultSessionLineage(expected, session);
    if (Result.isFailure(lineage)) return lineage;
    const transactionCheck = validatePendingBattleTransactionSession(
      transaction,
      session,
    );
    if (Result.isFailure(transactionCheck)) return transactionCheck;
    return actionSelection.commitContinuation(transaction, () =>
      storeActiveBattleSession(session),
    );
  }

  const store: McpSessionStore = {
    retainContinuation() {
      return {
        drafts,
        characters: [...characters.entries()].map(([, value]) => value),
        selectedStatBlockId,
        battleState,
        actionSelection: actionSelection.retainContinuation(),
      };
    },
    drafts,
    characters,
    get battleState() {
      return battleState;
    },
    get nextBattleActionSelectionId() {
      return actionSelection.nextSelectionId;
    },
    get battleSession(): BattleRuntimeSession | null {
      return battleState.tag === "activeBattle" ? battleState.session : null;
    },
    commitBattleStart({ nextBattleState, characterSessions }) {
      const committed = commitBattleStartTransition({
        currentBattleState: battleState,
        nextBattleState,
        characterSessions,
        characters,
      });
      if (Result.isFailure(committed)) return Result.fail(committed.failure);
      battleState = committed.success;
      actionSelection.clear();
      return Result.succeed(undefined);
    },
    commitBattleEnd({ battleSession, characterSettlements }) {
      const committed = commitBattleEndTransition({
        currentBattleState: battleState,
        battleSession,
        characterSettlements,
        characters,
      });
      if (Result.isFailure(committed)) return Result.fail(committed.failure);
      battleState = committed.success;
      actionSelection.clear();
      return Result.succeed(undefined);
    },
    storeActiveBattle(session) {
      return storeActiveBattleSession(session);
    },
    cancelPendingBattleAction(
      expectedSession,
      expectedTransaction,
      expectedSelectionId,
    ) {
      const current = validateExpectedActiveBattleSession(
        battleState,
        expectedSession,
      );
      if (Result.isFailure(current)) return current;
      return actionSelection.cancel(
        expectedSession,
        expectedTransaction,
        expectedSelectionId,
      );
    },
    storeBattleTransactionResult(expectedSession, result) {
      return Match.value(result).pipe(
        Match.when({ tag: "invalid" }, ({ resolution, transaction }) =>
          transaction === null
            ? Result.succeed(undefined)
            : storePending(expectedSession, resolution.session, transaction),
        ),
        Match.when({ tag: "defect" }, () => Result.succeed(undefined)),
        Match.when({ tag: "settled" }, ({ session }) => {
          const current = validateExpectedActiveBattleSession(
            battleState,
            expectedSession,
          );
          if (Result.isFailure(current)) return current;
          const lineage = validateBattleResultSessionLineage(
            expectedSession,
            session,
          );
          if (Result.isFailure(lineage)) return lineage;
          return storeActiveBattleSession(session);
        }),
        Match.when({ tag: "needsHoles" }, ({ resolution, transaction }) =>
          storePending(expectedSession, resolution.session, transaction),
        ),
        Match.exhaustive,
      );
    },
    planActiveBattleRosterTransition,
    commitActiveBattleRosterTransition(plan) {
      if (battleState.tag !== "activeBattle") {
        return invalidBattleStateTransition(battleState.tag, "activeBattle");
      }
      const committed = battleRosterPlanner.commit(
        plan,
        battleState.session,
        actionSelection.transaction,
      );
      if (Result.isFailure(committed)) return Result.fail(committed.failure);
      battleState = { tag: "activeBattle", session: committed.success };
      actionSelection.clear();
      return committed;
    },
    storeInitialInitiativeSetup(setup) {
      if (battleState.tag !== "none") {
        return invalidBattleStateTransition(
          battleState.tag,
          "initialInitiativeSetup",
        );
      }
      battleState = { tag: "initialInitiativeSetup", setup };
      actionSelection.clear();
      return Result.succeed(undefined);
    },
    applyInitialInitiativeSwap(input) {
      if (battleState.tag !== "initialInitiativeSetup") {
        return invalidBattleStateTransition(
          battleState.tag,
          "initialInitiativeSetup",
        );
      }
      const swapped = applyInitiativeSwap({
        setup: battleState.setup,
        ...input,
      });
      if (Result.isFailure(swapped)) {
        return Result.fail({
          tag: "initialInitiativeSwapRejected",
          message: battleStateInitIssueMessage(swapped.failure),
        });
      }
      return Result.succeed(undefined);
    },
    finalizeInitialInitiativeSetup() {
      if (battleState.tag !== "initialInitiativeSetup") {
        return invalidBattleStateTransition(battleState.tag, "activeBattle");
      }
      const session = finishInitialInitiativeSetup(battleState.setup);
      battleState = { tag: "activeBattle", session };
      actionSelection.clear();
      return Result.succeed(session);
    },
    getPendingBattleTransaction(): BattlePendingTransaction | null {
      return actionSelection.transaction;
    },
    getPendingBattleSelection() {
      return actionSelection.selection;
    },
    clearSelectedStatBlock(): void {
      selectedStatBlockId = null;
    },
    getSelectedStatBlock(): SrdStatBlockRecord | null {
      if (selectedStatBlockId === null) return null;
      const statBlock = statBlockCatalog.getStatBlock(selectedStatBlockId);
      return Option.isSome(statBlock) ? statBlock.value : null;
    },
    selectStatBlock(statBlockId: StatBlockId) {
      const statBlock = statBlockCatalog.getStatBlock(statBlockId);
      if (Option.isNone(statBlock)) {
        return characterSessionIssue(`Unknown Stat Block id: ${statBlockId}`);
      }
      selectedStatBlockId = statBlock.value.id;
      return Result.succeed(statBlock.value);
    },
    snapshot(): McpSessionSnapshot {
      const characterIds = Array.from(characters.keys());
      return {
        draftIds: Array.from(drafts.keys()),
        characterIds,
        selectedStatBlockId,
        battleState: battleStateSnapshot(store.battleState),
      };
    },
  } satisfies McpSessionStore;

  return store;
}
