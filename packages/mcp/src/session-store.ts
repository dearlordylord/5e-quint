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
import {
  resourceCount,
  spellSlotLevel,
  type Hp as HpType,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { Either, Option } from "effect";
import {
  characterSessionHitPoints,
  characterSessionHitPointsCurrentHp,
  characterSessionHitPointsInitialConditions,
  characterSessionHitPointsZeroHpLifecycle,
  characterSessionIssue,
  type CharacterSessionHitPoints,
  type CharacterSessionIssue,
  type CharacterSessionPositiveHpCondition,
  type CharacterSessionZeroHpLifecycleInput,
} from "./session-hit-points.ts";
export type {
  CharacterSessionHitPoints,
  CharacterSessionIssue,
  CharacterSessionPositiveHpCondition,
  CharacterSessionZeroHpLifecycle,
  CharacterSessionZeroHpLifecycleInput,
} from "./session-hit-points.ts";

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
      readonly hitPoints: CharacterSessionHitPoints;
      readonly spellSlotExpenditures: readonly CharacterSpellSlotExpenditure[];
    }
  | {
      readonly tag: "available";
      readonly characterId: CharacterId;
      readonly build: NonSpellcastingCharacterBuild;
      readonly hitPoints: CharacterSessionHitPoints;
      readonly spellSlots?: never;
    };

export type CharacterSpellSlotExpenditure = {
  readonly spellLevel: SpellSlotLevel;
  readonly expended: ResourceCount;
};

export type AvailableCharacterSessionInput = {
  readonly characterId: CharacterId;
  readonly build: CharacterBuild;
  readonly currentHp: HpType;
  readonly positiveHpCondition?: CharacterSessionPositiveHpCondition;
  readonly zeroHpLifecycle?: CharacterSessionZeroHpLifecycleInput;
  readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
};

export function availableCharacterSession(
  input: AvailableCharacterSessionInput,
): Either.Either<AvailableCharacterSession, CharacterSessionIssue> {
  if (isNonSpellcastingBuild(input.build)) {
    if (input.spellSlots !== undefined) {
      return characterSessionIssue(
        "Non-spellcasting character session cannot carry Spell Slot state.",
      );
    }
    const hitPoints = characterSessionHitPoints(input);
    if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
    return Either.right({
      tag: "available",
      characterId: input.characterId,
      build: input.build,
      hitPoints: hitPoints.right,
    });
  }

  if (!isSpellcastingBuild(input.build)) {
    return characterSessionIssue(
      "Character build spellcasting state is inconsistent.",
    );
  }
  const build = input.build;
  const hitPoints = characterSessionHitPoints(input);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const spellSlotExpenditures = spellSlotExpendituresFromInput({
    characterId: input.characterId,
    build,
    currentHp: input.currentHp,
    spellSlots: input.spellSlots,
  });
  if (Either.isLeft(spellSlotExpenditures)) {
    return Either.left(spellSlotExpenditures.left);
  }

  return Either.right({
    tag: "available",
    characterId: input.characterId,
    build,
    hitPoints: hitPoints.right,
    spellSlotExpenditures: spellSlotExpenditures.right,
  });
}

export function characterSessionCurrentHp(
  session: AvailableCharacterSession,
): HpType {
  return characterSessionHitPointsCurrentHp(session.hitPoints);
}

export function characterBattleZeroHpLifecycle(
  session: AvailableCharacterSession,
): ReturnType<typeof characterSessionHitPointsZeroHpLifecycle> {
  return characterSessionHitPointsZeroHpLifecycle(session.hitPoints);
}

export function characterBattleInitialConditions(
  session: AvailableCharacterSession,
): ReturnType<typeof characterSessionHitPointsInitialConditions> {
  return characterSessionHitPointsInitialConditions(session.hitPoints);
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
    if (expenditure === undefined) return undefined as never;
    return {
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
      expended: expenditure.expended,
    };
  });
}

function spellSlotExpendituresFromInput(
  input: AvailableCharacterSessionInput & {
    readonly build: SpellcastingCharacterBuild;
  },
): Either.Either<
  readonly CharacterSpellSlotExpenditure[],
  CharacterSessionIssue
> {
  const runtimeSlots =
    input.spellSlots ??
    input.build.spellcasting.spellSlots.map((slot) => ({
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
      expended: resourceCount(0),
    }));
  if (runtimeSlots.length !== input.build.spellcasting.spellSlots.length) {
    return characterSessionIssue(
      "Spell Slot state must match build capacity exactly.",
    );
  }
  const runtimeLevels = new Set<number>();
  for (const runtimeSlot of runtimeSlots) {
    if (runtimeLevels.has(runtimeSlot.spellLevel)) {
      return characterSessionIssue(
        "Spell Slot state must not duplicate spell levels.",
      );
    }
    runtimeLevels.add(runtimeSlot.spellLevel);
  }
  const expenditures = [];
  for (const buildSlot of input.build.spellcasting.spellSlots) {
    const runtimeSlot = runtimeSlots.find(
      (candidate) =>
        candidate.spellLevel === spellSlotLevel(buildSlot.spellLevel),
    );
    if (
      runtimeSlot === undefined ||
      runtimeSlot.count !== resourceCount(buildSlot.count) ||
      !Number.isInteger(runtimeSlot.expended) ||
      runtimeSlot.expended < 0 ||
      runtimeSlot.expended > buildSlot.count
    ) {
      return characterSessionIssue(
        `Spell Slot state does not match build capacity for level ${buildSlot.spellLevel}.`,
      );
    }
    expenditures.push({
      spellLevel: spellSlotLevel(buildSlot.spellLevel),
      expended: resourceCount(runtimeSlot.expended),
    });
  }
  return Either.right(expenditures);
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
  selectStatBlock(
    statBlockId: StatBlockId,
  ): Either.Either<StatBlockRecord, CharacterSessionIssue>;
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
