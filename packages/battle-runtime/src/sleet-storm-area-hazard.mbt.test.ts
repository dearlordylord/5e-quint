// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-sleet-storm-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet } from "@dnd/shared/types";
import {
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  quintVariantMappedValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { describe, expect, it } from "vitest";

import {
  movementFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  singleTargetSavingThrowOutcomeFill,
  sleetStormAreaFill,
  sleetStormAreaHazardSaveAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleObscurementZones,
  endTurn,
  resolveBattleSubject,
  type BattleActiveEffect,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import {
  sleetStormAreaId,
  sleetStormUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import type { SleetStormAreaHazardEffect } from "./battle-reducer/turn-end-movement.ts";

const sleetStormMovementSpentFeet = 15;
const syntheticTargetConcentrationSpellId =
  "synthetic_sleet_storm_mbt_concentration_fixture";

type SleetStormTurnRole = "caster" | "target";
type SleetStormHole = "EntrySavingThrowOutcome" | "StartTurnSavingThrowOutcome";
type SleetStormLastResult =
  | "init"
  | "needsHoles"
  | "resolved"
  | "prone"
  | "saved"
  | "moved"
  | "reset";
const SLEET_STORM_LAST_RESULT_BY_SCENARIO_OUTCOME_TAG = {
  Init: "init",
  NeedsHoles: "needsHoles",
  Resolved: "resolved",
  Prone: "prone",
  Saved: "saved",
  Moved: "moved",
  Reset: "reset",
} as const satisfies Readonly<Record<string, SleetStormLastResult>>;

type SleetStormAreaHazardState = {
  readonly currentTurnRole: SleetStormTurnRole;
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly hazardActive: boolean;
  readonly casterConcentrating: boolean;
  readonly targetConcentrating: boolean;
  readonly targetProne: boolean;
  readonly savedThisTurn: boolean;
  readonly movementSpentFeet: number;
  readonly heavilyObscured: boolean;
  readonly holes: readonly SleetStormHole[];
  readonly lastResult: SleetStormLastResult;
};

type SleetStormRuntimeState = {
  readonly battle: BattleState;
  readonly currentTurnRole: SleetStormTurnRole;
  readonly holes: readonly BattleHole[];
  readonly lastResult: SleetStormLastResult;
};

const driverSchema = {
  init: {},
  doCastSleetStorm: {},
  doEndCasterTurn: {},
  doSupplyEntryTriggerFact: {},
  doSupplyStartTurnTriggerFact: {},
  doFillEntrySaveFailure: {},
  doFillEntrySaveSuccess: {},
  doFillStartTurnSaveFailure: {},
  doFillStartTurnSaveSuccess: {},
  doMoveWithDifficultTerrain: {},
  doEndTargetTurn: {},
  step: {},
} as const;

function createSleetStormAreaHazardDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastSleetStorm: () => {
        state = castSleetStorm(state);
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doSupplyEntryTriggerFact: () => {
        state = supplySleetStormTriggerFact(state, "entersArea");
      },
      doSupplyStartTurnTriggerFact: () => {
        state = supplySleetStormTriggerFact(state, "startsTurnInArea");
      },
      doFillEntrySaveFailure: () => {
        state = fillSleetStormSave(state, "entersArea", false);
      },
      doFillEntrySaveSuccess: () => {
        state = fillSleetStormSave(state, "entersArea", true);
      },
      doFillStartTurnSaveFailure: () => {
        state = fillSleetStormSave(state, "startsTurnInArea", false);
      },
      doFillStartTurnSaveSuccess: () => {
        state = fillSleetStormSave(state, "startsTurnInArea", true);
      },
      doMoveWithDifficultTerrain: () => {
        state = moveWithDifficultTerrain(state);
      },
      doEndTargetTurn: () => {
        state = endTargetTurn(state);
      },
      step: () => {},
      getState: () => sleetStormProjection(state),
    };
  });
}

const sleetStormStateCheck = stateCheck(
  normalizeSleetStormQuintState,
  compareSleetStormStates,
);

