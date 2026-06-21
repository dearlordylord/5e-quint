// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-spike-growth-movement-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Hp, movementFeet } from "@dnd/shared/types";
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
  damageRollFillWithGroups,
  movementFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  spellAct,
  spikeGrowthAreaFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  spellCasterId,
  spellTargetId,
  spikeGrowthAreaId,
  spikeGrowthUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  breakBattleConcentration,
  endTurn,
  resolveBattleSubject,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

const targetFullHp = 20;
const damageIncrementFeet = 5;
const damageDistanceFeet = 10;
const damageIncrements = damageDistanceFeet / damageIncrementFeet;
const rolledDamagePerIncrement = 2;
const scaledDamageDice = rolledDamagePerIncrement * damageIncrements;
const scaledDamageTotal = scaledDamageDice;
const targetDamagedHp = targetFullHp - scaledDamageTotal;
const movementTotalFeet = 10;
const difficultTerrainDistanceFeet = damageDistanceFeet;
const movementCostFeet = movementTotalFeet + difficultTerrainDistanceFeet;
const spikeGrowthDamageRoll = [
  Array.from({ length: scaledDamageDice }, () => 1),
];

type SpikeGrowthTurnRole = "caster" | "target";
type SpikeGrowthHole = "MovementDamage";
type SpikeGrowthLastResult =
  | "init"
  | "cast"
  | "targetTurn"
  | "needsHoles"
  | "damaged"
  | "concentrationBroken";
const SPIKE_GROWTH_LAST_RESULT_BY_SCENARIO_OUTCOME_TAG = {
  Init: "init",
  Cast: "cast",
  TargetTurn: "targetTurn",
  NeedsHoles: "needsHoles",
  Damaged: "damaged",
  ConcentrationBroken: "concentrationBroken",
} as const satisfies Readonly<Record<string, SpikeGrowthLastResult>>;

type SpikeGrowthMovementHazardState = {
  readonly currentTurnRole: SpikeGrowthTurnRole;
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly hazardActive: boolean;
  readonly casterConcentrating: boolean;
  readonly targetHp: number;
  readonly movementSpentFeet: number;
  readonly holes: readonly SpikeGrowthHole[];
  readonly lastResult: SpikeGrowthLastResult;
};

type SpikeGrowthRuntimeState = {
  readonly battle: BattleState;
  readonly currentTurnRole: SpikeGrowthTurnRole;
  readonly holes: readonly BattleHole[];
  readonly pendingMovement: {
    readonly subject: BattleSubject;
    readonly fill: Extract<BattleFill, { readonly kind: "movement" }>;
  } | null;
  readonly lastResult: SpikeGrowthLastResult;
};

type SpikeGrowthHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spikeGrowthHazard" }
>;

const driverSchema = {
  init: {},
  doCastSpikeGrowth: {},
  doEndCasterTurn: {},
  doDiscoverMovementDamage: {},
  doResolveMovementDamage: {},
  doBreakConcentration: {},
  step: {},
} as const;

function createSpikeGrowthMovementHazardDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastSpikeGrowth: () => {
        state = castSpikeGrowth(state);
      },
      doEndCasterTurn: () => {
        state = endCasterTurn(state);
      },
      doDiscoverMovementDamage: () => {
        state = discoverMovementDamage(state);
      },
      doResolveMovementDamage: () => {
        state = resolveMovementDamage(state);
      },
      doBreakConcentration: () => {
        state = breakSpikeGrowthConcentration(state);
      },
      step: () => {},
      getState: () => spikeGrowthProjection(state),
    };
  });
}

const spikeGrowthStateCheck = stateCheck(
  normalizeSpikeGrowthQuintState,
  compareSpikeGrowthStates,
);

