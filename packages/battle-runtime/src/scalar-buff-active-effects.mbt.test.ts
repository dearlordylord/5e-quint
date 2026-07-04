// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.scalar-buff
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Aid:
//   targets' Hit Point maximum and current Hit Points increase for the
//   duration.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#False Life:
//   the caster gains rolled Temporary Hit Points.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Longstrider:
//   the target's Speed increases by 10 feet until the spell ends.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield of Faith:
//   a creature gains a +2 AC bonus for the Concentration duration.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Spider Climb:
//   a willing target gains a Climb Speed equal to its Speed.
// - .references/srd-5.2.1/Playing-the-Game.md#Temporary Hit Points and
//   Rules-Glossary.md#Speed:
//   Temporary Hit Points are a non-stacking buffer; special speeds are
//   separate movement modes affected by Speed changes.
// - UBIQUITOUS_LANGUAGE.md: Armor Class, Speed, Hit Point Maximum, Temporary
//   Hit Points, Spell Invocation, and Spell Effect.
import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeReducerRoute,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  quintVariantMappedValue,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";
import { describe, expect, it } from "vitest";

import {
  battleReducerStartRouteEvent,
  resolveBattleSubject,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleCreatureSnapshot,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import {
  aidUnitId,
  falseLifeUnitId,
  longstriderUnitId,
  shieldOfFaithUnitId,
  spellCasterId,
  spellTargetId,
  spiderClimbUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetFill,
  spellAct,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";

const LAST_RESULTS = [
  "init",
  "shieldOfFaith",
  "longstrider",
  "spiderClimb",
  "aid",
  "falseLife",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  ShieldOfFaith: "shieldOfFaith",
  Longstrider: "longstrider",
  SpiderClimb: "spiderClimb",
  Aid: "aid",
  FalseLife: "falseLife",
} as const satisfies Readonly<Record<string, LastResult>>;
const RESULT_SOURCE_SPELL_IDS = {
  init: null,
  shieldOfFaith: shieldOfFaithUnitId,
  longstrider: longstriderUnitId,
  spiderClimb: spiderClimbUnitId,
  aid: aidUnitId,
  falseLife: falseLifeUnitId,
} as const satisfies Readonly<Record<LastResult, string | null>>;

type ScalarBuffActiveEffectsProjection = {
  readonly affectedArmorClass: number;
  readonly affectedSpeedFeet: number;
  readonly affectedClimbSpeedFeet: number;
  readonly affectedHitPointMaximum: number;
  readonly affectedHitPoints: number;
  readonly affectedTemporaryHitPoints: number;
  readonly armorClassBonusActive: boolean;
  readonly speedDeltaActive: boolean;
  readonly specialSpeedGrantActive: boolean;
  readonly hitPointMaximumIncreaseActive: boolean;
  readonly casterConcentrating: boolean;
  readonly lastResult: LastResult;
};

type ScalarBuffRuntimeState = {
  readonly projection: ScalarBuffActiveEffectsProjection;
};

type ScalarBuffResolvedCast = {
  readonly state: BattleState;
  readonly affectedId: CombatantId;
  readonly routeEvents: readonly BattleReducerRouteEvent[];
};

const SCALAR_BUFF_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  ArmorClassBonusActiveEffectRouteSurface:
    "armorClassBonusActiveEffect",
  SpeedDeltaActiveEffectRouteSurface: "speedDeltaActiveEffect",
  SpecialSpeedGrantActiveEffectRouteSurface:
    "specialSpeedGrantActiveEffect",
  HitPointMaximumIncreaseActiveEffectRouteSurface:
    "hitPointMaximumIncreaseActiveEffect",
  TemporaryHitPointEffectRouteSurface: "temporaryHitPointEffect",
} as const satisfies Readonly<Record<string, string>>;
type ScalarBuffRouteSurface =
  (typeof SCALAR_BUFF_ROUTE_SURFACE_BY_TAG)[keyof typeof SCALAR_BUFF_ROUTE_SURFACE_BY_TAG];

type ScalarBuffRouteRuntimeState = {
  readonly surface: ScalarBuffRouteSurface;
  readonly route: readonly ReducerRouteEvent[];
};

type ScalarBuffRouteProjection = {
  readonly surface: ScalarBuffRouteSurface;
  readonly route: readonly ReducerRouteEvent[];
};

const driverSchema = {
  init: {},
  doCastShieldOfFaith: {},
  doCastLongstrider: {},
  doCastSpiderClimb: {},
  doCastAid: {},
  doCastFalseLife: {},
  doStutter: {},
  step: {},
} as const;

function createScalarBuffActiveEffectsDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastShieldOfFaith: () => {
        state = castShieldOfFaith();
      },
      doCastLongstrider: () => {
        state = castLongstrider();
      },
      doCastSpiderClimb: () => {
        state = castSpiderClimb();
      },
      doCastAid: () => {
        state = castAid();
      },
      doCastFalseLife: () => {
        state = castFalseLife();
      },
      doStutter: () => {},
      step: () => {},
      getState: () => state.projection,
    };
  });
}

function createScalarBuffActiveEffectsRouteDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRouteRuntimeState();
    return {
      init: () => {
        state = initialRouteRuntimeState();
      },
      doCastShieldOfFaith: () => {
        state = appendScalarBuffRoute(
          state,
          "armorClassBonusActiveEffect",
          resolveShieldOfFaithCast().routeEvents,
        );
      },
      doCastLongstrider: () => {
        state = appendScalarBuffRoute(
          state,
          "speedDeltaActiveEffect",
          resolveLongstriderCast().routeEvents,
        );
      },
      doCastSpiderClimb: () => {
        state = appendScalarBuffRoute(
          state,
          "specialSpeedGrantActiveEffect",
          resolveSpiderClimbCast().routeEvents,
        );
      },
      doCastAid: () => {
        state = appendScalarBuffRoute(
          state,
          "hitPointMaximumIncreaseActiveEffect",
          resolveAidCast().routeEvents,
        );
      },
      doCastFalseLife: () => {
        state = appendScalarBuffRoute(
          state,
          "temporaryHitPointEffect",
          resolveFalseLifeCast().routeEvents,
        );
      },
      doStutter: () => {},
      step: () => {},
      getState: () => state,
    };
  });
}

const scalarBuffActiveEffectsStateCheck = stateCheck(
  normalizeScalarBuffQuintState,
  compareScalarBuffStates,
);

const scalarBuffRouteStateCheck = stateCheck(
  normalizeScalarBuffRouteQuintState,
  compareScalarBuffRouteStates,
);

describe("scalar buff active-effects MBT parity", () => {
  it("projects representative scalar buff active effects from existing spell profiles", () => {
    expect(castShieldOfFaith().projection).toMatchObject({
      affectedArmorClass: 12,
      armorClassBonusActive: true,
      casterConcentrating: true,
      lastResult: "shieldOfFaith",
    });
    expect(castLongstrider().projection).toMatchObject({
      affectedSpeedFeet: 40,
      speedDeltaActive: true,
      lastResult: "longstrider",
    });
    expect(castSpiderClimb().projection).toMatchObject({
      affectedClimbSpeedFeet: 30,
      specialSpeedGrantActive: true,
      casterConcentrating: true,
      lastResult: "spiderClimb",
    });
    expect(castAid().projection).toMatchObject({
      affectedHitPointMaximum: 17,
      affectedHitPoints: 17,
      hitPointMaximumIncreaseActive: true,
      lastResult: "aid",
    });
    expect(castFalseLife().projection).toMatchObject({
      affectedTemporaryHitPoints: 9,
      lastResult: "falseLife",
    });
  });

  it(
    "matches the focused scalar buff active-effects slice against bounded MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-scalar-buff-active-effects.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createScalarBuffActiveEffectsDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: scalarBuffActiveEffectsStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "observes scalar buff active-effect qRoute through public reducer entrypoints",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-scalar-buff-active-effects.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createScalarBuffActiveEffectsRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: scalarBuffRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): ScalarBuffRuntimeState {
  return {
    projection: {
      affectedArmorClass: 10,
      affectedSpeedFeet: 30,
      affectedClimbSpeedFeet: 0,
      affectedHitPointMaximum: 12,
      affectedHitPoints: 12,
      affectedTemporaryHitPoints: 0,
      armorClassBonusActive: false,
      speedDeltaActive: false,
      specialSpeedGrantActive: false,
      hitPointMaximumIncreaseActive: false,
      casterConcentrating: false,
      lastResult: "init",
    },
  };
}

function initialRouteRuntimeState(): ScalarBuffRouteRuntimeState {
  const battle = spellBattle({});
  return {
    surface: "fresh",
    route: [battleReducerStartRouteEvent(battle)],
  };
}

function appendScalarBuffRoute(
  state: ScalarBuffRouteRuntimeState,
  surface: ScalarBuffRouteSurface,
  routeEvents: readonly BattleReducerRouteEvent[],
): ScalarBuffRouteRuntimeState {
  return {
    surface,
    route: [...state.route, ...routeEvents],
  };
}

function castShieldOfFaith(): ScalarBuffRuntimeState {
  const resolved = resolveShieldOfFaithCast();
  return projectScalarBuffState(
    resolved.state,
    resolved.affectedId,
    "shieldOfFaith",
  );
}

function resolveShieldOfFaithCast(): ScalarBuffResolvedCast {
  const state = spellBattle({
    preparedSpells: [spellRecord(shieldOfFaithUnitId)],
  });
  const act = bonusSpellAct({ state, spellId: shieldOfFaithUnitId });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          shieldOfFaithUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    }),
    "Expected Shield of Faith to resolve.",
  );
  return scalarBuffResolvedCast(act, resolved, spellTargetId);
}

