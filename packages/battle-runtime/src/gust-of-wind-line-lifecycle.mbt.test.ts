// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-gust-of-wind-line
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  movementFill,
  requireCombatant,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  gustOfWindLineDirectionChangeAct,
  gustOfWindLineDirectionChoiceFill,
  gustOfWindLineEndTurnSaveAct,
  gustOfWindLineSavingThrowOutcomeFill,
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  gustOfWindAreaId,
  gustOfWindEastDirectionId,
  gustOfWindNorthDirectionId,
  gustOfWindUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleLineDirectionId,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import type { GustOfWindLineEffect } from "./battle-reducer/turn-end-movement.ts";

const gustMovementTotalFeet = 5;
const gustMovementCloserFeet = 5;
const gustMovementCostFeet = 10;

type GustTurnRole = "caster" | "target";
type GustLineDirection = "none" | "north" | "east";
type GustHole = "InitialLineSave" | "EndTurnLineSave" | "DirectionChoice";
type GustLastResult =
  | "init"
  | "needsHoles"
  | "initialSaveSucceeded"
  | "initialSaveFailed"
  | "directionChangeBlocked"
  | "endCasterTurn"
  | "endTurnSaveSucceeded"
  | "endTurnSaveFailed"
  | "movedCloser"
  | "directionChanged"
  | "concentrationBroken";
const GUST_OF_WIND_LINE_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, GustLastResult>
> = {
  Init: "init",
  NeedsHoles: "needsHoles",
  InitialSaveSucceeded: "initialSaveSucceeded",
  InitialSaveFailed: "initialSaveFailed",
  MovedCloser: "movedCloser",
  EndTurnSaveSucceeded: "endTurnSaveSucceeded",
  EndTurnSaveFailed: "endTurnSaveFailed",
  DirectionChanged: "directionChanged",
  DirectionChangeBlocked: "directionChangeBlocked",
  EndCasterTurn: "endCasterTurn",
  ConcentrationBroken: "concentrationBroken",
};

type GustOfWindLineState = {
  readonly currentTurnRole: GustTurnRole;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly lineActive: boolean;
  readonly casterConcentrating: boolean;
  readonly lineDirection: GustLineDirection;
  readonly lineMovementCostFeet: number;
  readonly holes: readonly GustHole[];
  readonly lastResult: GustLastResult;
};

type GustRuntimeState = {
  readonly battle: BattleState;
  readonly currentTurnRole: GustTurnRole;
  readonly holes: readonly BattleHole[];
  readonly lastResult: GustLastResult;
};

const driverSchema = {
  init: {},
  doDiscoverInitialLineSave: {},
  doCastInitialSaveSuccess: {},
  doCastInitialSaveFailure: {},
  doTrySameTurnDirectionChangeBlocked: {},
  doEndCasterTurn: {},
  doDiscoverEndTurnLineSave: {},
  doFillEndTurnSaveSuccess: {},
  doFillEndTurnSaveFailure: {},
  doMoveCloserThroughLine: {},
  doDiscoverDirectionChange: {},
  doChangeDirectionEast: {},
  doBreakConcentration: {},
  step: {},
} as const;

function createGustOfWindLineDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doDiscoverInitialLineSave: () => {
        state = discoverInitialLineSave(state);
      },
      doCastInitialSaveSuccess: () => {
        state = castGustOfWind(state, true);
      },
      doCastInitialSaveFailure: () => {
        state = castGustOfWind(state, false);
      },
      doTrySameTurnDirectionChangeBlocked: () => {
        state = trySameTurnDirectionChange(state);
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doDiscoverEndTurnLineSave: () => {
        state = discoverEndTurnLineSave(state);
      },
      doFillEndTurnSaveSuccess: () => {
        state = fillEndTurnLineSave(state, true);
      },
      doFillEndTurnSaveFailure: () => {
        state = fillEndTurnLineSave(state, false);
      },
      doMoveCloserThroughLine: () => {
        state = moveCloserThroughLine(state);
      },
      doDiscoverDirectionChange: () => {
        state = discoverDirectionChange(state);
      },
      doChangeDirectionEast: () => {
        state = changeDirectionEast(state);
      },
      doBreakConcentration: () => {
        state = breakGustConcentration(state);
      },
      step: () => {},
      getState: () => gustProjection(state),
    };
  });
}

const gustStateCheck = stateCheck(normalizeGustQuintState, compareGustStates);

