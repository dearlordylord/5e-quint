// KERNEL-COVERAGE: parity-witness CHARACTER.LIFECYCLE.LAYER_PROJECTION
import * as path from "node:path";

import { characterId, type BattleState } from "@dnd/battle-runtime";
import {
  discoverCreationHoles,
  finalizeCharacterDraft,
  type CharacterBuild,
  type CharacterDraft,
} from "@dnd/character-creation-runtime";
import {
  characterSheetCurrentHp,
  characterSheetHitPointMaximum,
  type CharacterSheet,
} from "@dnd/character-sheet-runtime";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  battleStateWithCombatant,
  createFighterLifecycleDraft,
  createFighterLifecycleSheet,
  fighterLifecycleBuildMaximumHp,
  fighterLifecycleCharacterCombatantId,
  fighterLifecycleSettledHp,
  fighterLifecycleSheetMaximumHp,
  fighterLifecycleUnitLibrary,
  finalizeFighterLifecycleDraft,
  requireFighterCharacterCombatant,
  requireRight,
  resolveFighterLifecycleSkeletonShortswordAttack,
  startFighterLifecycleBattle,
  type FighterCharacterBattleCombatant,
} from "./fighter-character-lifecycle-test-support.ts";
import {
  settleCharacterSheetFromBattle,
} from "./index.ts";

const characterLifecycleLayers = [
  "Draft",
  "Build",
  "Sheet",
  "BattleInitProjection",
  "BattleRuntime",
  "Settlement",
] as const;
type CharacterLifecycleLayer = (typeof characterLifecycleLayers)[number];
const lifecycleReplayStepCount = characterLifecycleLayers.length - 1;

type CharacterLifecycleProjection = {
  readonly layer: CharacterLifecycleLayer;
  readonly draftHasOpenHoles: boolean;
  readonly openDraftFinalizationRejected: boolean;
  readonly buildFinalized: boolean;
  readonly sheetOwnsHitPoints: boolean;
  readonly sheetCurrentHp: number;
  readonly sheetMaxHp: number;
  readonly battleInitCharacterCombatant: boolean;
  readonly battleRuntimeCharacterHp: number;
  readonly battleRuntimeHpChanged: boolean;
  readonly settlementCurrentHp: number;
  readonly settlementPersistedBattleHp: boolean;
  readonly buildIdentityUnchanged: boolean;
  readonly wrongCharacterSettlementRejected: boolean;
  readonly replayIndex: number;
};

type LifecycleSession = {
  readonly draft?: CharacterDraft;
  readonly build?: CharacterBuild;
  readonly buildSignature?: string;
  readonly sheet?: CharacterSheet;
  readonly battleState?: BattleState;
  readonly characterCombatant?: FighterCharacterBattleCombatant;
  readonly battleRuntimeCharacterHp?: number;
};

const lifecycleDriverSchema = {
  init: {},
  doFinalizeDraftToBuild: {},
  doCreateSheetFromBuild: {},
  doProjectSheetToBattleInit: {},
  doResolveSkeletonShortswordAttack: {},
  doSettleBattleToSheet: {},
  step: {},
} as const;

const lifecycleStateCheck = stateCheck(
  normalizeLifecycleQuintState,
  compareLifecycleState,
);

describe("Character layer projection lifecycle deterministic QNT replay", () => {
  it("replays Draft to Build to Sheet to battle runtime to settlement", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-layer-projection-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLifecycleDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: lifecycleReplayStepCount,
      stateCheck: lifecycleStateCheck,
    });
  }, 120_000);
});

