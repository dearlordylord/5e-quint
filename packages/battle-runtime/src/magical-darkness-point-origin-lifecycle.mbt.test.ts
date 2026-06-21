// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-magical-darkness-point-origin
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Darkness:
//   magical Darkness spreads from a point within range and fills a
//   15-foot-radius Sphere; Darkvision cannot see through it, nonmagical light
//   cannot illuminate it, overlapping spell-created Bright Light or Dim Light
//   from level 2 or lower is dispelled, and the duration is Concentration up to
//   10 minutes.
// - .references/srd-5.2.1/Rules-Glossary.md#Darkness and #Darkvision:
//   Darkness is Heavily Obscured, and magical Darkness blocks Darkvision when a
//   spell says so.
// - UBIQUITOUS_LANGUAGE.md: Area of Effect, Concentration, Illumination,
//   Obscurement, Darkvision, and Spell Slot.
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  defineDriver,
  decodeWitnessProtocolState,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintStateRecord,
  quintVariantTag,
  quintRecordField,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import {
  spellCasterId,
  spellTargetId,
  darknessUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  battleMagicalDarknessNonmagicalLightIllumination,
  battleMagicalDarknessSightObscurement,
  battleObjectId,
  battleObscurementZones,
  breakBattleConcentration,
  resolveBattleSubject,
  type BattleActiveEffect,
  type BattleAreaId,
  type BattleFill,
  type BattleHole,
  type BattleMagicalDarknessZone,
  type BattleResolutionResult,
  type BattleSpellAreaOriginAnchor,
  type BattleState,
  type BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";

const LAST_RESULTS = [
  "init",
  "castWithAreaAndLightWitnesses",
  "concentrationCleaned",
  "durationCleaned",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, LastResult>
> = {
  Init: "init",
  CastWithAreaAndLightWitnesses: "castWithAreaAndLightWitnesses",
  ConcentrationCleaned: "concentrationCleaned",
  DurationCleaned: "durationCleaned",
};

const WITNESS_RESULTS = ["none", "heavilyObscured", "darkness"] as const;
type WitnessResult = (typeof WITNESS_RESULTS)[number];
const WITNESS_RESULT_SET: ReadonlySet<string> = new Set(WITNESS_RESULTS);
type DarknessProjection = {
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly darknessActive: boolean;
  readonly zoneProjected: boolean;
  readonly casterConcentrating: boolean;
  readonly ordinarySightObscurement: WitnessResult;
  readonly darkvisionSightObscurement: WitnessResult;
  readonly nonmagicalLightIllumination: WitnessResult;
  readonly overlappingLowLevelSpellLightActive: boolean;
  readonly overlappingHighLevelSpellLightActive: boolean;
  readonly nonOverlappingLowLevelSpellLightActive: boolean;
  readonly lastResult: LastResult;
};

type DarknessRuntimeState = {
  readonly battle: BattleState;
  readonly lastResult: LastResult;
};

const DARKNESS_DURATION_TICKS = elapsedTimeTicks(100);
const DARKNESS_AREA_ID = battleAreaId("focused-darkness-area");
const OVERLAPPING_LOW_LEVEL_LIGHT_ID = battleSpellEffectOccurrenceId(
  "focused-darkness-overlapping-level-two-light",
);
const OVERLAPPING_HIGH_LEVEL_LIGHT_ID = battleSpellEffectOccurrenceId(
  "focused-darkness-overlapping-level-three-light",
);
const NON_OVERLAPPING_LOW_LEVEL_LIGHT_ID = battleSpellEffectOccurrenceId(
  "focused-darkness-non-overlapping-level-two-light",
);

const driverSchema = {
  init: {},
  doCastWithAreaAndLightWitnesses: {},
  doBreakConcentration: {},
  doExpireDuration: {},
  doStutter: {},
  step: {},
} as const;

function createMagicalDarknessPointOriginLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastWithAreaAndLightWitnesses: () => {
        state = castWithAreaAndLightWitnesses(state);
      },
      doBreakConcentration: () => {
        state = breakDarknessConcentration(state);
      },
      doExpireDuration: () => {
        state = expireDarknessDuration(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => darknessProjection(state),
    };
  });
}

