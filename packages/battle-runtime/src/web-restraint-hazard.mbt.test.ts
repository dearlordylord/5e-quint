// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-web-restraint-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE
import * as path from "node:path";

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet } from "@dnd/shared/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import {
  abilityCheckFill,
  movementFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  webAreaFill,
  webAreaRemovedAct,
  webRestrainedNoLongerInAreaAct,
  webRestraintSaveAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  spellCasterId,
  spellTargetId,
  webAreaId,
  webUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import type { WebRestraintHazardEffect } from "./battle-reducer/turn-end-movement.ts";

const webMovementSpentFeet = 15;

type WebTurnRole = "caster" | "target";
type WebHole = "EntrySavingThrowOutcome" | "StartTurnSavingThrowOutcome";
type WebLastResult =
  | "init"
  | "needsHoles"
  | "resolved"
  | "restrained"
  | "saved"
  | "escapeFailed"
  | "escaped"
  | "leftArea"
  | "moved"
  | "removed";

type WebRestraintHazardState = {
  readonly currentTurnRole: WebTurnRole;
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly hazardActive: boolean;
  readonly casterConcentrating: boolean;
  readonly targetRestrained: boolean;
  readonly entrySavedThisTurn: boolean;
  readonly startTurnSavedThisTurn: boolean;
  readonly movementSpentFeet: number;
  readonly holes: readonly WebHole[];
  readonly lastResult: WebLastResult;
};

type WebRuntimeState = {
  readonly battle: BattleState;
  readonly currentTurnRole: WebTurnRole;
  readonly holes: readonly BattleHole[];
  readonly lastResult: WebLastResult;
};

const driverSchema = {
  init: {},
  doCastWeb: {},
  doEndCasterTurn: {},
  doDiscoverEntrySave: {},
  doDiscoverStartTurnSave: {},
  doFillEntrySaveFailure: {},
  doFillEntrySaveSuccess: {},
  doFillStartTurnSaveFailure: {},
  doFillStartTurnSaveSuccess: {},
  doEscapeWebFailure: {},
  doEscapeWebSuccess: {},
  doNoLongerInArea: {},
  doMoveWithDifficultTerrain: {},
  doRemoveArea: {},
  step: {},
} as const;

function createWebRestraintHazardDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastWeb: () => {
        state = castWeb(state);
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doDiscoverEntrySave: () => {
        state = discoverWebSave(state, "entersArea");
      },
      doDiscoverStartTurnSave: () => {
        state = discoverWebSave(state, "startsTurnInArea");
      },
      doFillEntrySaveFailure: () => {
        state = fillWebSave(state, "entersArea", false);
      },
      doFillEntrySaveSuccess: () => {
        state = fillWebSave(state, "entersArea", true);
      },
      doFillStartTurnSaveFailure: () => {
        state = fillWebSave(state, "startsTurnInArea", false);
      },
      doFillStartTurnSaveSuccess: () => {
        state = fillWebSave(state, "startsTurnInArea", true);
      },
      doEscapeWebFailure: () => {
        state = escapeWeb(state, false);
      },
      doEscapeWebSuccess: () => {
        state = escapeWeb(state, true);
      },
      doNoLongerInArea: () => {
        state = resolveNoLongerInArea(state);
      },
      doMoveWithDifficultTerrain: () => {
        state = moveWithDifficultTerrain(state);
      },
      doRemoveArea: () => {
        state = removeArea(state);
      },
      step: () => {},
      getState: () => webProjection(state),
    };
  });
}

const webStateCheck = stateCheck(normalizeWebQuintState, compareWebStates);

