import type {
  CharacterDraft,
  CharacterDraftId,
} from "@dnd/character-creation-runtime";
import type {
  BattleFill,
  BattleId,
  BattleRuntimeSession,
  BattleState,
  BattleSubject,
  InitialInitiativeSetup,
} from "@dnd/battle-runtime";
import { snapshotBattle } from "@dnd/battle-runtime";
import { requiredInitiativeRollModeForCombatant } from "@dnd/battle-runtime";
import {
  characterSheetCurrentHp,
  characterSheetSpellSlots,
  rebuildCharacterSheet,
  characterSheetId,
  type CharacterSheet,
  type CharacterSheetId,
  type CharacterSheetHitPoints,
  type CharacterSheetRebuildInput,
  type CharacterSheetPositiveHpUnconscious,
  type CharacterSheetZeroHpLifecycle,
  type CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
type CharacterId = CharacterSheetId;
import type {
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { Either, Match, Option } from "effect";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
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

export type BattleFillSession = {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};

export type PendingBattleFillSession = BattleFillSession & {
  readonly baseSession: BattleRuntimeSession;
};

/**
 * The Play Session owns one Battle workflow slot. Runtime setup and active
 * sessions are opaque SDK-owned values; MCP only chooses which one is stored.
 */
export type McpBattleState =
  | { readonly tag: "none" }
  | {
      readonly tag: "initialInitiativeSetup";
      readonly setup: InitialInitiativeSetup;
    }
  | {
      readonly tag: "activeBattle";
      readonly session: BattleRuntimeSession;
    };

export type McpBattleStateTransitionIssue = {
  readonly tag: "invalidBattleStateTransition";
  readonly from: McpBattleState["tag"];
  readonly to: McpBattleState["tag"];
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

/** The active-session projection retained for callers that only need it. */
export type McpBattleSessionSnapshot = Extract<
  McpBattleStateSnapshot,
  { readonly tag: "activeBattle" }
>;

export type McpSessionStore = {
  readonly drafts: Map<CharacterDraftId, CharacterDraft>;
  readonly characters: CharacterSessionRegistry;
  readonly battleState: McpBattleState;
  /** Read-only active-session projection for battle-only composition helpers. */
  readonly battleSession: BattleRuntimeSession | null;
  storeActiveBattle(
    session: BattleRuntimeSession,
  ): Either.Either<void, McpBattleStateTransitionIssue>;
  storeInitialInitiativeSetup(
    setup: InitialInitiativeSetup,
  ): Either.Either<void, McpBattleStateTransitionIssue>;
  updateInitialInitiativeSetup(
    setup: InitialInitiativeSetup,
  ): Either.Either<void, McpBattleStateTransitionIssue>;
  finalizeInitialInitiativeSetup(
    session: BattleRuntimeSession,
  ): Either.Either<void, McpBattleStateTransitionIssue>;
  clearBattle(): Either.Either<void, McpBattleStateTransitionIssue>;
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

// MCP creates deterministic character handles from draft ids because character
// creation currently has no independent naming/id fill.
export function characterIdFromDraftId(draftId: CharacterDraftId): CharacterId {
  return characterSheetId(`character:${encodeURIComponent(String(draftId))}`);
}

export function createMcpSessionStore(
  statBlockCatalog: StatBlockCatalog,
): McpSessionStore {
  const drafts = new Map<CharacterDraftId, CharacterDraft>();
  const characters = characterSessionRegistry();
  let selectedStatBlockId: StatBlockId | null = null;
  let battleState: McpBattleState = { tag: "none" };
  const store: McpSessionStore = {
    drafts,
    characters,
    get battleState() {
      return battleState;
    },
    get battleSession(): BattleRuntimeSession | null {
      return battleState.tag === "activeBattle" ? battleState.session : null;
    },
    storeActiveBattle(session) {
      if (battleState.tag === "initialInitiativeSetup") {
        return invalidBattleStateTransition(battleState.tag, "activeBattle");
      }
      battleState = { tag: "activeBattle", session };
      return Either.right(undefined);
    },
    storeInitialInitiativeSetup(setup) {
      if (battleState.tag !== "none") {
        return invalidBattleStateTransition(
          battleState.tag,
          "initialInitiativeSetup",
        );
      }
      battleState = { tag: "initialInitiativeSetup", setup };
      return Either.right(undefined);
    },
    updateInitialInitiativeSetup(setup) {
      if (battleState.tag !== "initialInitiativeSetup") {
        return invalidBattleStateTransition(
          battleState.tag,
          "initialInitiativeSetup",
        );
      }
      battleState = { tag: "initialInitiativeSetup", setup };
      return Either.right(undefined);
    },
    finalizeInitialInitiativeSetup(session) {
      if (battleState.tag !== "initialInitiativeSetup") {
        return invalidBattleStateTransition(battleState.tag, "activeBattle");
      }
      battleState = { tag: "activeBattle", session };
      return Either.right(undefined);
    },
    clearBattle() {
      if (battleState.tag !== "activeBattle") {
        return invalidBattleStateTransition(battleState.tag, "none");
      }
      battleState = { tag: "none" };
      return Either.right(undefined);
    },
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
        battleState: battleStateSnapshot(store.battleState),
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

function invalidBattleStateTransition(
  from: McpBattleState["tag"],
  to: McpBattleState["tag"],
): Either.Either<never, McpBattleStateTransitionIssue> {
  return Either.left({
    tag: "invalidBattleStateTransition",
    from,
    to,
  });
}

function characterSessionRegistry(): CharacterSessionRegistry {
  let sessions = new Map<CharacterId, CharacterSession>();
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
    setAll(nextSessions: readonly CharacterSession[]) {
      const nextIds = new Set<CharacterId>();
      for (const session of nextSessions) {
        const id = characterSessionId(session);
        if (nextIds.has(id)) {
          return Either.left({
            tag: "duplicateCharacterSession",
            characterId: id,
          } satisfies CharacterSessionRegistryIssue);
        }
        if (!sessions.has(id)) {
          return Either.left({
            tag: "unknownCharacterSession",
            characterId: id,
          } satisfies CharacterSessionRegistryIssue);
        }
        nextIds.add(id);
      }
      const next = new Map(sessions);
      for (const session of nextSessions) {
        next.set(characterSessionId(session), session);
      }
      sessions = next;
      return Either.right(undefined);
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
    tag: "activeBattle",
    battleId: state.battleId,
    currentActorId: snapshotBattle(state).currentActorId,
  };
}

function battleStateSnapshot(state: McpBattleState): McpBattleStateSnapshot {
  return Match.value(state).pipe(
    Match.when({ tag: "none" }, (matched) => matched),
    Match.when({ tag: "activeBattle" }, (matched) =>
      battleSessionSnapshot(matched.session.state),
    ),
    Match.when({ tag: "initialInitiativeSetup" }, (matched) => {
      const battle = matched.setup.state;
      const snapshot = snapshotBattle(battle);
      return {
        tag: "initialInitiativeSetup" as const,
        battleId: battle.battleId,
        combatants: snapshot.turnOrder.flatMap((combatantId) => {
          const combatant = battle.combatants.get(combatantId);
          if (combatant === undefined) return [];
          return [
            {
              combatantId,
              initiative: combatant.initiative,
              rollMode:
                requiredInitiativeRollModeForCombatant(battle, combatantId) ??
                "normal",
            },
          ];
        }),
      };
    }),
    Match.exhaustive,
  );
}