describe("Spike Growth movement hazard MBT parity", () => {
  it("creates a caster-owned movement hazard from caller-supplied area facts", () => {
    const cast = castSpikeGrowth(initialRuntimeState());

    expect(spikeGrowthProjection(cast)).toMatchObject({
      actionAvailable: false,
      spellAvailable: false,
      hazardActive: true,
      casterConcentrating: true,
      targetHp: targetFullHp,
      lastResult: "cast",
    });
  });

  it("uses table-supplied movement facts and asks only for movement damage dice", () => {
    const cast = castSpikeGrowth(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const pendingDamage = discoverMovementDamage(targetTurn);

    expect(spikeGrowthProjection(pendingDamage)).toMatchObject({
      hazardActive: true,
      movementSpentFeet: 0,
      targetHp: targetFullHp,
      holes: ["MovementDamage"],
      lastResult: "needsHoles",
    });
  });

  it("scales movement-triggered Piercing damage per 5 feet traveled", () => {
    const cast = castSpikeGrowth(initialRuntimeState());
    const targetTurn = endCasterTurn(cast);
    const pendingDamage = discoverMovementDamage(targetTurn);
    const damaged = resolveMovementDamage(pendingDamage);

    expect(spikeGrowthProjection(damaged)).toMatchObject({
      hazardActive: true,
      movementSpentFeet: movementCostFeet,
      targetHp: targetDamagedHp,
      holes: [],
      lastResult: "damaged",
    });
  });

  it("cleans up the hazard when Concentration breaks", () => {
    const cast = castSpikeGrowth(initialRuntimeState());
    const broken = breakSpikeGrowthConcentration(cast);

    expect(spikeGrowthProjection(broken)).toMatchObject({
      hazardActive: false,
      casterConcentrating: false,
      lastResult: "concentrationBroken",
    });
  });

  it("keeps Spike Growth recognition and perception outside runtime state", () => {
    const projection = spikeGrowthProjection(
      castSpikeGrowth(initialRuntimeState()),
    );

    expect(Object.keys(projection).sort()).toEqual([
      "actionAvailable",
      "casterConcentrating",
      "currentTurnRole",
      "hazardActive",
      "holes",
      "lastResult",
      "movementSpentFeet",
      "spellAvailable",
      "targetHp",
    ]);
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-spike-growth-movement-hazard.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSpikeGrowthMovementHazardDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(5),
      stateCheck: spikeGrowthStateCheck,
    });
  }, 120_000);
});

function initialRuntimeState(): SpikeGrowthRuntimeState {
  const battle = spellBattle({
    preparedSpells: [spellRecord(spikeGrowthUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const target = requireCombatant(battle, spellTargetId);
  return {
    battle: {
      ...battle,
      combatants: new Map(battle.combatants).set(spellTargetId, {
        ...target,
        hp: Hp(targetFullHp),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    },
    currentTurnRole: "caster",
    holes: [],
    pendingMovement: null,
    lastResult: "init",
  };
}

function castSpikeGrowth(
  state: SpikeGrowthRuntimeState,
): SpikeGrowthRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: spikeGrowthUnitId,
    slotLevel: 2,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [spikeGrowthAreaFill(area)],
    }),
    "Expected Spike Growth cast to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "caster",
    holes: [],
    pendingMovement: null,
    lastResult: "cast",
  };
}

function endCasterTurn(
  state: SpikeGrowthRuntimeState,
): SpikeGrowthRuntimeState {
  const result = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected Spike Growth caster End Turn to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    currentTurnRole: "target",
    holes: [],
    pendingMovement: null,
    lastResult: "targetTurn",
  };
}

function discoverMovementDamage(
  state: SpikeGrowthRuntimeState,
): SpikeGrowthRuntimeState {
  const subject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: spellTargetId,
    command: "move",
  };
  const movement = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject,
      fills: [],
    }),
    "movement",
  );
  const fill = spikeGrowthMovementFill(movement);
  const result = resolveBattleSubject({
    state: state.battle,
    subject,
    fills: [fill],
  });
  expect(result).toMatchObject({
    tag: "needsHoles",
    holes: [expect.objectContaining({ kind: "rolledDice" })],
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Spike Growth movement damage hole.");
  }
  expect(requireResultHole(result, "rolledDice")).toMatchObject({
    spikeGrowthMovement: {
      distanceFeet: movementFeet(damageDistanceFeet),
      damage: {
        expr: { dice: scaledDamageDice, dieSize: 4 },
        damageType: "piercing",
      },
    },
  });
  return {
    ...state,
    holes: result.holes,
    pendingMovement: { subject, fill },
    lastResult: "needsHoles",
  };
}

function resolveMovementDamage(
  state: SpikeGrowthRuntimeState,
): SpikeGrowthRuntimeState {
  if (state.pendingMovement === null) {
    throw new Error("Expected pending Spike Growth movement.");
  }
  const damage = requireHole(state.holes, "rolledDice");
  const result = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pendingMovement.subject,
      fills: [
        state.pendingMovement.fill,
        damageRollFillWithGroups(damage, spikeGrowthDamageRoll),
      ],
    }),
    "Expected Spike Growth movement damage to resolve.",
  );
  return {
    ...state,
    battle: result.state,
    holes: [],
    pendingMovement: null,
    lastResult: "damaged",
  };
}

