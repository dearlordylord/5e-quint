import type { CharacterDraftId } from "@dnd/character-creation-runtime";
import type {
  BattleId,
  BattlePendingTransactionView,
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
import type { Either } from "effect";

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
  ): Either.Either<void, CharacterSessionRegistryIssue>;
  entries(): IterableIterator<readonly [CharacterId, CharacterSession]>;
  keys(): IterableIterator<CharacterId>;
};

/** Wire/session projection of the shared transaction's current layer. */
export type BattleFillSession = BattlePendingTransactionView;

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
  readonly transientBattleFills: BattleFillSession | null;
};
export type McpBattleSessionSnapshot = Extract<
  McpBattleStateSnapshot,
  { readonly tag: "activeBattle" }
>;
