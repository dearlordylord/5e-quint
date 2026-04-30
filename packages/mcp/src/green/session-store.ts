import type {
  CharacterDraft,
  CharacterDraftId,
  CharacterBuild,
} from "@dnd/character-creation-runtime";
import type {
  BattleFill,
  BattleState,
  BattleSubject,
} from "@dnd/battle-runtime";
import type {
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

export type GreenBattleFillSession = {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};

export type GreenMcpSessionSnapshot = {
  readonly draftIds: readonly CharacterDraftId[];
  readonly sheetDraftIds: readonly CharacterDraftId[];
  readonly selectedStatBlockId: StatBlockId | null;
  readonly battleState: BattleState | null;
  readonly transientBattleFills: GreenBattleFillSession | null;
};

export type GreenMcpSessionStore = {
  readonly drafts: Map<CharacterDraftId, CharacterDraft>;
  readonly sheets: Map<CharacterDraftId, CharacterBuild>;
  battleState: BattleState | null;
  transientBattleFills: GreenBattleFillSession | null;
  clearSelectedStatBlock(): void;
  getSelectedStatBlock(): StatBlockRecord | null;
  selectStatBlock(statBlockId: StatBlockId): StatBlockRecord;
  snapshot(): GreenMcpSessionSnapshot;
};

export function createGreenMcpSessionStore(
  statBlockCatalog: StatBlockCatalog,
): GreenMcpSessionStore {
  const drafts = new Map<CharacterDraftId, CharacterDraft>();
  const sheets = new Map<CharacterDraftId, CharacterBuild>();
  let selectedStatBlockId: StatBlockId | null = null;
  const store: GreenMcpSessionStore = {
    drafts,
    sheets,
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
    snapshot(): GreenMcpSessionSnapshot {
      return {
        draftIds: Array.from(drafts.keys()),
        sheetDraftIds: Array.from(sheets.keys()),
        selectedStatBlockId,
        battleState: store.battleState,
        transientBattleFills: store.transientBattleFills,
      };
    },
  } satisfies GreenMcpSessionStore;

  return store;
}
