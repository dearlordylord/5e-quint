import type {
  CharacterDraft,
  CharacterDraftId,
} from "@dnd/character-creation-runtime";
import type {
  BattleId,
  BattlePendingTransaction,
  BattleRuntimeTransactionResult,
  InitiativeSwapCandidateWitness,
  applyInitiativeSwap,
  BattleRuntimeSession,
  InitialInitiativeSetup,
  snapshotBattle,
} from "@dnd/battle-runtime";
import type {
  CharacterSheet,
  CharacterSheetId,
  CharacterSheetHitPoints,
  CharacterSheetPositiveHpUnconscious,
  CharacterSheetRebuildInput,
  CharacterSheetZeroHpLifecycle,
  CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
import type { StatBlockId } from "@dnd/surface/surface/stat-block-catalog";
import type { Result } from "effect";
import type { SrdStatBlockRecord } from "@dnd/surface/surface/types";
import type { BattleActionSelectionId } from "./battle-action-selection-id.ts";
import type {
  McpPendingBattleSelection,
  McpBattleActionCancellationIssue,
} from "./battle-action-selection-store.ts";
import type {
  ActiveBattleRosterTransitionPlan,
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterOperation,
  McpBattleRosterTransitionIssue,
} from "./battle-roster-session-types.ts";
import type { BattleCharacterSessionSettlement } from "./battle-handoff.ts";

type CharacterId = CharacterSheetId;

export type AvailableCharacterSession = CharacterSheet;
export type AvailableCharacterSessionInput = CharacterSheetRebuildInput;
export type CharacterSessionIssue = {
  readonly tag: "characterSessionIssue";
  readonly message: string;
};
export type CharacterSessionHitPoints = CharacterSheetHitPoints;
export type CharacterSessionPositiveHpUnconscious =
  CharacterSheetPositiveHpUnconscious;
export type CharacterSessionZeroHpLifecycle = CharacterSheetZeroHpLifecycle;
export type CharacterSessionZeroHpLifecycleInput =
  CharacterSheetZeroHpLifecycleInput;

export type InBattleCharacterSession = {
  readonly tag: "inBattle";
  readonly sheet: AvailableCharacterSession;
  readonly battleId: BattleId;
};
export type CharacterSession =
  | AvailableCharacterSession
  | InBattleCharacterSession;

export type CharacterSessionRegistryIssue =
  | {
      readonly tag: "duplicateCharacterSession";
      readonly characterId: CharacterId;
    }
  | {
      readonly tag: "unknownCharacterSession";
      readonly characterId: CharacterId;
    };

export type CharacterSessionRegistry = {
  readonly size: number;
  get(characterId: CharacterId): CharacterSession | undefined;
  has(characterId: CharacterId): boolean;
  set(session: CharacterSession): void;
  setAll(
    sessions: readonly CharacterSession[],
  ): Result.Result<void, CharacterSessionRegistryIssue>;
  entries(): IterableIterator<readonly [CharacterId, CharacterSession]>;
  keys(): IterableIterator<CharacterId>;
};

export type McpBattleTransactionStorageIssue = {
  readonly tag: "battleStatePendingTransactionInvalid";
  readonly battleId: BattleId;
  readonly reason: "foreignTransaction" | "transactionSessionMismatch";
};

export type McpBattleState =
  | { readonly tag: "none" }
  | {
      readonly tag: "initialInitiativeSetup";
      readonly setup: InitialInitiativeSetup;
    }
  | { readonly tag: "activeBattle"; readonly session: BattleRuntimeSession };

export type McpBattleStateTransitionIssue =
  | McpBattleTransactionStorageIssue
  | {
      readonly tag: "invalidBattleStateTransition";
      readonly from: McpBattleState["tag"];
      readonly to: McpBattleState["tag"];
    }
  | { readonly tag: "initialInitiativeSwapRejected"; readonly message: string }
  | {
      readonly tag: "battleStateBattleOwnershipConflict";
      readonly expectedBattleId: BattleId;
      readonly actualBattleId: BattleId;
    }
  | {
      readonly tag: "battleStateCharacterSessionRegistryConflict";
      readonly registryIssue: CharacterSessionRegistryIssue;
      readonly affectedCharacterIds: readonly CharacterId[];
    }
  | {
      readonly tag: "battleStateCharacterSessionChanged";
      readonly affectedCharacterIds: readonly CharacterId[];
    }
  | { readonly tag: "battleStateSessionChanged"; readonly battleId: BattleId }
  | {
      readonly tag: "battleStateCharacterSettlementMismatch";
      readonly expectedCharacterId: CharacterId;
      readonly nextCharacterId: CharacterId;
    }
  | {
      readonly tag: "battleStateCharacterRosterMismatch";
      readonly battleCharacterIds: readonly CharacterId[];
      readonly transitionCharacterIds: readonly CharacterId[];
    };

export type McpBattleStateSnapshot =
  | { readonly tag: "none" }
  | {
      readonly tag: "initialInitiativeSetup";
      readonly battleId: BattleId;
      readonly combatants: readonly McpInitialInitiativeCombatantSnapshot[];
    }
  | {
      readonly tag: "activeBattle";
      readonly battleId: BattleId;
      readonly currentActorId: ReturnType<
        typeof snapshotBattle
      >["currentActorId"];
    };
export type McpInitialInitiativeCombatantSnapshot = {
  readonly combatantId: ReturnType<typeof snapshotBattle>["turnOrder"][number];
  readonly initiative: number;
  readonly rollMode: "normal" | "advantage" | "disadvantage";
};
export type McpSessionSnapshot = {
  readonly draftIds: readonly CharacterDraftId[];
  readonly characterIds: readonly CharacterId[];
  readonly selectedStatBlockId: StatBlockId | null;
  readonly battleState: McpBattleStateSnapshot;
};
export type McpBattleSessionSnapshot = Extract<
  McpBattleStateSnapshot,
  { readonly tag: "activeBattle" }
>;

export type McpSessionStore = {
  readonly nextBattleActionSelectionId: BattleActionSelectionId;
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
  cancelPendingBattleAction(
    expectedSession: BattleRuntimeSession,
    expectedTransaction: BattlePendingTransaction | null,
    expectedSelectionId: BattleActionSelectionId,
  ): Result.Result<void, McpBattleActionCancellationIssue>;
  storeBattleTransactionResult(
    expectedSession: BattleRuntimeSession,
    result: BattleRuntimeTransactionResult,
  ): Result.Result<
    void,
    McpBattleStateTransitionIssue | McpBattleTransactionStorageIssue
  >;
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
  getPendingBattleTransaction(): BattlePendingTransaction | null;
  getPendingBattleSelection(): McpPendingBattleSelection | null;
  clearSelectedStatBlock(): void;
  getSelectedStatBlock(): SrdStatBlockRecord | null;
  selectStatBlock(
    statBlockId: StatBlockId,
  ): Result.Result<SrdStatBlockRecord, CharacterSessionIssue>;
  snapshot(): McpSessionSnapshot;
};
