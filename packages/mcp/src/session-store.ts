import type {
  CharacterDraft,
  CharacterDraftId,
} from "@dnd/character-creation-runtime";
import type {
  BattleFill,
  BattleId,
  BattleState,
  BattleSubject,
  CharacterId,
} from "@dnd/battle-runtime";
import { characterId, snapshotBattle } from "@dnd/battle-runtime";
import {
  characterSheetCurrentHp,
  characterSheetSpellSlots,
  createFreshCharacterSheet,
  type CharacterSheet,
  type CharacterSheetHitPoints,
  type CharacterSheetInput,
  type CharacterSheetPositiveHpUnconscious,
  type CharacterSheetZeroHpLifecycle,
  type CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
import type { CharacterSheetCompanionBattleAdmissionState } from "@dnd/character-battle-runtime";
import type {
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
export type AvailableCharacterSession = CharacterSheet;
export type AvailableCharacterSessionInput = CharacterSheetInput;
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
  readonly companionAdmission: CharacterSheetCompanionBattleAdmissionState;
};

export type CharacterSession =
  | AvailableCharacterSession
  | InBattleCharacterSession;

export type CharacterSessionRegistry = {
  readonly size: number;
  get(characterId: CharacterId): CharacterSession | undefined;
  has(characterId: CharacterId): boolean;
  set(session: CharacterSession): void;
  entries(): IterableIterator<readonly [CharacterId, CharacterSession]>;
  keys(): IterableIterator<CharacterId>;
};

export type BattleFillSession = {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};

export type PendingBattleFillSession = BattleFillSession & {
  readonly baseState: BattleState;
};

export type McpSessionSnapshot = {
  readonly draftIds: readonly CharacterDraftId[];
  readonly characterIds: readonly CharacterId[];
  readonly selectedStatBlockId: StatBlockId | null;
  readonly activeBattle: McpBattleSessionSnapshot | null;
  readonly transientBattleFills: BattleFillSession | null;
};

export type McpBattleSessionSnapshot = {
  readonly battleId: BattleId;
  readonly currentActorId: ReturnType<typeof snapshotBattle>["currentActorId"];
};

export type McpSessionStore = {
  readonly drafts: Map<CharacterDraftId, CharacterDraft>;
  readonly characters: CharacterSessionRegistry;
  battleState: BattleState | null;
  pendingBattleFills: PendingBattleFillSession | null;
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
  const sheet = createFreshCharacterSheet(input);
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

// MCP creates deterministic character handles from draft ids because character
// creation currently has no independent naming/id fill.
export function characterIdFromDraftId(draftId: CharacterDraftId): CharacterId {
  return characterId(`character:${encodeURIComponent(String(draftId))}`);
}

export function createMcpSessionStore(
  statBlockCatalog: StatBlockCatalog,
): McpSessionStore {
  const drafts = new Map<CharacterDraftId, CharacterDraft>();
  const characters = characterSessionRegistry();
  let selectedStatBlockId: StatBlockId | null = null;
  const store: McpSessionStore = {
    drafts,
    characters,
    battleState: null,
    pendingBattleFills: null,
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
        activeBattle:
          store.battleState === null
            ? null
            : battleSessionSnapshot(store.battleState),
        transientBattleFills:
          store.pendingBattleFills === null
            ? null
            : {
                subject: store.pendingBattleFills.subject,
                fills: store.pendingBattleFills.fills,
              },
      };
    },
  } satisfies McpSessionStore;

  return store;
}

function characterSessionRegistry(): CharacterSessionRegistry {
  const sessions = new Map<CharacterId, CharacterSession>();
  return {
    get size() {
      return sessions.size;
    },
    get(characterId: CharacterId): CharacterSession | undefined {
      return sessions.get(characterId);
    },
    has(characterId: CharacterId): boolean {
      return sessions.has(characterId);
    },
    set(session: CharacterSession): void {
      sessions.set(characterSessionId(session), session);
    },
    entries(): IterableIterator<readonly [CharacterId, CharacterSession]> {
      return sessions.entries();
    },
    keys(): IterableIterator<CharacterId> {
      return sessions.keys();
    },
  };
}

function characterSessionId(session: CharacterSession): CharacterId {
  return session.tag === "inBattle"
    ? session.sheet.characterId
    : session.characterId;
}

function battleSessionSnapshot(state: BattleState): McpBattleSessionSnapshot {
  return {
    battleId: state.battleId,
    currentActorId: snapshotBattle(state).currentActorId,
  };
}