describe("Sleet Storm area hazard MBT parity", () => {
  it("uses caller-supplied area facts for casting, Difficult Terrain, and obscurement", () => {
    const cast = castSleetStorm(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const moved = moveWithDifficultTerrain(targetTurn);

    expect(sleetStormProjection(cast)).toMatchObject({
      hazardActive: true,
      casterConcentrating: true,
      heavilyObscured: true,
      actionAvailable: false,
    });
    expect(sleetStormProjection(moved)).toMatchObject({
      hazardActive: true,
      movementSpentFeet: sleetStormMovementSpentFeet,
      lastResult: "moved",
    });
  });

  it("applies Prone and breaks target Concentration on a failed entry save", () => {
    const cast = castSleetStorm(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const supplied = supplySleetStormTriggerFact(targetTurn, "entersArea");
    const failed = fillSleetStormSave(supplied, "entersArea", false);

    expect(sleetStormProjection(failed)).toMatchObject({
      targetProne: true,
      targetConcentrating: false,
      savedThisTurn: true,
      hazardActive: true,
      lastResult: "prone",
    });
  });

  it("rejects a start-turn save after an entry save consumed the shared turn limit", () => {
    const cast = castSleetStorm(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const supplied = supplySleetStormTriggerFact(targetTurn, "entersArea");
    const saved = fillSleetStormSave(supplied, "entersArea", true);
    const duplicateStartTurn = sleetStormAreaHazardSaveAct(
      saved.battle,
      spellTargetId,
      "startsTurnInArea",
    );

    expect(
      resolveBattleSubject({
        state: saved.battle,
        subject: duplicateStartTurn.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Sleet Storm save was already resolved for this target this turn.",
    });
    expect(sleetStormProjection(saved)).toMatchObject({
      savedThisTurn: true,
      lastResult: "saved",
    });
  });

  it("marks successful start-turn saves and resets Sleet Storm ledgers on the next turn", () => {
    const cast = castSleetStorm(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const supplied = supplySleetStormTriggerFact(
      targetTurn,
      "startsTurnInArea",
    );
    const saved = fillSleetStormSave(supplied, "startsTurnInArea", true);
    const reset = endTargetTurn(saved);

    expect(sleetStormProjection(saved)).toMatchObject({
      targetProne: false,
      targetConcentrating: true,
      savedThisTurn: true,
      lastResult: "saved",
    });
    expect(sleetStormProjection(reset)).toMatchObject({
      savedThisTurn: false,
      lastResult: "reset",
    });
  });

  it("rejects an entry save after a start-turn save consumed the shared turn limit", () => {
    const cast = castSleetStorm(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const supplied = supplySleetStormTriggerFact(
      targetTurn,
      "startsTurnInArea",
    );
    const saved = fillSleetStormSave(supplied, "startsTurnInArea", true);
    const duplicateEntry = sleetStormAreaHazardSaveAct(
      saved.battle,
      spellTargetId,
      "entersArea",
    );

    expect(
      resolveBattleSubject({
        state: saved.battle,
        subject: duplicateEntry.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Sleet Storm save was already resolved for this target this turn.",
    });
    expect(sleetStormProjection(saved)).toMatchObject({
      savedThisTurn: true,
      lastResult: "saved",
    });
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sleet-storm-area-hazard.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSleetStormAreaHazardDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(6),
      stateCheck: sleetStormStateCheck,
    });
  }, 120_000);
});

function initialRuntimeState(): SleetStormRuntimeState {
  return {
    battle: stateWithTargetConcentration(
      spellBattle({
        preparedSpells: [spellRecord(sleetStormUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    ),
    currentTurnRole: "caster",
    holes: [],
    lastResult: "init",
  };
}

function stateWithTargetConcentration(state: BattleState): BattleState {
  const target = requireCombatant(state, spellTargetId);
  const concentrationEffect: BattleActiveEffect = {
    kind: "spellArmorClassBonus",
    sourceSpellId: syntheticTargetConcentrationSpellId,
    sourceCombatantId: spellTargetId,
    bonus: 1,
    negatedSpellIds: [],
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
    },
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      concentration: {
        sourceSpellId: syntheticTargetConcentrationSpellId,
        effectKind: "spellEffect",
      },
      activeEffects: [...target.activeEffects, concentrationEffect],
    }),
  };
}

function castSleetStorm(state: SleetStormRuntimeState): SleetStormRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: sleetStormUnitId,
    slotLevel: 3,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [sleetStormAreaFill(area)],
    }),
    "Expected Sleet Storm cast to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "caster",
    holes: [],
    lastResult: "resolved",
  };
}

function endCasterTurn(state: SleetStormRuntimeState): SleetStormRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Sleet Storm caster End Turn to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "target",
    holes: [],
    lastResult: "resolved",
  };
}

function supplySleetStormTriggerFact(
  state: SleetStormRuntimeState,
  trigger: "entersArea" | "startsTurnInArea",
): SleetStormRuntimeState {
  const act = sleetStormAreaHazardSaveAct(state.battle, spellTargetId, trigger);
  const result = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [],
  });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Sleet Storm area-hazard save hole.");
  }
  return {
    ...state,
    holes: result.holes,
    lastResult: "needsHoles",
  };
}

function fillSleetStormSave(
  state: SleetStormRuntimeState,
  trigger: "entersArea" | "startsTurnInArea",
  succeeded: boolean,
): SleetStormRuntimeState {
  const save = requireSleetStormSaveHole(state.holes, trigger);
  const act = sleetStormAreaHazardSaveAct(state.battle, spellTargetId, trigger);
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(save, spellTargetId, succeeded),
      ],
    }),
    "Expected Sleet Storm area-hazard save to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: succeeded ? "saved" : "prone",
  };
}

function moveWithDifficultTerrain(
  state: SleetStormRuntimeState,
): SleetStormRuntimeState {
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
          movementCostFeet: sleetStormMovementSpentFeet,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: {
            kind: "areaDifficultTerrain",
            sources: [
              {
                kind: "sleetStormHazard",
                sourceCombatantId: spellCasterId,
                sourceSpellId: sleetStormUnitId,
                areaId: sleetStormAreaId,
              },
            ],
            totalDistanceFeet: movementFeet(10),
            difficultTerrainDistanceFeet: movementFeet(5),
          },
        }),
      ],
    }),
    "Expected Sleet Storm Difficult Terrain movement to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    lastResult: "moved",
  };
}