describe("Gust of Wind Line lifecycle MBT parity", () => {
  it("creates a caster-owned Line from caller-supplied Line save facts", () => {
    const initialHole = discoverInitialLineSave(initialRuntimeState());
    const cast = castGustOfWind(initialHole, false);

    expect(gustProjection(cast)).toMatchObject({
      actionAvailable: false,
      spellAvailable: false,
      lineActive: true,
      casterConcentrating: true,
      lineDirection: "north",
      lineMovementCostFeet: 0,
      lastResult: "initialSaveFailed",
    });
  });

  it("uses table-supplied movement facts for moving closer through the Line", () => {
    const cast = castGustOfWind(
      discoverInitialLineSave(initialRuntimeState()),
      true,
    );
    const targetTurn = endCasterTurn(cast);
    const moved = moveCloserThroughLine(targetTurn);

    expect(gustProjection(moved)).toMatchObject({
      lineActive: true,
      lineMovementCostFeet: gustMovementCostFeet,
      lastResult: "movedCloser",
    });
  });

  it("uses table-supplied end-turn save and later-turn direction facts", () => {
    const cast = castGustOfWind(
      discoverInitialLineSave(initialRuntimeState()),
      true,
    );
    const blocked = trySameTurnDirectionChange(cast);
    const targetTurn = endCasterTurn(blocked);
    const saveHole = discoverEndTurnLineSave(targetTurn);
    const casterTurn = fillEndTurnLineSave(saveHole, false);
    const directionHole = discoverDirectionChange(casterTurn);
    const changed = changeDirectionEast(directionHole);

    expect(gustProjection(blocked)).toMatchObject({
      bonusActionAvailable: true,
      lineDirection: "north",
      lastResult: "directionChangeBlocked",
    });
    expect(gustProjection(changed)).toMatchObject({
      bonusActionAvailable: false,
      lineDirection: "east",
      lastResult: "directionChanged",
    });
  });

  it("cleans up the Line when Concentration breaks", () => {
    const cast = castGustOfWind(
      discoverInitialLineSave(initialRuntimeState()),
      true,
    );
    const broken = breakGustConcentration(cast);

    expect(gustProjection(broken)).toMatchObject({
      lineActive: false,
      casterConcentrating: false,
      lineDirection: "none",
      lastResult: "concentrationBroken",
    });
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-gust-of-wind-line-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createGustOfWindLineDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(7),
      stateCheck: gustStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});

function initialRuntimeState(): GustRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(gustOfWindUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    }),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "init",
  };
}

function discoverInitialLineSave(state: GustRuntimeState): GustRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: gustOfWindUnitId,
    slotLevel: 2,
  });
  const result = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [],
  });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Gust of Wind initial Line save hole.");
  }
  return { ...state, holes: result.holes, lastResult: "needsHoles" };
}

function castGustOfWind(
  state: GustRuntimeState,
  succeeded: boolean,
): GustRuntimeState {
  const save = requireInitialLineSaveHole(state.holes);
  const act = spellAct({
    state: state.battle,
    spellId: gustOfWindUnitId,
    slotLevel: 2,
  });
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        gustOfWindLineSavingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded },
        ]),
      ],
    }),
    "Expected Gust of Wind cast to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: succeeded ? "initialSaveSucceeded" : "initialSaveFailed",
  };
}

function trySameTurnDirectionChange(state: GustRuntimeState): GustRuntimeState {
  expect(
    maybeGustDirectionChangeAct(state.battle, gustOfWindNorthDirectionId),
  ).toBeUndefined();
  return { ...state, lastResult: "directionChangeBlocked" };
}

function endCasterTurn(state: GustRuntimeState): GustRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Gust of Wind caster End Turn to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "target",
    holes: [],
    lastResult: "endCasterTurn",
  };
}

function discoverEndTurnLineSave(state: GustRuntimeState): GustRuntimeState {
  const act = gustOfWindLineEndTurnSaveAct(
    state.battle,
    spellTargetId,
    gustOfWindAreaId,
    effectDirectionId(state.battle),
  );
  const result = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [],
  });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Gust of Wind end-turn Line save hole.");
  }
  return { ...state, holes: result.holes, lastResult: "needsHoles" };
}