function createLifecycleDriver() {
  return defineDriver(lifecycleDriverSchema, () => {
    let session: LifecycleSession = {};
    let projection = initialProjection();

    function reset(): void {
      const draft = createFighterLifecycleDraft();
      const holes = discoverCreationHoles({
        draft,
        unitLibrary: fighterLifecycleUnitLibrary,
      });
      const openDraftFinalization = finalizeCharacterDraft({
        draft,
        unitLibrary: fighterLifecycleUnitLibrary,
      });
      session = { draft };
      projection = {
        ...initialProjection(),
        draftHasOpenHoles: holes.length > 0,
        openDraftFinalizationRejected:
          openDraftFinalization.tag === "incomplete",
      };
    }

    return {
      init: reset,
      doFinalizeDraftToBuild: () => {
        runLifecycleAction("finalize Draft to Build", () => {
          const build = finalizeFighterLifecycleDraft(
            requireSessionDraft(session),
          );
          session = {
            ...session,
            build,
            buildSignature: JSON.stringify(build),
          };
          projection = {
            ...initialProjection(),
            layer: "Build",
            buildFinalized: true,
            replayIndex: 1,
          };
        });
      },
      doCreateSheetFromBuild: () => {
        runLifecycleAction("create Sheet from Build", () => {
          const build = requireSessionBuild(session);
          const maximumHp = fighterLifecycleBuildMaximumHp(build);
          if (maximumHp !== fighterLifecycleSheetMaximumHp) {
            throw new Error("Expected lifecycle Fighter build to have 12 HP.");
          }
          const sheet = createFighterLifecycleSheet(build);
          session = { ...session, sheet };
          projection = {
            ...initialProjection(),
            layer: "Sheet",
            buildFinalized: true,
            sheetOwnsHitPoints: true,
            sheetCurrentHp: Number(characterSheetCurrentHp(sheet)),
            sheetMaxHp: Number(
              requireRight(
                characterSheetHitPointMaximum({
                  sheet,
                  unitLibrary: fighterLifecycleUnitLibrary,
                }),
              ),
            ),
            replayIndex: 2,
          };
        });
      },
      doProjectSheetToBattleInit: () => {
        runLifecycleAction("project Sheet to battle init", () => {
          const battle = startFighterLifecycleBattle(
            requireSessionSheet(session),
          );
          session = {
            ...session,
            battleState: battle.state,
            characterCombatant: battle.combatant,
          };
          projection = {
            ...projection,
            layer: "BattleInitProjection",
            battleInitCharacterCombatant: true,
            replayIndex: 3,
          };
        });
      },
      doResolveSkeletonShortswordAttack: () => {
        runLifecycleAction("resolve Skeleton Shortsword attack", () => {
          const battleState = resolveFighterLifecycleSkeletonShortswordAttack(
            requireSessionBattleState(session),
          );
          const combatant = requireFighterCharacterCombatant(
            battleState.combatants.get(fighterLifecycleCharacterCombatantId),
          );
          const battleRuntimeCharacterHp = Number(combatant.hp);
          if (battleRuntimeCharacterHp !== fighterLifecycleSettledHp) {
            throw new Error("Expected Skeleton Shortsword to leave 8 HP.");
          }
          session = {
            ...session,
            battleState,
            characterCombatant: combatant,
            battleRuntimeCharacterHp,
          };
          projection = {
            ...projection,
            layer: "BattleRuntime",
            battleRuntimeCharacterHp,
            battleRuntimeHpChanged:
              battleRuntimeCharacterHp !== projection.sheetCurrentHp,
            replayIndex: 4,
          };
        });
      },
      doSettleBattleToSheet: () => {
        runLifecycleAction("settle Battle back to Sheet", () => {
          const sheet = requireSessionSheet(session);
          const combatant = requireSessionCombatant(session);
          const settled = requireRight(
            settleCharacterSheetFromBattle({
              sheet,
              state: requireSessionBattleState(session),
              combatant,
              unitLibrary: fighterLifecycleUnitLibrary,
            }),
          );
          session = { ...session, sheet: settled };
          const settlementCurrentHp = Number(characterSheetCurrentHp(settled));
          if (settlementCurrentHp !== fighterLifecycleSettledHp) {
            throw new Error("Expected settlement to persist 8 HP.");
          }
          const wrongCharacterCombatant: FighterCharacterBattleCombatant = {
            ...combatant,
            origin: {
              ...combatant.origin,
              characterId: characterId("character:fighter-lifecycle-other"),
            },
          };
          const wrongCharacterSettlement = settleCharacterSheetFromBattle({
            sheet,
            state: battleStateWithCombatant(
              requireSessionBattleState(session),
              wrongCharacterCombatant,
            ),
            combatant: wrongCharacterCombatant,
            unitLibrary: fighterLifecycleUnitLibrary,
          });
          projection = {
            ...projection,
            layer: "Settlement",
            settlementCurrentHp,
            settlementPersistedBattleHp:
              settlementCurrentHp === session.battleRuntimeCharacterHp,
            buildIdentityUnchanged:
              JSON.stringify(settled.build) ===
              requireSessionBuildSignature(session),
            wrongCharacterSettlementRejected:
              Either.isLeft(wrongCharacterSettlement),
            replayIndex: 5,
          };
        });
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function runLifecycleAction(label: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${label}: ${error.message}`);
    }
    throw new Error(`${label}: ${JSON.stringify(error)}`);
  }
}

function initialProjection(): CharacterLifecycleProjection {
  return {
    layer: "Draft",
    draftHasOpenHoles: false,
    openDraftFinalizationRejected: false,
    buildFinalized: false,
    sheetOwnsHitPoints: false,
    sheetCurrentHp: 0,
    sheetMaxHp: 0,
    battleInitCharacterCombatant: false,
    battleRuntimeCharacterHp: 0,
    battleRuntimeHpChanged: false,
    settlementCurrentHp: 0,
    settlementPersistedBattleHp: false,
    buildIdentityUnchanged: false,
    wrongCharacterSettlementRejected: false,
    replayIndex: 0,
  };
}

function requireSessionDraft(session: LifecycleSession): CharacterDraft {
  if (session.draft === undefined) {
    throw new Error("Expected lifecycle draft.");
  }
  return session.draft;
}

function requireSessionBuild(session: LifecycleSession): CharacterBuild {
  if (session.build === undefined) {
    throw new Error("Expected lifecycle build.");
  }
  return session.build;
}

function requireSessionBuildSignature(session: LifecycleSession): string {
  if (session.buildSignature === undefined) {
    throw new Error("Expected lifecycle build signature.");
  }
  return session.buildSignature;
}

function requireSessionSheet(session: LifecycleSession): CharacterSheet {
  if (session.sheet === undefined) {
    throw new Error("Expected lifecycle sheet.");
  }
  return session.sheet;
}

function requireSessionBattleState(session: LifecycleSession): BattleState {
  if (session.battleState === undefined) {
    throw new Error("Expected lifecycle battle state.");
  }
  return session.battleState;
}

function requireSessionCombatant(
  session: LifecycleSession,
): FighterCharacterBattleCombatant {
  if (session.characterCombatant === undefined) {
    throw new Error("Expected lifecycle character combatant.");
  }
  return session.characterCombatant;
}

function normalizeLifecycleQuintState(
  raw: unknown,
): CharacterLifecycleProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint lifecycle projection state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    layer: lifecycleLayerField(state["qLayer"]),
    draftHasOpenHoles: booleanField(
      state["qDraftHasOpenHoles"],
      "qDraftHasOpenHoles",
    ),
    openDraftFinalizationRejected: booleanField(
      state["qOpenDraftFinalizationRejected"],
      "qOpenDraftFinalizationRejected",
    ),
    buildFinalized: booleanField(state["qBuildFinalized"], "qBuildFinalized"),
    sheetOwnsHitPoints: booleanField(
      state["qSheetOwnsHitPoints"],
      "qSheetOwnsHitPoints",
    ),
    sheetCurrentHp: numberFromQuintInt(
      state["qSheetCurrentHp"],
      "qSheetCurrentHp",
    ),
    sheetMaxHp: numberFromQuintInt(state["qSheetMaxHp"], "qSheetMaxHp"),
    battleInitCharacterCombatant: booleanField(
      state["qBattleInitCharacterCombatant"],
      "qBattleInitCharacterCombatant",
    ),
    battleRuntimeCharacterHp: numberFromQuintInt(
      state["qBattleRuntimeCharacterHp"],
      "qBattleRuntimeCharacterHp",
    ),
    battleRuntimeHpChanged: booleanField(
      state["qBattleRuntimeHpChanged"],
      "qBattleRuntimeHpChanged",
    ),
    settlementCurrentHp: numberFromQuintInt(
      state["qSettlementCurrentHp"],
      "qSettlementCurrentHp",
    ),
    settlementPersistedBattleHp: booleanField(
      state["qSettlementPersistedBattleHp"],
      "qSettlementPersistedBattleHp",
    ),
    buildIdentityUnchanged: booleanField(
      state["qBuildIdentityUnchanged"],
      "qBuildIdentityUnchanged",
    ),
    wrongCharacterSettlementRejected: booleanField(
      state["qWrongCharacterSettlementRejected"],
      "qWrongCharacterSettlementRejected",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareLifecycleState(
  runtime: CharacterLifecycleProjection,
  quint: CharacterLifecycleProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function lifecycleLayerField(raw: unknown): CharacterLifecycleLayer {
  if (typeof raw === "string" && isLifecycleLayer(raw)) {
    return raw;
  }
  if (
    raw != null &&
    typeof raw === "object" &&
    "tag" in raw &&
    typeof raw.tag === "string" &&
    isLifecycleLayer(raw.tag)
  ) {
    return raw.tag;
  }
  throw new Error(`Unknown lifecycle layer ${String(raw)}.`);
}

function isLifecycleLayer(raw: string): raw is CharacterLifecycleLayer {
  return characterLifecycleLayers.some((layer) => layer === raw);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint boolean field ${field}.`);
}