function endTargetTurn(state: SleetStormRuntimeState): SleetStormRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellTargetId }),
    "Expected Sleet Storm target End Turn to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "caster",
    holes: [],
    lastResult: "reset",
  };
}

function sleetStormProjection(
  state: SleetStormRuntimeState,
): SleetStormAreaHazardState {
  const caster = requireCombatant(state.battle, spellCasterId);
  const target = requireCombatant(state.battle, spellTargetId);
  const hazard = caster.activeEffects.find(
    (effect): effect is SleetStormAreaHazardEffect =>
      effect.kind === "sleetStormAreaHazard" &&
      effect.sourceSpellId === sleetStormUnitId &&
      effect.sourceCombatantId === spellCasterId &&
      effect.areaId === sleetStormAreaId,
  );
  const projection = {
    currentTurnRole: state.currentTurnRole,
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: sleetStormUnitId,
        slotLevel: 3,
      }) !== undefined,
    hazardActive: hazard !== undefined,
    casterConcentrating:
      caster.concentration?.sourceSpellId === sleetStormUnitId &&
      caster.concentration.effectKind === "spellEffect",
    targetConcentrating:
      target.concentration?.sourceSpellId ===
        syntheticTargetConcentrationSpellId &&
      target.concentration.effectKind === "spellEffect",
    targetProne: target.conditions.prone,
    savedThisTurn: hazard?.savedThisTurn.includes(spellTargetId) ?? false,
    movementSpentFeet: Number(target.movementSpentFeet),
    heavilyObscured: battleObscurementZones(state.battle).some(
      (zone) =>
        zone.kind === "spellObscurementZone" &&
        zone.sourceSpellId === sleetStormUnitId &&
        zone.sourceCombatantId === spellCasterId &&
        zone.obscurement === "heavilyObscured" &&
        zone.area.kind === "pointOriginCylinder" &&
        zone.area.areaId === sleetStormAreaId,
    ),
    holes: battleHolesToSleetStormHoles(state.holes),
    lastResult: state.lastResult,
  };
  expect(projection.casterConcentrating).toBe(projection.hazardActive);
  expect(projection.heavilyObscured).toBe(projection.hazardActive);
  return projection;
}

function requireSleetStormSaveHole(
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
      "sleetStormAreaHazard" in candidate &&
      candidate.sleetStormAreaHazard.trigger === trigger,
  );
  if (hole === undefined) {
    throw new Error(
      `Expected Sleet Storm ${trigger} Saving Throw outcome hole.`,
    );
  }
  return hole;
}

function battleHolesToSleetStormHoles(
  holes: readonly BattleHole[],
): readonly SleetStormHole[] {
  return holes
    .map((hole) => {
      if (
        hole.kind === "savingThrowOutcome" &&
        "sleetStormAreaHazard" in hole
      ) {
        return hole.sleetStormAreaHazard.trigger === "entersArea"
          ? "EntrySavingThrowOutcome"
          : "StartTurnSavingThrowOutcome";
      }
      throw new Error(`Unexpected Sleet Storm hole ${hole.kind}.`);
    })
    .sort();
}

function normalizeSleetStormQuintState(
  raw: unknown,
): SleetStormAreaHazardState {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "",
    decodeHole: sleetStormHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  const scenarioResult = sleetStormLastResult(state["qScenarioOutcome"]);
  assertWitnessProtocolConsistentWithScenario({
    label: "Sleet Storm area hazard",
    scenarioResult,
    protocol,
  });
  return {
    currentTurnRole: sleetStormTurnRole(state["qCurrentTurnRole"]),
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    hazardActive: booleanField(state, "qHazardActive"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    targetConcentrating: booleanField(state, "qTargetConcentrating"),
    targetProne: booleanField(state, "qTargetProne"),
    savedThisTurn: booleanField(state, "qSavedThisTurn"),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    heavilyObscured: booleanField(state, "qHeavilyObscured"),
    holes: protocol.holes,
    lastResult: scenarioResult,
  };
}

function compareSleetStormStates(
  runtime: SleetStormAreaHazardState,
  quint: SleetStormAreaHazardState,
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

function sleetStormTurnRole(raw: unknown): SleetStormTurnRole {
  if (raw === "caster" || raw === "target") return raw;
  throw new Error(`Unknown Sleet Storm turn role: ${String(raw)}.`);
}

function sleetStormHole(raw: unknown): SleetStormHole {
  if (
    raw === "EntrySavingThrowOutcome" ||
    raw === "StartTurnSavingThrowOutcome"
  ) {
    return raw;
  }
  throw new Error(`Unknown Sleet Storm hole: ${String(raw)}.`);
}

function sleetStormLastResult(raw: unknown): SleetStormLastResult {
  return quintVariantMappedValue(
    raw,
    "qScenarioOutcome",
    SLEET_STORM_LAST_RESULT_BY_SCENARIO_OUTCOME_TAG,
    "Sleet Storm result",
  );
}