function fillEndTurnLineSave(
  state: GustRuntimeState,
  succeeded: boolean,
): GustRuntimeState {
  const directionId = effectDirectionId(state.battle);
  const save = requireEndTurnLineSaveHole(state.holes);
  const act = gustOfWindLineEndTurnSaveAct(
    state.battle,
    spellTargetId,
    gustOfWindAreaId,
    directionId,
  );
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        gustOfWindLineSavingThrowOutcomeFill(
          save,
          [{ targetId: spellTargetId, succeeded }],
          { directionId },
        ),
      ],
    }),
    "Expected Gust of Wind end-turn Line save to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "caster",
    holes: [],
    lastResult: succeeded ? "endTurnSaveSucceeded" : "endTurnSaveFailed",
  };
}

function moveCloserThroughLine(state: GustRuntimeState): GustRuntimeState {
  const moveSubject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: spellTargetId,
    command: "move",
  };
  const directionId = effectDirectionId(state.battle);
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
          movementCostFeet: gustMovementCostFeet,
          provokedOpportunityAttacks: [],
          gustOfWindLineMovement: gustOfWindLineMovementFact({
            directionId,
            totalDistanceFeet: gustMovementTotalFeet,
            closerDistanceFeet: gustMovementCloserFeet,
          }),
        }),
      ],
    }),
    "Expected Gust of Wind Line movement to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: "movedCloser",
  };
}

function discoverDirectionChange(state: GustRuntimeState): GustRuntimeState {
  const act = gustOfWindLineDirectionChangeAct(
    state.battle,
    spellCasterId,
    gustOfWindAreaId,
    gustOfWindNorthDirectionId,
  );
  const result = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [],
  });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Gust of Wind direction-choice hole.");
  }
  return { ...state, holes: result.holes, lastResult: "needsHoles" };
}

function changeDirectionEast(state: GustRuntimeState): GustRuntimeState {
  const direction = requireDirectionChoiceHole(state.holes);
  const act = gustOfWindLineDirectionChangeAct(
    state.battle,
    spellCasterId,
    gustOfWindAreaId,
    gustOfWindNorthDirectionId,
  );
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [gustOfWindLineDirectionChoiceFill(direction)],
    }),
    "Expected Gust of Wind direction change to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: "directionChanged",
  };
}

function breakGustConcentration(state: GustRuntimeState): GustRuntimeState {
  return {
    ...state,
    battle: breakBattleConcentration(state.battle, spellCasterId),
    holes: [],
    lastResult: "concentrationBroken",
  };
}

function gustProjection(state: GustRuntimeState): GustOfWindLineState {
  const caster = requireCombatant(state.battle, spellCasterId);
  const effect = gustLineEffect(state.battle);
  const lineActive = effect !== undefined;
  const projection = {
    currentTurnRole: state.currentTurnRole,
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    bonusActionAvailable:
      state.battle.currentTurnResources.currentHasBonusAction,
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: gustOfWindUnitId,
        slotLevel: 2,
      }) !== undefined,
    lineActive,
    casterConcentrating:
      caster.concentration?.sourceSpellId === gustOfWindUnitId &&
      caster.concentration.effectKind === "spellEffect",
    lineDirection: effect === undefined ? "none" : lineDirection(effect),
    lineMovementCostFeet:
      state.lastResult === "movedCloser" ? gustMovementCostFeet : 0,
    holes: battleHolesToGustHoles(state.holes),
    lastResult: state.lastResult,
  };
  expect(projection.casterConcentrating).toBe(projection.lineActive);
  return projection;
}

function gustLineEffect(state: BattleState): GustOfWindLineEffect | undefined {
  const caster = requireCombatant(state, spellCasterId);
  return caster.activeEffects.find(
    (effect): effect is GustOfWindLineEffect =>
      effect.kind === "gustOfWindLine" &&
      effect.sourceSpellId === gustOfWindUnitId &&
      effect.sourceCombatantId === spellCasterId &&
      effect.areaId === gustOfWindAreaId,
  );
}

function effectDirectionId(state: BattleState): BattleLineDirectionId {
  const effect = gustLineEffect(state);
  if (effect === undefined) {
    throw new Error("Expected active Gust of Wind Line.");
  }
  return effect.directionId;
}

function lineDirection(effect: GustOfWindLineEffect): GustLineDirection {
  if (effect.directionId === gustOfWindNorthDirectionId) return "north";
  if (effect.directionId === gustOfWindEastDirectionId) return "east";
  throw new Error(`Unexpected Gust of Wind direction ${effect.directionId}.`);
}