function breakSpikeGrowthConcentration(
  state: SpikeGrowthRuntimeState,
): SpikeGrowthRuntimeState {
  return {
    ...state,
    battle: breakBattleConcentration(state.battle, spellCasterId),
    holes: [],
    pendingMovement: null,
    lastResult: "concentrationBroken",
  };
}

function spikeGrowthMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
): Extract<BattleFill, { readonly kind: "movement" }> {
  return movementFill(hole, {
    movementCostFeet,
    provokedOpportunityAttacks: [],
    areaDifficultTerrain: {
      kind: "areaDifficultTerrain",
      sources: [
        {
          kind: "spikeGrowthHazard",
          sourceCombatantId: spellCasterId,
          sourceSpellId: spikeGrowthUnitId,
          areaId: spikeGrowthAreaId,
          damageDistanceFeet: movementFeet(damageDistanceFeet),
        },
      ],
      totalDistanceFeet: movementFeet(movementTotalFeet),
      difficultTerrainDistanceFeet: movementFeet(difficultTerrainDistanceFeet),
    },
  });
}

function spikeGrowthProjection(
  state: SpikeGrowthRuntimeState,
): SpikeGrowthMovementHazardState {
  const caster = requireCombatant(state.battle, spellCasterId);
  const target = requireCombatant(state.battle, spellTargetId);
  const hazard = caster.activeEffects.find(
    (effect): effect is SpikeGrowthHazardEffect =>
      effect.kind === "spikeGrowthHazard" &&
      effect.sourceSpellId === spikeGrowthUnitId &&
      effect.sourceCombatantId === spellCasterId &&
      effect.areaId === spikeGrowthAreaId,
  );
  const projection = {
    currentTurnRole: state.currentTurnRole,
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: spikeGrowthUnitId,
        slotLevel: 2,
      }) !== undefined,
    hazardActive: hazard !== undefined,
    casterConcentrating:
      caster.concentration?.sourceSpellId === spikeGrowthUnitId &&
      caster.concentration.effectKind === "spellEffect",
    targetHp: Number(target.hp),
    movementSpentFeet: Number(target.movementSpentFeet),
    holes: battleHolesToSpikeGrowthHoles(state.holes),
    lastResult: state.lastResult,
  };
  expect(projection.casterConcentrating).toBe(projection.hazardActive);
  return projection;
}

function battleHolesToSpikeGrowthHoles(
  holes: readonly BattleHole[],
): readonly SpikeGrowthHole[] {
  return holes
    .map((hole): SpikeGrowthHole => {
      if (hole.kind === "rolledDice" && "spikeGrowthMovement" in hole) {
        return "MovementDamage";
      }
      throw new Error(`Unexpected Spike Growth hole ${hole.kind}.`);
    })
    .sort();
}

function normalizeSpikeGrowthQuintState(
  raw: unknown,
): SpikeGrowthMovementHazardState {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "",
    decodeHole: spikeGrowthHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  const scenarioResult = spikeGrowthLastResult(state["qScenarioOutcome"]);
  assertWitnessProtocolConsistentWithScenario({
    label: "Spike Growth movement hazard",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    currentTurnRole: spikeGrowthTurnRole(state["qCurrentTurnRole"]),
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    hazardActive: booleanField(state, "qHazardActive"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    holes: protocol.holes,
    lastResult: scenarioResult,
  };
}

function compareSpikeGrowthStates(
  runtime: SpikeGrowthMovementHazardState,
  quint: SpikeGrowthMovementHazardState,
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

function spikeGrowthTurnRole(raw: unknown): SpikeGrowthTurnRole {
  if (raw === "caster" || raw === "target") return raw;
  throw new Error(`Unknown Spike Growth turn role: ${String(raw)}.`);
}

function spikeGrowthHole(raw: unknown): SpikeGrowthHole {
  if (raw === "MovementDamage") return raw;
  throw new Error(`Unknown Spike Growth hole: ${String(raw)}.`);
}

function spikeGrowthLastResult(raw: unknown): SpikeGrowthLastResult {
  return quintVariantMappedValue(
    raw,
    "qScenarioOutcome",
    SPIKE_GROWTH_LAST_RESULT_BY_SCENARIO_OUTCOME_TAG,
    "Spike Growth result",
  );
}