function castLongstrider(): ScalarBuffRuntimeState {
  const resolved = resolveLongstriderCast();
  return projectScalarBuffState(
    resolved.state,
    resolved.affectedId,
    "longstrider",
  );
}

function resolveLongstriderCast(): ScalarBuffResolvedCast {
  const state = spellBattle({
    preparedSpells: [spellRecord(longstriderUnitId)],
  });
  const act = spellAct({ state, spellId: longstriderUnitId, slotLevel: 1 });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          longstriderUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    }),
    "Expected Longstrider to resolve.",
  );
  return scalarBuffResolvedCast(act, resolved, spellTargetId);
}

function castSpiderClimb(): ScalarBuffRuntimeState {
  const resolved = resolveSpiderClimbCast();
  return projectScalarBuffState(
    resolved.state,
    resolved.affectedId,
    "spiderClimb",
  );
}

function resolveSpiderClimbCast(): ScalarBuffResolvedCast {
  const state = spellBattle({
    preparedSpells: [spellRecord(spiderClimbUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const act = spellAct({ state, spellId: spiderClimbUnitId, slotLevel: 2 });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          spiderClimbUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    }),
    "Expected Spider Climb to resolve.",
  );
  return scalarBuffResolvedCast(act, resolved, spellCasterId);
}

function castAid(): ScalarBuffRuntimeState {
  const resolved = resolveAidCast();
  return projectScalarBuffState(resolved.state, resolved.affectedId, "aid");
}

function resolveAidCast(): ScalarBuffResolvedCast {
  const state = spellBattle({
    preparedSpells: [spellRecord(aidUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const act = spellAct({ state, spellId: aidUnitId, slotLevel: 2 });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetHole, spellCasterId, aidUnitId, [
          spellTargetId,
        ]),
      ],
    }),
    "Expected Aid to resolve.",
  );
  return scalarBuffResolvedCast(act, resolved, spellTargetId);
}

function castFalseLife(): ScalarBuffRuntimeState {
  const resolved = resolveFalseLifeCast();
  return projectScalarBuffState(
    resolved.state,
    resolved.affectedId,
    "falseLife",
  );
}

function resolveFalseLifeCast(): ScalarBuffResolvedCast {
  const state = spellBattle({
    preparedSpells: [spellRecord(falseLifeUnitId)],
  });
  const act = spellAct({ state, spellId: falseLifeUnitId, slotLevel: 1 });
  const rollHole = requireHole(act.initialHoles, "rolledDice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageRollFillWithGroups(rollHole, [[2, 3]])],
    }),
    "Expected False Life to resolve.",
  );
  return scalarBuffResolvedCast(act, resolved, spellCasterId);
}

function scalarBuffResolvedCast(
  act: AvailableBattleAct,
  resolved: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
  affectedId: CombatantId,
): ScalarBuffResolvedCast {
  return {
    state: resolved.state,
    affectedId,
    routeEvents: [
      ...requireScalarBuffActRouteEvents(act),
      ...requireScalarBuffResolutionRouteEvents(resolved),
    ],
  };
}

function requireScalarBuffActRouteEvents(
  act: AvailableBattleAct,
): readonly BattleReducerRouteEvent[] {
  if (act.routeEvents !== undefined && act.routeEvents.length > 0) {
    return act.routeEvents;
  }
  throw new Error("Expected public scalar buff route events on discovered act.");
}

function requireScalarBuffResolutionRouteEvents(
  result: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
): readonly BattleReducerRouteEvent[] {
  if (result.routeEvents !== undefined && result.routeEvents.length > 0) {
    return result.routeEvents;
  }
  throw new Error("Expected public scalar buff route events on resolution.");
}