function gustOfWindLineMovementFact(input: {
  readonly directionId: BattleLineDirectionId;
  readonly totalDistanceFeet: number;
  readonly closerDistanceFeet: number;
}): Extract<
  BattleFill,
  { readonly kind: "movement" }
>["value"]["gustOfWindLineMovement"] {
  return {
    kind: "gustOfWindLineMovement",
    sourceCombatantId: spellCasterId,
    sourceSpellId: gustOfWindUnitId,
    areaId: gustOfWindAreaId,
    directionId: input.directionId,
    totalDistanceFeet: movementFeet(input.totalDistanceFeet),
    closerDistanceFeet: movementFeet(input.closerDistanceFeet),
  };
}

function maybeGustDirectionChangeAct(
  state: BattleState,
  directionId: BattleLineDirectionId,
) {
  return discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "gustOfWindLineDirectionChange" &&
      candidate.subject.actorId === spellCasterId &&
      candidate.subject.areaId === gustOfWindAreaId &&
      candidate.subject.directionId === directionId,
  );
}

function requireInitialLineSaveHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "savingThrowOutcome" }
    > =>
      candidate.kind === "savingThrowOutcome" &&
      !("gustOfWindLine" in candidate),
  );
  if (hole === undefined) {
    throw new Error("Expected initial Gust of Wind Line save hole.");
  }
  return hole;
}

function requireEndTurnLineSaveHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "savingThrowOutcome" }
    > =>
      candidate.kind === "savingThrowOutcome" && "gustOfWindLine" in candidate,
  );
  if (hole === undefined) {
    throw new Error("Expected end-turn Gust of Wind Line save hole.");
  }
  return hole;
}

function requireDirectionChoiceHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "gustOfWindLineDirectionChoice" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "gustOfWindLineDirectionChoice" }
    > => candidate.kind === "gustOfWindLineDirectionChoice",
  );
  if (hole === undefined) {
    throw new Error("Expected Gust of Wind Line direction-choice hole.");
  }
  return hole;
}

function battleHolesToGustHoles(
  holes: readonly BattleHole[],
): readonly GustHole[] {
  return holes
    .map((hole) => {
      if (hole.kind === "gustOfWindLineDirectionChoice") {
        return "DirectionChoice";
      }
      if (hole.kind === "savingThrowOutcome" && "gustOfWindLine" in hole) {
        return "EndTurnLineSave";
      }
      if (hole.kind === "savingThrowOutcome") {
        return "InitialLineSave";
      }
      throw new Error(`Unexpected Gust of Wind hole ${hole.kind}.`);
    })
    .sort();
}

function normalizeGustQuintState(raw: unknown): GustOfWindLineState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: gustHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  const scenarioResult = gustLastResult(state["qScenarioOutcome"]);
  assertWitnessProtocolConsistentWithScenario({
    label: "Gust of Wind Line lifecycle",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    currentTurnRole: gustTurnRole(state["qCurrentTurnRole"]),
    actionAvailable: booleanField(state, "qActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    lineActive: booleanField(state, "qLineActive"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    lineDirection: gustLineDirection(state["qLineDirection"]),
    lineMovementCostFeet: numberFromQuintInt(
      state["qLineMovementCostFeet"],
      "qLineMovementCostFeet",
    ),
    holes: protocol.holes,
    lastResult: scenarioResult,
  };
}

function compareGustStates(
  runtime: GustOfWindLineState,
  quint: GustOfWindLineState,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\nRuntime: ${JSON.stringify(runtime)}\nQuint: ${JSON.stringify(quint)}`,
      );
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

function gustTurnRole(raw: unknown): GustTurnRole {
  if (raw === "caster" || raw === "target") return raw;
  throw new Error(`Unknown Gust of Wind turn role: ${String(raw)}.`);
}

function gustLineDirection(raw: unknown): GustLineDirection {
  if (raw === "none" || raw === "north" || raw === "east") return raw;
  throw new Error(`Unknown Gust of Wind Line direction: ${String(raw)}.`);
}

function gustHole(raw: unknown): GustHole {
  if (
    raw === "InitialLineSave" ||
    raw === "EndTurnLineSave" ||
    raw === "DirectionChoice"
  ) {
    return raw;
  }
  throw new Error(`Unknown Gust of Wind hole: ${String(raw)}.`);
}

function gustLastResult(raw: unknown): GustLastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value =
    GUST_OF_WIND_LINE_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(`Unknown Gust of Wind result: ${tag}.`);
}
