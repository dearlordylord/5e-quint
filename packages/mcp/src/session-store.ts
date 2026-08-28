import type {
  CharacterDraft,
  CharacterDraftId,
} from "@dnd/character-creation-runtime";
import type {
  BattlePendingTransaction,
  BattleRuntimeSession,
  BattleRuntimeTransactionResult,
  InitialInitiativeSetup,
  InitiativeSwapCandidateWitness,
} from "@dnd/battle-runtime";
import {
  applyInitiativeSwap,
  battleStateInitIssueMessage,
  battlePendingTransactionViewForSession,
  battleRuntimeSessionDescendsFrom,
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
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { Either, Match, Option } from "effect";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import { createBattleRosterTransitionPlanner } from "./battle-roster-session-store.ts";
import type {
  ActiveBattleRosterTransitionPlan,
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterOperation,
  McpBattleRosterTransitionIssue,
} from "./battle-roster-session-types.ts";
import { createCharacterSessionRegistry } from "./character-session-registry.ts";
import { invalidBattleStateTransition } from "./session-store-state-transition.ts";
import {
  commitBattleEndTransition,
  commitBattleStartTransition,
} from "./battle-session-store-commit.ts";
import type { BattleCharacterSessionSettlement } from "./battle-handoff.ts";
import type {
  AvailableCharacterSession,
  AvailableCharacterSessionInput,
  CharacterSessionRegistry,
  CharacterSessionIssue,
  McpBattleTransactionStorageIssue,
  McpBattleState,
  McpBattleStateTransitionIssue,
  McpSessionSnapshot,
} from "./session-store-types.ts";

export type {
  ActiveBattleRosterTransitionPlan,
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterOperation,
  McpBattleRosterTransitionIssue,
} from "./battle-roster-session-types.ts";
export type * from "./session-store-types.ts";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
export type McpSessionStore = {
  readonly drafts: Map<CharacterDraftId, CharacterDraft>;
  readonly characters: CharacterSessionRegistry;
  readonly battleState: McpBattleState;
  readonly battleSession: BattleRuntimeSession | null;
  commitBattleStart(input: {
    readonly nextBattleState: Exclude<McpBattleState, { readonly tag: "none" }>;
    readonly characterSessions: readonly AvailableCharacterSession[];
  }): Either.Either<void, McpBattleStateTransitionIssue>;
  commitBattleEnd(input: {
    readonly battleSession: BattleRuntimeSession;
    readonly characterSettlements: readonly BattleCharacterSessionSettlement[];
  }): Either.Either<void, McpBattleStateTransitionIssue>;
  storeActiveBattle(
    session: BattleRuntimeSession,
  ): Either.Either<void, McpBattleStateTransitionIssue>;
  storeBattleTransactionResult(
    expectedSession: BattleRuntimeSession,
    result: BattleRuntimeTransactionResult,
  ): Either.Either<
    void,
    McpBattleStateTransitionIssue | McpBattleTransactionStorageIssue
  >;
  planActiveBattleRosterTransition(
    operation: Extract<McpBattleRosterOperation, { readonly kind: "remove" }>,
  ): Either.Either<
    Extract<ActiveBattleRosterTransitionPreview, { readonly kind: "remove" }>,
    McpBattleRosterTransitionIssue
  >;
  planActiveBattleRosterTransition(
    operation: Extract<
      McpBattleRosterOperation,
      { readonly kind: "addCharacter" | "addStatBlock" }
    >,
  ): Either.Either<
    Extract<ActiveBattleRosterTransitionPreview, { readonly kind: "add" }>,
    McpBattleRosterTransitionIssue
  >;
  commitActiveBattleRosterTransition(
    plan: ActiveBattleRosterTransitionPlan,
  ): Either.Either<BattleRuntimeSession, McpBattleRosterTransitionIssue>;
  storeInitialInitiativeSetup(
    setup: InitialInitiativeSetup,
  ): Either.Either<void, McpBattleStateTransitionIssue>;
  applyInitialInitiativeSwap(input: {
    readonly sourceId: Parameters<typeof applyInitiativeSwap>[0]["sourceId"];
    readonly candidateId: Parameters<
      typeof applyInitiativeSwap
    >[0]["candidateId"];
    readonly candidateWitness: InitiativeSwapCandidateWitness;
  }): Either.Either<void, McpBattleStateTransitionIssue>;
  finalizeInitialInitiativeSetup(): Either.Either<
    BattleRuntimeSession,
    McpBattleStateTransitionIssue
  >;
  getPendingBattleTransaction(): BattlePendingTransaction | null;
  clearSelectedStatBlock(): void;
  getSelectedStatBlock(): StatBlockRecord | null;
  selectStatBlock(
    statBlockId: StatBlockId,
  ): Either.Either<StatBlockRecord, CharacterSessionIssue>;
  snapshot(): McpSessionSnapshot;
};

export function availableCharacterSession(
  input: AvailableCharacterSessionInput,
): Either.Either<AvailableCharacterSession, CharacterSessionIssue> {
  const sheet = rebuildCharacterSheet(input);
  return Either.isLeft(sheet)
    ? characterSessionIssue(sheet.left.message)
    : Either.right(sheet.right);
}

export function characterSessionIssue(
  message: string,
): Either.Either<never, CharacterSessionIssue> {
  return Either.left({
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

export function createMcpSessionStore(input: {
  readonly statBlockCatalog: StatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
}): McpSessionStore {
  const { statBlockCatalog, unitLibrary } = input;
  const drafts = new Map<CharacterDraftId, CharacterDraft>();
  const characters = createCharacterSessionRegistry();
  const storeIdentity = {};
  const battleRosterPlanner = createBattleRosterTransitionPlanner({
    characters,
    statBlockCatalog,
    unitLibrary,
    storeIdentity,
  });
  let selectedStatBlockId: StatBlockId | null = null;
  let pendingBattleTransaction: BattlePendingTransaction | null = null;
  let battleState: McpBattleState = { tag: "none" };

  function planActiveBattleRosterTransition(
    operation: Extract<McpBattleRosterOperation, { readonly kind: "remove" }>,
  ): Either.Either<
    Extract<ActiveBattleRosterTransitionPreview, { readonly kind: "remove" }>,
    McpBattleRosterTransitionIssue
  >;
  function planActiveBattleRosterTransition(
    operation: Extract<
      McpBattleRosterOperation,
      { readonly kind: "addCharacter" | "addStatBlock" }
    >,
  ): Either.Either<
    Extract<ActiveBattleRosterTransitionPreview, { readonly kind: "add" }>,
    McpBattleRosterTransitionIssue
  >;
  function planActiveBattleRosterTransition(
    operation: McpBattleRosterOperation,
  ): Either.Either<
    ActiveBattleRosterTransitionPreview,
    McpBattleRosterTransitionIssue
  > {
    if (battleState.tag !== "activeBattle") {
      return invalidBattleStateTransition(battleState.tag, "activeBattle");
    }
    return battleRosterPlanner.plan(
      operation,
      battleState.session,
      pendingBattleTransaction,
    );
  }

  function storeActiveBattleSession(
    session: BattleRuntimeSession,
  ): Either.Either<void, McpBattleStateTransitionIssue> {
    if (battleState.tag === "initialInitiativeSetup") {
      return invalidBattleStateTransition(battleState.tag, "activeBattle");
    }
    if (
      battleState.tag === "activeBattle" &&
      session.state.battleId !== battleState.session.state.battleId
    ) {
      return Either.left({
        tag: "battleStateBattleOwnershipConflict",
        expectedBattleId: battleState.session.state.battleId,
        actualBattleId: session.state.battleId,
      });
    }
    battleState = { tag: "activeBattle", session };
    pendingBattleTransaction = null;
    return Either.right(undefined);
  }

  function requireExpectedActiveBattleSession(
    expectedSession: BattleRuntimeSession,
  ): Either.Either<void, McpBattleStateTransitionIssue> {
    return battleState.tag === "activeBattle" &&
      battleState.session === expectedSession
      ? Either.right(undefined)
      : Either.left({
          tag: "battleStateSessionChanged",
          battleId: expectedSession.state.battleId,
        });
  }

  function requireResultSessionDescendant(
    expectedSession: BattleRuntimeSession,
    resultSession: BattleRuntimeSession,
  ): Either.Either<void, McpBattleStateTransitionIssue> {
    return battleRuntimeSessionDescendsFrom(resultSession, expectedSession)
      ? Either.right(undefined)
      : Either.left({
          tag: "battleStateSessionChanged",
          battleId: expectedSession.state.battleId,
        });
  }

  const store: McpSessionStore = {
    drafts,
    characters,
    get battleState() {
      return battleState;
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
      if (Either.isLeft(committed)) return committed;
      battleState = committed.right;
      pendingBattleTransaction = null;
      return Either.right(undefined);
    },
    commitBattleEnd({ battleSession, characterSettlements }) {
      const committed = commitBattleEndTransition({
        currentBattleState: battleState,
        battleSession,
        characterSettlements,
        characters,
      });
      if (Either.isLeft(committed)) return committed;
      battleState = committed.right;
      pendingBattleTransaction = null;
      return Either.right(undefined);
    },
    storeActiveBattle(session) {
      return storeActiveBattleSession(session);
    },
    storeBattleTransactionResult(expectedSession, result) {
      return Match.value(result).pipe(
        Match.when({ tag: "invalid" }, () => Either.right(undefined)),
        Match.when({ tag: "defect" }, () => Either.right(undefined)),
        Match.when({ tag: "settled" }, ({ session }) => {
          const current = requireExpectedActiveBattleSession(expectedSession);
          if (Either.isLeft(current)) return current;
          const lineage = requireResultSessionDescendant(
            expectedSession,
            session,
          );
          if (Either.isLeft(lineage)) return lineage;
          return storeActiveBattleSession(session);
        }),
        Match.when({ tag: "needsHoles" }, ({ resolution, transaction }) => {
          const current = requireExpectedActiveBattleSession(expectedSession);
          if (Either.isLeft(current)) return current;
          const lineage = requireResultSessionDescendant(
            expectedSession,
            resolution.session,
          );
          if (Either.isLeft(lineage)) return lineage;
          const transactionCheck = battlePendingTransactionViewForSession(
            transaction,
            resolution.session,
          );
          if (transactionCheck.tag !== "valid") {
            return Either.left({
              tag: "battleStatePendingTransactionInvalid" as const,
              battleId: resolution.session.state.battleId,
              reason: transactionCheck.tag,
            });
          }
          const stored = storeActiveBattleSession(resolution.session);
          if (Either.isLeft(stored)) return stored;
          pendingBattleTransaction = transaction;
          return Either.right(undefined);
        }),
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
        pendingBattleTransaction,
      );
      if (Either.isLeft(committed)) return Either.left(committed.left);
      battleState = { tag: "activeBattle", session: committed.right };
      pendingBattleTransaction = null;
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
      pendingBattleTransaction = null;
      return Either.right(undefined);
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
      if (Either.isLeft(swapped)) {
        return Either.left({
          tag: "initialInitiativeSwapRejected",
          message: battleStateInitIssueMessage(swapped.left),
        });
      }
      return Either.right(undefined);
    },
    finalizeInitialInitiativeSetup() {
      if (battleState.tag !== "initialInitiativeSetup") {
        return invalidBattleStateTransition(battleState.tag, "activeBattle");
      }
      const session = finishInitialInitiativeSetup(battleState.setup);
      battleState = { tag: "activeBattle", session };
      pendingBattleTransaction = null;
      return Either.right(session);
    },
    getPendingBattleTransaction(): BattlePendingTransaction | null {
      return pendingBattleTransaction;
    },
    clearSelectedStatBlock(): void {
      selectedStatBlockId = null;
    },
    getSelectedStatBlock(): StatBlockRecord | null {
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
      return Either.right(statBlock.value);
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