describe("Web restraint hazard MBT parity", () => {
  it("uses caller-supplied area facts for casting and Difficult Terrain movement", () => {
    const cast = castWeb(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const moved = moveWithDifficultTerrain(targetTurn);

    expect(webProjection(cast)).toMatchObject({
      hazardActive: true,
      casterConcentrating: true,
      actionAvailable: false,
    });
    expect(webProjection(moved)).toMatchObject({
      hazardActive: true,
      movementSpentFeet: webMovementSpentFeet,
      lastResult: "moved",
    });
  });

  it("applies and cleans up Web-owned Restrained without removing the active area", () => {
    const cast = castWeb(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const discovered = discoverWebSave(targetTurn, "entersArea");
    const restrained = fillWebSave(discovered, "entersArea", false);
    const leftArea = resolveNoLongerInArea(restrained);

    expect(webProjection(restrained)).toMatchObject({
      targetRestrained: true,
      entrySavedThisTurn: true,
      hazardActive: true,
    });
    expect(webProjection(leftArea)).toMatchObject({
      targetRestrained: false,
      hazardActive: true,
      lastResult: "leftArea",
    });
  });

  it("removes the active area, Concentration, and Web-owned restraint when the area is removed", () => {
    const cast = castWeb(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const discovered = discoverWebSave(targetTurn, "startsTurnInArea");
    const restrained = fillWebSave(discovered, "startsTurnInArea", false);
    const removed = removeArea(restrained);

    expect(webProjection(removed)).toMatchObject({
      hazardActive: false,
      casterConcentrating: false,
      targetRestrained: false,
      lastResult: "removed",
    });
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-web-restraint-hazard.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createWebRestraintHazardDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: webStateCheck,
    });
  }, 120_000);
});

function initialRuntimeState(): WebRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(webUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "init",
  };
}

function castWeb(state: WebRuntimeState): WebRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: webUnitId,
    slotLevel: 2,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [webAreaFill(area)],
    }),
    "Expected Web cast to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "caster",
    holes: [],
    lastResult: "resolved",
  };
}

function endCasterTurn(state: WebRuntimeState): WebRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Web caster End Turn to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "target",
    holes: [],
    lastResult: "resolved",
  };
}

function discoverWebSave(
  state: WebRuntimeState,
  trigger: "entersArea" | "startsTurnInArea",
): WebRuntimeState {
  const act = webRestraintSaveAct(state.battle, spellTargetId, trigger);
  const result = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [],
  });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Web restraint save hole.");
  }
  return {
    ...state,
    holes: result.holes,
    lastResult: "needsHoles",
  };
}

function fillWebSave(
  state: WebRuntimeState,
  trigger: "entersArea" | "startsTurnInArea",
  succeeded: boolean,
): WebRuntimeState {
  const save = requireWebSaveHole(state.holes, trigger);
  const act = webRestraintSaveAct(state.battle, spellTargetId, trigger);
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(save, spellTargetId, succeeded),
      ],
    }),
    "Expected Web restraint save to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: succeeded ? "saved" : "restrained",
  };
}

function escapeWeb(
  state: WebRuntimeState,
  succeeded: boolean,
): WebRuntimeState {
  const act = discoverBattleActs(state.battle).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "escapeSpellRestraint" &&
      candidate.subject.actorId === spellTargetId &&
      candidate.subject.targetId === spellTargetId,
  );
  if (
    act?.subject.tag !== "action" ||
    act.subject.action !== "escapeSpellRestraint"
  ) {
    throw new Error("Expected Web escape action.");
  }
  const abilityCheck = requireHole(act.initialHoles, "abilityCheck");
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [abilityCheckFill(abilityCheck, succeeded ? 13 : 12)],
    }),
    "Expected Web escape action to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: succeeded ? "escaped" : "escapeFailed",
  };
}

function resolveNoLongerInArea(state: WebRuntimeState): WebRuntimeState {
  const act = webRestrainedNoLongerInAreaAct(state.battle, spellTargetId);
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [],
    }),
    "Expected Web no-longer-in-area cleanup to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: "leftArea",
  };
}

function moveWithDifficultTerrain(state: WebRuntimeState): WebRuntimeState {
  const moveSubject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: spellTargetId,
    command: "move",
  };
  const moveHole = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: moveSubject,
      fills: [],
    }),
    "movement",
  );
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: webMovementSpentFeet,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: {
            kind: "areaDifficultTerrain",
            sources: [
              {
                kind: "webAreaHazard",
                sourceCombatantId: spellCasterId,
                sourceSpellId: webUnitId,
                areaId: webAreaId,
              },
            ],
            totalDistanceFeet: movementFeet(10),
            difficultTerrainDistanceFeet: movementFeet(5),
          },
        }),
      ],
    }),
    "Expected Web Difficult Terrain movement to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: "moved",
  };
}

function removeArea(state: WebRuntimeState): WebRuntimeState {
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: webAreaRemovedAct(state.battle).subject,
      fills: [],
    }),
    "Expected Web area removal to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: "removed",
  };
}

