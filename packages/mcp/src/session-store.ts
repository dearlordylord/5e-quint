import type {
  CharacterDraft,
  CharacterDraftId,
} from "@dnd/character-creation-runtime";
import type {
  BattleRuntimeSession,
  InitialInitiativeSetup,
  InitiativeSwapCandidateWitness,
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
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { Option, Result } from "effect";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import { createBattleRosterTransitionPlanner } from "./battle-roster-session-store.ts";
import type {
  ActiveBattleRosterTransitionPlan,
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterOperation,
  McpBattleRosterTransitionIssue,
} from "./battle-roster-session-types.ts";
import { createCharacterSessionRegistry } from "./character-session-registry.ts";
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
  McpBattleState,
  McpBattleStateTransitionIssue,
  McpSessionSnapshot,
  PendingBattleFillSession,
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
  }): Result.Result<void, McpBattleStateTransitionIssue>;
  commitBattleEnd(input: {
    readonly battleSession: BattleRuntimeSession;
    readonly characterSettlements: readonly BattleCharacterSessionSettlement[];
  }): Result.Result<void, McpBattleStateTransitionIssue>;
  storeActiveBattle(
    session: BattleRuntimeSession,
  ): Result.Result<void, McpBattleStateTransitionIssue>;
  planActiveBattleRosterTransition(
    operation: Extract<McpBattleRosterOperation, { readonly kind: "remove" }>,
  ): Result.Result<
    Extract<ActiveBattleRosterTransitionPreview, { readonly kind: "remove" }>,
    McpBattleRosterTransitionIssue
  >;
  planActiveBattleRosterTransition(
    operation: Extract<
      McpBattleRosterOperation,
      { readonly kind: "addCharacter" | "addStatBlock" }
    >,
  ): Result.Result<
    Extract<ActiveBattleRosterTransitionPreview, { readonly kind: "add" }>,
    McpBattleRosterTransitionIssue
  >;
  commitActiveBattleRosterTransition(
    plan: ActiveBattleRosterTransitionPlan,
  ): Result.Result<BattleRuntimeSession, McpBattleRosterTransitionIssue>;
  storeInitialInitiativeSetup(
    setup: InitialInitiativeSetup,
  ): Result.Result<void, McpBattleStateTransitionIssue>;
  applyInitialInitiativeSwap(input: {
    readonly sourceId: Parameters<typeof applyInitiativeSwap>[0]["sourceId"];
    readonly candidateId: Parameters<
      typeof applyInitiativeSwap
    >[0]["candidateId"];
    readonly candidateWitness: InitiativeSwapCandidateWitness;
  }): Result.Result<void, McpBattleStateTransitionIssue>;
  finalizeInitialInitiativeSetup(): Result.Result<
    BattleRuntimeSession,
    McpBattleStateTransitionIssue
  >;
  pendingBattleFills: PendingBattleFillSession | null;
  clearSelectedStatBlock(): void;
  getSelectedStatBlock(): StatBlockRecord | null;
  selectStatBlock(
    statBlockId: StatBlockId,
  ): Result.Result<StatBlockRecord, CharacterSessionIssue>;
  snapshot(): McpSessionSnapshot;
};

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
  let pendingBattleFills: PendingBattleFillSession | null = null;
  let battleState: McpBattleState = { tag: "none" };

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
      return invalidBattleRosterStateTransition(
        battleState.tag,
        "activeBattle",
      );
    }
    return battleRosterPlanner.plan(
      operation,
      battleState.session,
      pendingBattleFills,
    );
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
      if (Result.isFailure(committed)) return committed;
      battleState = committed.success;
      pendingBattleFills = null;
      return Result.succeed(undefined);
    },
    commitBattleEnd({ battleSession, characterSettlements }) {
      const committed = commitBattleEndTransition({
        currentBattleState: battleState,
        battleSession,
        characterSettlements,
        characters,
      });
      if (Result.isFailure(committed)) return committed;
      battleState = committed.success;
      pendingBattleFills = null;
      return Result.succeed(undefined);
    },
    storeActiveBattle(session) {
      if (battleState.tag === "initialInitiativeSetup") {
        return invalidBattleStateTransition(battleState.tag, "activeBattle");
      }
      if (
        battleState.tag === "activeBattle" &&
        session.state.battleId !== battleState.session.state.battleId
      ) {
        return Result.fail({
          tag: "battleStateBattleOwnershipConflict",
          expectedBattleId: battleState.session.state.battleId,
          actualBattleId: session.state.battleId,
        });
      }
      battleState = { tag: "activeBattle", session };
      return Result.succeed(undefined);
    },
    planActiveBattleRosterTransition,
    commitActiveBattleRosterTransition(plan) {
      if (battleState.tag !== "activeBattle") {
        return invalidBattleRosterStateTransition(
          battleState.tag,
          "activeBattle",
        );
      }
      const committed = battleRosterPlanner.commit(
        plan,
        battleState.session,
        pendingBattleFills,
      );
      if (Result.isFailure(committed)) return Result.fail(committed.failure);
      battleState = { tag: "activeBattle", session: committed.success };
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
      return Result.succeed(session);
    },
    get pendingBattleFills(): PendingBattleFillSession | null {
      return pendingBattleFills;
    },
    set pendingBattleFills(value: PendingBattleFillSession | null) {
      pendingBattleFills = value;
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
      return Result.succeed(statBlock.value);
    },
    snapshot(): McpSessionSnapshot {
      const characterIds = Array.from(characters.keys());
      return {
        draftIds: Array.from(drafts.keys()),
        characterIds,
        selectedStatBlockId,
        battleState: battleStateSnapshot(store.battleState),
        transientBattleFills:
          store.pendingBattleFills === null
            ? null
            : {
                subject: store.pendingBattleFills.subject,
                fills: store.pendingBattleFills.fills,
                holes: store.pendingBattleFills.holes,
              },
      };
    },
  } satisfies McpSessionStore;

  return store;
}

function invalidBattleStateTransition(
  from: McpBattleState["tag"],
  to: McpBattleState["tag"],
): Result.Result<never, McpBattleStateTransitionIssue> {
  return Result.fail({
    tag: "invalidBattleStateTransition",
    from,
    to,
  });
}

function invalidBattleRosterStateTransition(
  from: McpBattleState["tag"],
  to: McpBattleState["tag"],
): Result.Result<
  never,
  Extract<
    McpBattleRosterTransitionIssue,
    { readonly tag: "invalidBattleStateTransition" }
  >
> {
  return Result.fail({ tag: "invalidBattleStateTransition", from, to });
}
