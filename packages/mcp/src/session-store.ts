import type {
  CharacterDraft,
  CharacterDraftId,
  CharacterBuild,
} from "@dnd/character-creation-runtime";
import type {
  BattleId,
  BattleFill,
  CharacterBattleSpellSlotState,
  BattleState,
  BattleSubject,
  CharacterId,
} from "@dnd/battle-runtime";
import { snapshotBattle } from "@dnd/battle-runtime";
import type { Hp } from "@dnd/shared/types";
import type {
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

type SpellcastingCharacterBuild = CharacterBuild & {
  readonly spellcasting: NonNullable<CharacterBuild["spellcasting"]>;
};

type NonSpellcastingCharacterBuild = CharacterBuild & {
  readonly spellcasting?: undefined;
};

export type AvailableCharacterSession =
  | {
      readonly tag: "available";
      readonly characterId: CharacterId;
      readonly build: SpellcastingCharacterBuild;
      readonly currentHp: Hp;
      readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
    }
  | {
      readonly tag: "available";
      readonly characterId: CharacterId;
      readonly build: NonSpellcastingCharacterBuild;
      readonly currentHp: Hp;
      readonly spellSlots?: never;
    };

export type CharacterSpellSlotExpenditure = {
  readonly spellLevel: NonNullable<
    CharacterBuild["spellcasting"]
  >["spellSlots"][number]["spellLevel"];
  readonly expended: number;
};

export type AvailableCharacterSessionInput = {
  readonly characterId: CharacterId;
  readonly build: CharacterBuild;
  readonly currentHp: Hp;
  readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
};

export function availableCharacterSession(
  input: AvailableCharacterSessionInput,
): AvailableCharacterSession {
  if (isNonSpellcastingBuild(input.build)) {
    if (input.spellSlots !== undefined) {
      throw new Error(
        "Non-spellcasting character session cannot carry Spell Slot state.",
      );
    }
    return {
      tag: "available",
      characterId: input.characterId,
      build: input.build,
      currentHp: input.currentHp,
    };
  }

  if (!isSpellcastingBuild(input.build)) {
    throw new Error("Character build spellcasting state is inconsistent.");
  }
  const build = input.build;

  return {
    tag: "available",
    characterId: input.characterId,
    build,
    currentHp: input.currentHp,
    spellSlotExpenditures: spellSlotExpendituresFromInput({
      characterId: input.characterId,
      build,
      currentHp: input.currentHp,
      spellSlots: input.spellSlots,
    }),
  };
}

export function characterBattleSpellSlots(
  session: AvailableCharacterSession,
): readonly CharacterBattleSpellSlotState[] | undefined {
  if (!("spellSlotExpenditures" in session)) return undefined;
  return session.build.spellcasting.spellSlots.map((slot) => {
    const expenditure = session.spellSlotExpenditures.find(
      (candidate: CharacterSpellSlotExpenditure) =>
        candidate.spellLevel === slot.spellLevel,
    );
    if (expenditure === undefined) {
      throw new Error(
        `Missing Spell Slot expenditure for level ${slot.spellLevel}.`,
      );
    }
    return { ...slot, expended: expenditure.expended };
  });
}

function spellSlotExpendituresFromInput(
  input: AvailableCharacterSessionInput & {
    readonly build: SpellcastingCharacterBuild;
  },
): readonly CharacterSpellSlotExpenditure[] {
  const runtimeSlots =
    input.spellSlots ??
    input.build.spellcasting.spellSlots.map((slot) => ({
      ...slot,
      expended: 0,
    }));
  if (runtimeSlots.length !== input.build.spellcasting.spellSlots.length) {
    throw new Error("Spell Slot state must match build capacity exactly.");
  }
  const runtimeLevels = new Set<number>();
  for (const runtimeSlot of runtimeSlots) {
    if (runtimeLevels.has(runtimeSlot.spellLevel)) {
      throw new Error("Spell Slot state must not duplicate spell levels.");
    }
    runtimeLevels.add(runtimeSlot.spellLevel);
  }
  return input.build.spellcasting.spellSlots.map((buildSlot) => {
    const runtimeSlot = runtimeSlots.find(
      (candidate) => candidate.spellLevel === buildSlot.spellLevel,
    );
    if (
      runtimeSlot === undefined ||
      runtimeSlot.count !== buildSlot.count ||
      !Number.isInteger(runtimeSlot.expended) ||
      runtimeSlot.expended < 0 ||
      runtimeSlot.expended > buildSlot.count
    ) {
      throw new Error(
        `Spell Slot state does not match build capacity for level ${buildSlot.spellLevel}.`,
      );
    }
    return {
      spellLevel: buildSlot.spellLevel,
      expended: runtimeSlot.expended,
    };
  });
}

function isSpellcastingBuild(
  build: CharacterBuild,
): build is SpellcastingCharacterBuild {
  return build.spellcasting !== undefined;
}

function isNonSpellcastingBuild(
  build: CharacterBuild,
): build is NonSpellcastingCharacterBuild {
  return build.spellcasting === undefined;
}

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
  readonly sourceDraftIds: readonly CharacterDraftId[];
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
      const sourceDraftIds = Array.from(characters.keys());
      return {
        draftIds: Array.from(drafts.keys()),
        sourceDraftIds,
        selectedStatBlockId,
        activeBattle:
          store.battleState === null
            ? null
            : battleSessionSnapshot(store.battleState),
        transientBattleFills: store.transientBattleFills,
      };
    },
  } satisfies McpSessionStore;

  return store;
}

function battleSessionSnapshot(state: BattleState): McpBattleSessionSnapshot {
  return {
    battleId: state.battleId,
    currentActorId: snapshotBattle(state).currentActorId,
  };
}