function projectScalarBuffState(
  battle: BattleState,
  affectedId: CombatantId,
  lastResult: LastResult,
): ScalarBuffRuntimeState {
  const affected = requireCombatant(battle, affectedId);
  const caster = requireCombatant(battle, spellCasterId);
  const affectedSnapshot = requireSnapshotCombatant(battle, affectedId);
  const climbSpeed = affectedSnapshot.movement.speedKinds.find(
    (speed) => speed.kind === "climb",
  );
  const sourceSpellId = RESULT_SOURCE_SPELL_IDS[lastResult];
  return {
    projection: {
      affectedArmorClass: Number(affectedSnapshot.armorClass),
      affectedSpeedFeet: Number(affectedSnapshot.movement.speedFeet),
      affectedClimbSpeedFeet: Number(climbSpeed?.speedFeet ?? 0),
      affectedHitPointMaximum: Number(affectedSnapshot.maxHp),
      affectedHitPoints: Number(affectedSnapshot.hp),
      affectedTemporaryHitPoints: Number(affectedSnapshot.tempHp),
      armorClassBonusActive: affected.activeEffects.some(
        (effect) =>
          effect.kind === "spellArmorClassBonus" &&
          effect.sourceSpellId === sourceSpellId,
      ),
      speedDeltaActive: affected.activeEffects.some(
        (effect) =>
          effect.kind === "speedDelta" &&
          effect.sourceSpellId === sourceSpellId,
      ),
      specialSpeedGrantActive: affected.activeEffects.some(
        (effect) =>
          effect.kind === "specialSpeedGrant" &&
          effect.sourceSpellId === sourceSpellId,
      ),
      hitPointMaximumIncreaseActive: affected.activeEffects.some(
        (effect) =>
          effect.kind === "hitPointMaximumIncrease" &&
          effect.sourceSpellId === sourceSpellId,
      ),
      casterConcentrating:
        caster.concentration?.effectKind === "spellEffect" &&
        caster.concentration.sourceSpellId === sourceSpellId,
      lastResult,
    },
  };
}

function requireSnapshotCombatant(
  battle: BattleState,
  combatantId: CombatantId,
): BattleCreatureSnapshot {
  const combatant = snapshotBattle(battle).combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  expect(combatant).toBeDefined();
  if (combatant === undefined) {
    throw new Error(`Expected snapshot combatant ${combatantId}.`);
  }
  return combatant;
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

function normalizeScalarBuffQuintState(
  raw: unknown,
): ScalarBuffActiveEffectsProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = lastResult(state["scenarioOutcome"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: scalarBuffActiveEffectsUnexpectedHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "scalar buff active effects",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    affectedArmorClass: numberFromQuintInt(
      state["affectedArmorClass"],
      "qState.affectedArmorClass",
    ),
    affectedSpeedFeet: numberFromQuintInt(
      state["affectedSpeedFeet"],
      "qState.affectedSpeedFeet",
    ),
    affectedClimbSpeedFeet: numberFromQuintInt(
      state["affectedClimbSpeedFeet"],
      "qState.affectedClimbSpeedFeet",
    ),
    affectedHitPointMaximum: numberFromQuintInt(
      state["affectedHitPointMaximum"],
      "qState.affectedHitPointMaximum",
    ),
    affectedHitPoints: numberFromQuintInt(
      state["affectedHitPoints"],
      "qState.affectedHitPoints",
    ),
    affectedTemporaryHitPoints: numberFromQuintInt(
      state["affectedTemporaryHitPoints"],
      "qState.affectedTemporaryHitPoints",
    ),
    armorClassBonusActive: booleanField(state, "armorClassBonusActive"),
    speedDeltaActive: booleanField(state, "speedDeltaActive"),
    specialSpeedGrantActive: booleanField(state, "specialSpeedGrantActive"),
    hitPointMaximumIncreaseActive: booleanField(
      state,
      "hitPointMaximumIncreaseActive",
    ),
    casterConcentrating: booleanField(state, "casterConcentrating"),
    lastResult: scenarioResult,
  };
}

function normalizeScalarBuffRouteQuintState(
  raw: unknown,
): ScalarBuffRouteProjection {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      quintField(state, "qSurface"),
      "qSurface",
      SCALAR_BUFF_ROUTE_SURFACE_BY_TAG,
      "scalar-buff active-effects route surface",
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareScalarBuffStates(
  runtime: ScalarBuffActiveEffectsProjection,
  quint: ScalarBuffActiveEffectsProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}

function compareScalarBuffRouteStates(
  runtime: ScalarBuffRouteProjection,
  quint: ScalarBuffRouteProjection,
): boolean {
  try {
    expect(runtime).toStrictEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\nruntime=${JSON.stringify(runtime)}\nquint=${JSON.stringify(quint)}`,
      );
    }
    throw error;
  }
  return true;
}

function lastResult(raw: unknown): LastResult {
  const tag = quintVariantTag(raw, "qState.scenarioOutcome");
  if (isScenarioOutcomeTag(tag)) return SCENARIO_OUTCOME_BY_TAG[tag];
  throw new Error(`Unexpected scenario outcome variant ${tag}.`);
}

function isScenarioOutcomeTag(
  tag: string,
): tag is keyof typeof SCENARIO_OUTCOME_BY_TAG {
  return Object.hasOwn(SCENARIO_OUTCOME_BY_TAG, tag);
}


function scalarBuffActiveEffectsUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Scalar buff active-effects witness does not expect holes; received ${String(raw)}.`,
  );
}
