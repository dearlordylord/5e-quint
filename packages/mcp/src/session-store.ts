import type {
  CharacterDraft,
  CharacterDraftId,
  CharacterBuild,
} from "@dnd/character-creation-runtime";
import type {
  BattleId,
  BattleFill,
  BattleState,
  BattleSubject,
  CharacterId,
} from "@dnd/battle-runtime";
import type { Hp } from "@dnd/shared/types";
import type {
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

export type AvailableCharacterSession = {
  readonly tag: "available";
  readonly build: CharacterBuild;
  readonly currentHp: Hp;
};

export type InBattleCharacterSession = {
  readonly tag: "inBattle";
  readonly build: CharacterBuild;
  readonly battleId: BattleId;
  readonly characterId: CharacterId;
};

export type CharacterSession =
  | AvailableCharacterSession
  | InBattleCharacterSession;

export type BattleFillSession = {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};

export type McpSessionSnapshot = {
  readonly draftIds: readonly CharacterDraftId[];
  readonly characterIds: readonly CharacterDraftId[];
  readonly selectedStatBlockId: StatBlockId | null;
  readonly battleState: BattleState | null;
  readonly transientBattleFills: BattleFillSession | null;
};

export type McpSessionStore = {
  readonly drafts: Map<CharacterDraftId, CharacterDraft>;
  readonly characters: Map<CharacterDraftId, CharacterSession>;
  battleState: BattleState | null;
  transientBattleFills: BattleFillSession | null;
  clearSelectedStatBlock(): void;
  getSelectedStatBlock(): StatBlockRecord | null;
  selectStatBlock(statBlockId: StatBlockId): StatBlockRecord;
  snapshot(): McpSessionSnapshot;
};

export function createMcpSessionStore(
  statBlockCatalog: StatBlockCatalog,
): McpSessionStore {
  const drafts = new Map<CharacterDraftId, CharacterDraft>();
  const characters = new Map<CharacterDraftId, CharacterSession>();
  let selectedStatBlockId: StatBlockId | null = null;
  const store: McpSessionStore = {
    drafts,
    characters,
    battleState: null,
    transientBattleFills: null,
    clearSelectedStatBlock(): void {
      selectedStatBlockId = null;
    },
    getSelectedStatBlock(): StatBlockRecord | null {
      return selectedStatBlockId === null
        ? null
        : statBlockCatalog.requireStatBlock(selectedStatBlockId);
    },
    selectStatBlock(statBlockId: StatBlockId): StatBlockRecord {
      const statBlock = statBlockCatalog.requireStatBlock(statBlockId);
      selectedStatBlockId = statBlock.id;
      return statBlock;
    },
    snapshot(): McpSessionSnapshot {
      const characterIds = Array.from(characters.keys());
      return {
        draftIds: Array.from(drafts.keys()),
        characterIds,
        selectedStatBlockId,
        battleState: store.battleState,
        transientBattleFills: store.transientBattleFills,
      };
    },
  } satisfies McpSessionStore;

  return store;
}