const darknessStateCheck = stateCheck(
  normalizeDarknessQuintState,
  compareDarknessStates,
);

describe("Magical Darkness point-origin lifecycle MBT parity", () => {
  it("casts a point-origin magical Darkness zone and consumes caller-supplied light overlap witnesses", () => {
    const cast = castWithAreaAndLightWitnesses(initialRuntimeState());

    expect(darknessProjection(cast)).toMatchObject({
      actionAvailable: false,
      spellAvailable: false,
      darknessActive: true,
      zoneProjected: true,
      casterConcentrating: true,
      ordinarySightObscurement: "heavilyObscured",
      darkvisionSightObscurement: "heavilyObscured",
      nonmagicalLightIllumination: "darkness",
      overlappingLowLevelSpellLightActive: false,
      overlappingHighLevelSpellLightActive: true,
      nonOverlappingLowLevelSpellLightActive: true,
      lastResult: "castWithAreaAndLightWitnesses",
    });
  });

  it("removes the active Darkness zone when Concentration ends", () => {
    const cleaned = breakDarknessConcentration(
      castWithAreaAndLightWitnesses(initialRuntimeState()),
    );

    expect(darknessProjection(cleaned)).toMatchObject({
      darknessActive: false,
      zoneProjected: false,
      casterConcentrating: false,
      ordinarySightObscurement: "none",
      darkvisionSightObscurement: "none",
      nonmagicalLightIllumination: "none",
      overlappingHighLevelSpellLightActive: true,
      nonOverlappingLowLevelSpellLightActive: true,
      lastResult: "concentrationCleaned",
    });
  });

  it("removes the active Darkness zone when its duration expires", () => {
    const cleaned = expireDarknessDuration(
      castWithAreaAndLightWitnesses(initialRuntimeState()),
    );

    expect(darknessProjection(cleaned)).toMatchObject({
      darknessActive: false,
      zoneProjected: false,
      casterConcentrating: false,
      overlappingHighLevelSpellLightActive: true,
      nonOverlappingLowLevelSpellLightActive: true,
      lastResult: "durationCleaned",
    });
  });

  it(
    "matches the focused magical Darkness point-origin lifecycle against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-magical-darkness-point-origin-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createMagicalDarknessPointOriginLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: darknessStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): DarknessRuntimeState {
  return {
    battle: {
      ...spellBattle({
        preparedSpells: [spellRecord(darknessUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      lightEmitters: [
        trackedObjectSpellLightEmitter({
          sourceEffectId: OVERLAPPING_LOW_LEVEL_LIGHT_ID,
          sourceSpellLevel: 2,
          objectId: "focused-darkness-overlapping-level-two-object",
        }),
        trackedObjectSpellLightEmitter({
          sourceEffectId: OVERLAPPING_HIGH_LEVEL_LIGHT_ID,
          sourceSpellLevel: 3,
          objectId: "focused-darkness-overlapping-level-three-object",
        }),
        trackedObjectSpellLightEmitter({
          sourceEffectId: NON_OVERLAPPING_LOW_LEVEL_LIGHT_ID,
          sourceSpellLevel: 2,
          objectId: "focused-darkness-non-overlapping-level-two-object",
        }),
      ],
    },
    lastResult: "init",
  };
}

function castWithAreaAndLightWitnesses(
  state: DarknessRuntimeState,
): DarknessRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: darknessUnitId,
    slotLevel: 2,
  });
  const area = requireSpellAreaChoiceHole(act.initialHoles);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        magicalDarknessAreaFill(area, DARKNESS_AREA_ID, [
          {
            kind: "spellCreatedLightOverlapsArea",
            sourceEffectId: OVERLAPPING_LOW_LEVEL_LIGHT_ID,
          },
        ]),
      ],
    }),
    "Expected Darkness cast to resolve.",
  );
  return {
    battle: resolved.state,
    lastResult: "castWithAreaAndLightWitnesses",
  };
}