function webProjection(state: WebRuntimeState): WebRestraintHazardState {
  const caster = requireCombatant(state.battle, spellCasterId);
  const target = requireCombatant(state.battle, spellTargetId);
  const hazard = caster.activeEffects.find(
    (effect): effect is WebRestraintHazardEffect =>
      effect.kind === "webRestraintHazard" &&
      effect.sourceSpellId === webUnitId &&
      effect.sourceCombatantId === spellCasterId &&
      effect.areaId === webAreaId,
  );
  const projection = {
    currentTurnRole: state.currentTurnRole,
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: webUnitId,
        slotLevel: 2,
      }) !== undefined,
    hazardActive: hazard !== undefined,
    casterConcentrating:
      caster.concentration?.sourceSpellId === webUnitId &&
      caster.concentration.effectKind === "spellEffect",
    targetRestrained: target.conditions.restrained,
    entrySavedThisTurn:
      hazard?.entrySavedThisTurn.includes(spellTargetId) ?? false,
    startTurnSavedThisTurn:
      hazard?.startTurnSavedThisTurn.includes(spellTargetId) ?? false,
    movementSpentFeet: Number(target.movementSpentFeet),
    holes: battleHolesToWebHoles(state.holes),
    lastResult: state.lastResult,
  };
  expect(projection.casterConcentrating).toBe(projection.hazardActive);
  return projection;
}

function requireWebSaveHole(
  holes: readonly BattleHole[],
  trigger: "entersArea" | "startsTurnInArea",
): Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "savingThrowOutcome" }
    > =>
      candidate.kind === "savingThrowOutcome" &&
      "webRestraint" in candidate &&
      candidate.webRestraint.trigger === trigger,
  );
  if (hole === undefined) {
    throw new Error(`Expected Web ${trigger} Saving Throw outcome hole.`);
  }
  return hole;
}

function battleHolesToWebHoles(
  holes: readonly BattleHole[],
): readonly WebHole[] {
  return holes
    .map((hole) => {
      if (hole.kind === "savingThrowOutcome" && "webRestraint" in hole) {
        return hole.webRestraint.trigger === "entersArea"
          ? "EntrySavingThrowOutcome"
          : "StartTurnSavingThrowOutcome";
      }
      throw new Error(`Unexpected Web hole ${hole.kind}.`);
    })
    .sort();
}

function normalizeWebQuintState(raw: unknown): WebRestraintHazardState {
  const state = quintStateRecord(raw);
  return {
    currentTurnRole: webTurnRole(state["qCurrentTurnRole"]),
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    hazardActive: booleanField(state, "qHazardActive"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    targetRestrained: booleanField(state, "qTargetRestrained"),
    entrySavedThisTurn: booleanField(state, "qEntrySavedThisTurn"),
    startTurnSavedThisTurn: booleanField(state, "qStartTurnSavedThisTurn"),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    holes: quintSet(state["qHoles"], "qHoles").map(webHole).sort(),
    lastResult: webLastResult(state["qLastResult"]),
  };
}

function compareWebStates(
  runtime: WebRestraintHazardState,
  quint: WebRestraintHazardState,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function requireResolved(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error(message);
  }
  return result;
}

function webTurnRole(raw: unknown): WebTurnRole {
  if (raw === "caster" || raw === "target") return raw;
  throw new Error(`Unknown Web turn role: ${String(raw)}.`);
}

function webHole(raw: unknown): WebHole {
  if (
    raw === "EntrySavingThrowOutcome" ||
    raw === "StartTurnSavingThrowOutcome"
  ) {
    return raw;
  }
  throw new Error(`Unknown Web hole: ${String(raw)}.`);
}

function webLastResult(raw: unknown): WebLastResult {
  if (
    raw === "init" ||
    raw === "needsHoles" ||
    raw === "resolved" ||
    raw === "restrained" ||
    raw === "saved" ||
    raw === "escapeFailed" ||
    raw === "escaped" ||
    raw === "leftArea" ||
    raw === "moved" ||
    raw === "removed"
  ) {
    return raw;
  }
  throw new Error(`Unknown Web result: ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint Web state.");
  }
  return raw;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  if (typeof state[field] === "boolean") {
    return state[field];
  }
  throw new Error(`Expected Quint Boolean field ${field}.`);
}

function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }
  throw new Error(`Expected Quint Set field ${field}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