function breakDarknessConcentration(
  state: DarknessRuntimeState,
): DarknessRuntimeState {
  return {
    battle: breakBattleConcentration(state.battle, spellCasterId),
    lastResult: "concentrationCleaned",
  };
}

function expireDarknessDuration(
  state: DarknessRuntimeState,
): DarknessRuntimeState {
  const expiring = darknessWithDurationTicks(state.battle, elapsedTimeTicks(1));
  return {
    battle: {
      ...expiring,
      combatants: tickDurationEffects(expiring.combatants).value,
    },
    lastResult: "durationCleaned",
  };
}

function darknessProjection(state: DarknessRuntimeState): DarknessProjection {
  const caster = requireCombatant(state.battle, spellCasterId);
  const zone = magicalDarknessZone(state.battle);
  const activeEffect = magicalDarknessActiveEffect(state.battle);
  return {
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: darknessUnitId,
        slotLevel: 2,
      }) !== undefined,
    darknessActive: activeEffect !== undefined,
    zoneProjected: zone !== undefined,
    casterConcentrating:
      caster.concentration?.sourceSpellId === darknessUnitId &&
      caster.concentration.effectKind === "spellEffect",
    ordinarySightObscurement:
      zone === undefined
        ? "none"
        : (battleMagicalDarknessSightObscurement(zone, {
            kind: "sightThroughArea",
            areaId: DARKNESS_AREA_ID,
          }) ?? "none"),
    darkvisionSightObscurement:
      zone === undefined
        ? "none"
        : (battleMagicalDarknessSightObscurement(
            zone,
            {
              kind: "sightThroughArea",
              areaId: DARKNESS_AREA_ID,
            },
            {
              kind: "darkvision",
              rangeFeet: movementFeet(60),
              distanceFeet: movementFeet(30),
            },
          ) ?? "none"),
    nonmagicalLightIllumination:
      zone === undefined
        ? "none"
        : (battleMagicalDarknessNonmagicalLightIllumination(zone, {
            kind: "nonmagicalLightInArea",
            areaId: DARKNESS_AREA_ID,
          }) ?? "none"),
    overlappingLowLevelSpellLightActive: spellLightEmitterActive(
      state.battle,
      OVERLAPPING_LOW_LEVEL_LIGHT_ID,
    ),
    overlappingHighLevelSpellLightActive: spellLightEmitterActive(
      state.battle,
      OVERLAPPING_HIGH_LEVEL_LIGHT_ID,
    ),
    nonOverlappingLowLevelSpellLightActive: spellLightEmitterActive(
      state.battle,
      NON_OVERLAPPING_LOW_LEVEL_LIGHT_ID,
    ),
    lastResult: state.lastResult,
  };
}

function magicalDarknessAreaFill(
  hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>,
  areaId: BattleAreaId,
  spellCreatedLightOverlaps: Extract<
    Extract<BattleFill, { readonly kind: "spellAreaChoice" }>["value"],
    { readonly kind: "magicalDarknessArea" }
  >["spellCreatedLightOverlaps"],
  originAnchor: BattleSpellAreaOriginAnchor = { kind: "tableSelectedPoint" },
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: {
      kind: "magicalDarknessArea",
      areaId,
      originAnchor,
      spellCreatedLightOverlaps,
    },
  };
}

function trackedObjectSpellLightEmitter(input: {
  readonly sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
  readonly sourceSpellLevel: number;
  readonly objectId: string;
}): BattleTrackedOngoingSpellLightEmitter {
  const sourceSpellLevel = parseBattleSpellEffectLevel(input.sourceSpellLevel);
  if (sourceSpellLevel === null) {
    throw new Error(
      `Invalid test spell effect level ${input.sourceSpellLevel}.`,
    );
  }
  return {
    kind: "spellLightEmitter",
    sourceSpellId: "synthetic_spell_light",
    sourceCombatantId: spellTargetId,
    sourceEffectId: input.sourceEffectId,
    sourceSpellLevel,
    attachment: {
      kind: "object",
      objectId: battleObjectId(input.objectId),
    },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: { kind: "untilDispelled" },
  };
}

function requireSpellAreaChoiceHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "spellAreaChoice" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<BattleHole, { readonly kind: "spellAreaChoice" }> =>
      candidate.kind === "spellAreaChoice",
  );
  expect(hole).toMatchObject({
    area: { kind: "pointOriginSphere", radiusFeet: movementFeet(15) },
  });
  if (hole === undefined) {
    throw new Error("Expected Darkness point-origin Sphere area choice hole.");
  }
  return hole;
}

function magicalDarknessZone(
  state: BattleState,
): BattleMagicalDarknessZone | undefined {
  return battleObscurementZones(state).find(
    (zone): zone is BattleMagicalDarknessZone =>
      zone.kind === "spellMagicalDarknessZone",
  );
}

function magicalDarknessActiveEffect(
  state: BattleState,
):
  | Extract<BattleActiveEffect, { readonly kind: "magicalDarknessPointOrigin" }>
  | undefined {
  const caster = requireCombatant(state, spellCasterId);
  return caster.activeEffects.find(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "magicalDarknessPointOrigin" }
    > =>
      effect.kind === "magicalDarknessPointOrigin" &&
      effect.areaId === DARKNESS_AREA_ID &&
      effect.radiusFeet === movementFeet(15) &&
      effect.expiresAt.kind === "concentration" &&
      effect.expiresAt.combatantId === spellCasterId &&
      effect.expiresAt.durationTicks === DARKNESS_DURATION_TICKS,
  );
}

function spellLightEmitterActive(
  state: BattleState,
  sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>,
): boolean {
  return state.lightEmitters.some(
    (emitter) =>
      emitter.kind === "spellLightEmitter" &&
      "sourceEffectId" in emitter &&
      emitter.sourceEffectId === sourceEffectId,
  );
}

function darknessWithDurationTicks(
  state: BattleState,
  durationTicks: typeof DARKNESS_DURATION_TICKS,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  const combatants = new Map(state.combatants);
  combatants.set(spellCasterId, {
    ...caster,
    activeEffects: caster.activeEffects.map((effect) =>
      effect.kind === "magicalDarknessPointOrigin"
        ? {
            ...effect,
            expiresAt: { ...effect.expiresAt, durationTicks },
          }
        : effect,
    ),
  });
  return { ...state, combatants };
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

function normalizeDarknessQuintState(raw: unknown): DarknessProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: darknessUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Darkness point-origin witness holes to be empty.",
    );
  }
  const lastResultValue = lastResult(state["qScenarioOutcome"]);
  assertWitnessProtocolConsistentWithScenario({
    label: "Darkness point-origin lifecycle",
    scenarioOutcome: lastResultValue,
    protocol,
  });
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    darknessActive: booleanField(state, "qDarknessActive"),
    zoneProjected: booleanField(state, "qZoneProjected"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    ordinarySightObscurement: witnessResult(state["qOrdinarySightObscurement"]),
    darkvisionSightObscurement: witnessResult(
      state["qDarkvisionSightObscurement"],
    ),
    nonmagicalLightIllumination: witnessResult(
      state["qNonmagicalLightIllumination"],
    ),
    overlappingLowLevelSpellLightActive: booleanField(
      state,
      "qOverlappingLowLevelSpellLightActive",
    ),
    overlappingHighLevelSpellLightActive: booleanField(
      state,
      "qOverlappingHighLevelSpellLightActive",
    ),
    nonOverlappingLowLevelSpellLightActive: booleanField(
      state,
      "qNonOverlappingLowLevelSpellLightActive",
    ),
    lastResult: lastResultValue,
  };
}

function darknessUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Darkness point-origin witness does not expect holes; received ${String(raw)}.`,
  );
}

function compareDarknessStates(
  runtime: DarknessProjection,
  quint: DarknessProjection,
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

function witnessResult(raw: unknown): WitnessResult {
  if (typeof raw === "string" && WITNESS_RESULT_SET.has(raw)) {
    return raw as WitnessResult;
  }
  throw new Error(`Unknown Darkness witness result: ${String(raw)}.`);
}

function lastResult(raw: unknown): LastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value =
    MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(`Unknown Darkness result: ${tag}.`);
}
