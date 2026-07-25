import { battleObjectId } from "./identity.ts";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleActSpellPresentation,
  battleActSpellSlotPresentation,
  battleActDruidWildShapePresentation,
} from "./battle-act-composition.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.druid-wild-shape-known-form
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3MWILD-10-WILD-SHAPE-SELECTED-IDENTITY-AUDIT druid_wild_shape
// UNIT-IDENTITY-REPLAY: L3MWILD-10-WILD-SHAPE-SELECTED-IDENTITY-AUDIT druid_wild_shape doAssumeRidingHorse doReuseAsCat doDismissForm doIncapacitatedReversion doDeathReversion
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape:
//   Bonus Action known Beast form assumption, use spending, Temporary Hit
//   Points equal to Druid level, Beast stat-block projection, no spellcasting,
//   reuse replacement, Bonus Action dismissal, and ending on Incapacitated or
//   death. The Objects bullet says merged equipment has no effect while in that
//   form.
// - .references/srd-5.2.1/Rules-Glossary.md#Shape-Shifting:
//   shape-shifting effects specify their own form rules and revert on death.
// - UBIQUITOUS_LANGUAGE.md: Temporary Hit Points, Creature, Stat Block,
//   Character Sheet, and Action Lifecycle.
import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { describe, expect, it } from "vitest";

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
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  combatantId,
  damageRollFillWithGroups,
  heavyArmorClassState,
  requireNeedsHoles,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  spellRecord,
  startBattleSessionRight,
  statBlockCatalog,
  targetFill,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  activeDruidWildShapeEffect,
  activeDruidWildShapeForm,
  battleReducerStartRouteEvent,
  combatantD20AbilityModifier,
  combatantD20ProficiencyBonus,
  combatantHasActiveDruidWildShape,
  discoverBattleActs,
  snapshotBattle,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type CharacterBattleCreatureState,
} from "./index.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";

const ACTIVE_FORMS = ["trueForm", "ridingHorse", "cat"] as const;
type ActiveForm = (typeof ACTIVE_FORMS)[number];
const CREATURE_SIZES = ["tiny", "medium", "large"] as const;
type CreatureSize = (typeof CREATURE_SIZES)[number];
type LastResult =
  | "init"
  | "assumedRidingHorse"
  | "nextTurn"
  | "reusedCat"
  | "dismissed"
  | "incapacitated"
  | "dead";
const DRUID_STATUSES = ["able", "incapacitated", "dead"] as const;
type DruidStatus = (typeof DRUID_STATUSES)[number];

type DruidWildShapeFormLifecycleProjection = {
  readonly activeForm: ActiveForm;
  readonly bonusActionAvailable: boolean;
  readonly usesRemaining: number;
  readonly tempHp: number;
  readonly armorClass: number;
  readonly creatureSize: CreatureSize;
  readonly speedFeet: number;
  readonly shoveDc: number;
  readonly spellAvailable: boolean;
  readonly activeFormEffectCount: number;
  readonly mergedEquipmentCount: number;
  readonly druidAlive: boolean;
  readonly lastResult: LastResult;
};

const DRUID_WILD_SHAPE_FORM_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, LastResult>
> = {
  Init: "init",
  AssumedRidingHorse: "assumedRidingHorse",
  NextTurn: "nextTurn",
  ReusedCat: "reusedCat",
  Dismissed: "dismissed",
  FormIncapacitated: "incapacitated",
  FormDead: "dead",
} as const;

type DruidWildShapeFormLifecycleRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly lastResult: LastResult;
};
type AvailableBattleAct = ReturnType<typeof discoverBattleActs>[number];
type DruidWildShapeAvailableAct = Omit<AvailableBattleAct, "subject"> & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "druidWildShape" }
  >;
};
type ActionSpellAvailableAct = Omit<AvailableBattleAct, "subject"> & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
};

const druidId = combatantId("wild-shape-form-lifecycle-mbt-druid");
const opponentId = combatantId("wild-shape-form-lifecycle-mbt-opponent");
const ratId = "stat_block_rat";
const ridingHorseId = "stat_block_riding_horse";
const lizardId = "stat_block_lizard";
const catId = "stat_block_cat";
const selectedIdentityTaskId = "L3MWILD-10-WILD-SHAPE-SELECTED-IDENTITY-AUDIT";

const driverSchema = {
  init: {},
  doAssumeRidingHorse: {},
  doBeginNextTurn: {},
  doReuseAsCat: {},
  doDismissForm: {},
  doIncapacitatedReversion: {},
  doDeathReversion: {},
  doStutter: {},
  step: {},
} as const;

function createDruidWildShapeFormLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doAssumeRidingHorse: () => {
        state = assumeRidingHorse(state);
      },
      doBeginNextTurn: () => {
        state = beginNextTurn(state);
      },
      doReuseAsCat: () => {
        state = reuseAsCat(state);
      },
      doDismissForm: () => {
        state = dismissForm(state);
      },
      doIncapacitatedReversion: () => {
        state = applyIncapacitatedReversion(state);
      },
      doDeathReversion: () => {
        state = applyDeathReversion(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => druidWildShapeFormProjection(state),
    };
  });
}

const druidWildShapeFormStateCheck = stateCheck(
  normalizeDruidWildShapeFormQuintState,
  compareDruidWildShapeFormStates,
);

describe("Druid Wild Shape form lifecycle MBT parity", () => {
  it("spends a use, grants Temporary Hit Points, projects Beast statistics, and blocks spellcasting", () => {
    const assumed = assumeRidingHorse(initialRuntimeState());

    expect(druidWildShapeFormProjection(assumed)).toMatchObject({
      activeForm: "ridingHorse",
      bonusActionAvailable: false,
      usesRemaining: 1,
      tempHp: 2,
      armorClass: 11,
      creatureSize: "large",
      speedFeet: 60,
      shoveDc: 13,
      spellAvailable: false,
      activeFormEffectCount: 1,
      mergedEquipmentCount: 2,
      druidAlive: true,
      lastResult: "assumedRidingHorse",
    });
  });

  it("reuses Wild Shape to replace the active form and keeps one active form effect", () => {
    const reused = reuseAsCat(
      beginNextTurn(assumeRidingHorse(initialRuntimeState())),
    );

    expect(druidWildShapeFormProjection(reused)).toMatchObject({
      activeForm: "cat",
      bonusActionAvailable: false,
      usesRemaining: 0,
      tempHp: 2,
      armorClass: 12,
      creatureSize: "tiny",
      speedFeet: 40,
      shoveDc: 6,
      spellAvailable: false,
      activeFormEffectCount: 1,
      mergedEquipmentCount: 2,
      lastResult: "reusedCat",
    });
  });

  it("reverts from supported ending conditions", () => {
    const active = assumeRidingHorse(initialRuntimeState());
    const dismissed = dismissForm(beginNextTurn(active));
    const incapacitatedReplay = resolveIncapacitatedReversionWithRoute(active);
    const deathReplay = resolveDeathReversionWithRoute(active);
    const incapacitated = incapacitatedReplay.state;
    const dead = deathReplay.state;

    expect(druidWildShapeFormProjection(dismissed)).toMatchObject({
      activeForm: "trueForm",
      bonusActionAvailable: false,
      usesRemaining: 1,
      tempHp: 2,
      spellAvailable: true,
      activeFormEffectCount: 0,
      mergedEquipmentCount: 0,
      druidAlive: true,
      lastResult: "dismissed",
    });
    expect(druidWildShapeFormProjection(incapacitated)).toMatchObject({
      activeForm: "trueForm",
      bonusActionAvailable: true,
      tempHp: 2,
      speedFeet: 0,
      spellAvailable: false,
      activeFormEffectCount: 0,
      mergedEquipmentCount: 0,
      druidAlive: true,
      lastResult: "incapacitated",
    });
    expect(druidWildShapeFormProjection(dead)).toMatchObject({
      activeForm: "trueForm",
      bonusActionAvailable: true,
      tempHp: 0,
      speedFeet: 0,
      spellAvailable: false,
      activeFormEffectCount: 0,
      mergedEquipmentCount: 0,
      druidAlive: false,
      lastResult: "dead",
    });
    expect(routeSubjects(incapacitatedReplay.terminalRouteEvents)).toEqual(
      expect.arrayContaining(["saveGatedSpell", "activeFormLifecycle"]),
    );
    expect(routeSubjects(deathReplay.terminalRouteEvents)).toEqual(
      expect.arrayContaining(["spellAttackProcedure", "activeFormLifecycle"]),
    );
  });

  it(
    "matches the focused form lifecycle against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDruidWildShapeFormLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(5),
        stateCheck: druidWildShapeFormStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

type DruidWildShapeFormLifecycleRouteProjection = {
  readonly route: readonly ReducerRouteEvent[];
};

const druidWildShapeFormLifecycleRouteDriverSchema = {
  init: {},
  doAssumeForm: {},
  doBeginNextTurn: {},
  doReuseForm: {},
  doDismissForm: {},
  doIncapacitatedReversion: {},
  doDeathReversion: {},
  doStutter: {},
  step: {},
} as const;

describe("Druid Wild Shape form lifecycle route MBT", () => {
  it(
    "routes active form lifecycle through durable battle owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-druid-wild-shape-form-lifecycle.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDruidWildShapeFormLifecycleRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: druidWildShapeFormLifecycleRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createDruidWildShapeFormLifecycleRouteDriver() {
  return defineDriver<
    typeof druidWildShapeFormLifecycleRouteDriverSchema,
    DruidWildShapeFormLifecycleRouteProjection
  >(druidWildShapeFormLifecycleRouteDriverSchema, () => {
    let state = initialRuntimeState();
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      state = initialRuntimeState();
      route = [battleReducerStartRouteEvent()];
    }

    reset();

    return {
      init: reset,
      doAssumeForm: () => {
        const replay = resolveWildShapeSubjectWithRoute(
          state,
          ridingHorseId,
          "assumedRidingHorse",
        );
        state = replay.state;
        route = [
          ...route,
          ...activeFormLifecycleRouteEvents(replay.routeEvents),
        ];
      },
      doBeginNextTurn: () => {
        const replay = beginNextTurnWithRoute(state);
        state = replay.state;
        route = [
          ...route,
          ...activeFormLifecycleRouteEvents(replay.routeEvents),
        ];
      },
      doReuseForm: () => {
        const replay = resolveWildShapeSubjectWithRoute(
          state,
          catId,
          "reusedCat",
        );
        state = replay.state;
        route = [
          ...route,
          ...activeFormLifecycleRouteEvents(replay.routeEvents),
        ];
      },
      doDismissForm: () => {
        const replay = dismissFormWithRoute(state);
        state = replay.state;
        route = [
          ...route,
          ...activeFormLifecycleRouteEvents(replay.routeEvents),
        ];
      },
      doIncapacitatedReversion: () => {
        const replay = resolveIncapacitatedReversionWithRoute(state);
        state = replay.state;
        route = [
          ...route,
          ...activeFormLifecycleRouteEvents(replay.routeEvents),
        ];
      },
      doDeathReversion: () => {
        const replay = resolveDeathReversionWithRoute(state);
        state = replay.state;
        route = [
          ...route,
          ...activeFormLifecycleRouteEvents(replay.routeEvents),
        ];
      },
      doStutter: () => {},
      step: () => {},
      getState: () => ({ route }),
    };
  });
}

const druidWildShapeFormLifecycleRouteStateCheck = stateCheck(
  normalizeDruidWildShapeFormLifecycleRouteQuintState,
  compareDruidWildShapeFormLifecycleRouteStates,
);

function normalizeDruidWildShapeFormLifecycleRouteQuintState(
  raw: unknown,
): DruidWildShapeFormLifecycleRouteProjection {
  const state = quintStateRecord(raw);
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareDruidWildShapeFormLifecycleRouteStates(
  spec: DruidWildShapeFormLifecycleRouteProjection,
  impl: DruidWildShapeFormLifecycleRouteProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Druid Wild Shape selected identity replay",
  taskId: selectedIdentityTaskId,
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: DRUID_WILD_SHAPE_FORM_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    activeForm: "str",
    bonusActionAvailable: "bool",
    usesRemaining: "int",
    tempHp: "int",
    armorClass: "int",
    creatureSize: "str",
    speedFeet: "int",
    shoveDc: "int",
    spellAvailable: "bool",
    activeFormEffectCount: "int",
    mergedEquipmentCount: "int",
    druidAlive: "bool",
    lastResult: "variant",
  },
  normalizeQuintState: normalizeDruidWildShapeFormQuintState,
  initialProjection: expectedDruidWildShapeFormProjection(),
  units: [
    {
      unitId: "druid_wild_shape",
      procedures: [
        {
          actionName: "doAssumeRidingHorse",
          discover: () =>
            druidWildShapeFormProjection(
              assumeRidingHorse(initialRuntimeState()),
            ),
        },
        {
          actionName: "doReuseAsCat",
          discover: () =>
            druidWildShapeFormProjection(
              reuseAsCat(
                beginNextTurn(assumeRidingHorse(initialRuntimeState())),
              ),
            ),
        },
        {
          actionName: "doBeginNextTurn",
          project: (projection) =>
            projection.bonusActionAvailable
              ? projection
              : {
                  ...projection,
                  bonusActionAvailable: true,
                  lastResult: "nextTurn",
                },
          discover: () => undefined,
        },
        {
          actionName: "doDismissForm",
          discover: () =>
            druidWildShapeFormProjection(
              dismissForm(
                beginNextTurn(assumeRidingHorse(initialRuntimeState())),
              ),
            ),
        },
        {
          actionName: "doIncapacitatedReversion",
          discover: () =>
            druidWildShapeFormProjection(
              applyIncapacitatedReversion(
                assumeRidingHorse(initialRuntimeState()),
              ),
            ),
        },
        {
          actionName: "doDeathReversion",
          discover: () =>
            druidWildShapeFormProjection(
              applyDeathReversion(assumeRidingHorse(initialRuntimeState())),
            ),
        },
        {
          actionName: "doStutter",
          preservesProjection: true,
          discover: () => undefined,
        },
      ],
    },
  ],
});

function expectedDruidWildShapeFormProjection(
  overrides: Partial<DruidWildShapeFormLifecycleProjection> = {},
): DruidWildShapeFormLifecycleProjection {
  return {
    activeForm: "trueForm",
    bonusActionAvailable: true,
    usesRemaining: 2,
    tempHp: 0,
    armorClass: 16,
    creatureSize: "medium",
    speedFeet: 30,
    shoveDc: 13,
    spellAvailable: true,
    activeFormEffectCount: 0,
    mergedEquipmentCount: 0,
    druidAlive: true,
    lastResult: "init",
    ...overrides,
  };
}

function initialRuntimeState(): DruidWildShapeFormLifecycleRuntimeState {
  return {
    battle: startBattleSessionRight({
      battleId: battleId("druid-wild-shape-form-lifecycle-mbt"),
      combatants: [
        characterSeed({
          combatantId: druidId,
          displayName: "Druid",
          initiative: 20,
          classLevels: [{ className: "druid", level: 2 }],
          currentHp: 1,
          maxHp: 1,
          resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
          druidWildShapeAvailableForms: druidWildShapeAvailableForms(),
          armorClass: heavyArmorClassState(),
          selectedLoadout: {
            armor: {
              itemId: battleObjectId("armor:armor_chain_mail"),
              unitId: parseSharedUnitId("armor_chain_mail"),
            },
            weapon: {
              itemId: battleObjectId("main:weapon_quarterstaff"),
              unitId: parseSharedUnitId("weapon_quarterstaff"),
              grip: "one_handed",
            },
          },
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("produce_flame")],
              preparedSpells: [spellRecord("cure_wounds")],
            }),
            sourceClassName: "druid",
          },
        }),
        characterSeed({
          combatantId: opponentId,
          displayName: "Control Caster",
          initiative: 10,
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("fire_bolt")],
              preparedSpells: [spellRecord("hypnotic_pattern")],
              spellSlots: [{ spellLevel: 3, count: 1 }],
            }),
            sourceClassName: "wizard",
          },
        }),
      ],
    }),
    lastResult: "init",
  };
}

function assumeRidingHorse(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleRuntimeState {
  return resolveWildShapeSubject(state, ridingHorseId, "assumedRidingHorse");
}

function reuseAsCat(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleRuntimeState {
  return resolveWildShapeSubject(state, catId, "reusedCat");
}

function dismissForm(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleRuntimeState {
  const replay = dismissFormWithRoute(state);
  return replay.state;
}

function beginNextTurn(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleRuntimeState {
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: {
        ...state.battle.state,
        currentTurnResources: {
          ...state.battle.state.currentTurnResources,
          currentHasBonusAction: true,
        },
      },
    }),
    lastResult: "nextTurn",
  };
}

function applyIncapacitatedReversion(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleRuntimeState {
  return resolveIncapacitatedReversionWithRoute(state).state;
}

function applyDeathReversion(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleRuntimeState {
  return resolveDeathReversionWithRoute(state).state;
}

function resolveWildShapeSubject(
  state: DruidWildShapeFormLifecycleRuntimeState,
  formStatBlockId: string,
  lastResult: Extract<LastResult, "assumedRidingHorse" | "reusedCat">,
): DruidWildShapeFormLifecycleRuntimeState {
  const replay = resolveWildShapeSubjectWithRoute(
    state,
    formStatBlockId,
    lastResult,
  );
  return { battle: replay.state.battle, lastResult: replay.state.lastResult };
}

function resolveWildShapeSubjectWithRoute(
  state: DruidWildShapeFormLifecycleRuntimeState,
  formStatBlockId: string,
  lastResult: Extract<LastResult, "assumedRidingHorse" | "reusedCat">,
): {
  readonly state: DruidWildShapeFormLifecycleRuntimeState;
  readonly routeEvents: readonly ReducerRouteEvent[];
} {
  const act = wildShapeAct(state.battle, {
    action: "assumeForm",
    formStatBlockId,
  });
  const initial = requireNeedsHoles(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [],
    }),
  );
  const equipmentDispositionHole = initial.holes.find(
    (hole) => hole.kind === "wildShapeEquipmentDisposition",
  );
  if (equipmentDispositionHole === undefined) {
    throw new Error("Expected Druid Wild Shape equipment disposition hole.");
  }
  const allMergedFill: BattleFill = {
    kind: "wildShapeEquipmentDisposition",
    holeId: equipmentDispositionHole.holeId,
    value: {
      formLimbs: { kind: "canHandleObjects" },
      choices: equipmentDispositionHole.candidates.map((item) => ({
        item,
        disposition: "merges" as const,
      })),
    },
  };
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [allMergedFill],
    }),
  );
  return {
    state: {
      battle: battleRuntimeSessionForTest({
        ...state.battle,
        state: resolved.state,
      }),
      lastResult,
    },
    routeEvents: [...(act.routeEvents ?? []), ...(resolved.routeEvents ?? [])],
  };
}

function dismissFormWithRoute(state: DruidWildShapeFormLifecycleRuntimeState): {
  readonly state: DruidWildShapeFormLifecycleRuntimeState;
  readonly routeEvents: readonly ReducerRouteEvent[];
} {
  const act = wildShapeAct(state.battle, { action: "dismiss" });
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [],
    }),
  );
  return {
    state: {
      battle: battleRuntimeSessionForTest({
        ...state.battle,
        state: resolved.state,
      }),
      lastResult: "dismissed",
    },
    routeEvents: [...(act.routeEvents ?? []), ...(resolved.routeEvents ?? [])],
  };
}

function resolveIncapacitatedReversionWithRoute(
  state: DruidWildShapeFormLifecycleRuntimeState,
): {
  readonly state: DruidWildShapeFormLifecycleRuntimeState;
  readonly routeEvents: readonly ReducerRouteEvent[];
  readonly terminalRouteEvents: readonly ReducerRouteEvent[];
} {
  const opponentTurn = endDruidTurnWithRoute(state);
  const act = actionSpellAct(opponentTurn.state.battle, "hypnotic_pattern", {
    tag: "spellSlot",
    slotLevel: 3,
  });
  const savingThrow = requireBattleHole(act.initialHoles, "savingThrowOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: opponentTurn.state.battle.state,
      subject: act.subject,
      fills: [hypnoticPatternSavingThrowOutcomeFill(savingThrow)],
    }),
  );
  return {
    state: {
      battle: battleRuntimeSessionForTest({
        ...opponentTurn.state.battle,
        state: resolved.state,
      }),
      lastResult: "incapacitated",
    },
    terminalRouteEvents: resolved.routeEvents ?? [],
    routeEvents: [
      ...opponentTurn.routeEvents,
      ...(act.routeEvents ?? []),
      ...(resolved.routeEvents ?? []),
    ],
  };
}

function resolveDeathReversionWithRoute(
  state: DruidWildShapeFormLifecycleRuntimeState,
): {
  readonly state: DruidWildShapeFormLifecycleRuntimeState;
  readonly routeEvents: readonly ReducerRouteEvent[];
  readonly terminalRouteEvents: readonly ReducerRouteEvent[];
} {
  const opponentTurn = endDruidTurnWithRoute(state);
  const act = actionSpellAct(opponentTurn.state.battle, "fire_bolt", {
    tag: "cantrip",
  });
  const target = requireBattleHole(act.initialHoles, "targetChoice");
  const targetChoice = targetFill(target, druidId, [
    {
      kind: "spellTarget",
      casterId: opponentId,
      targetId: druidId,
      sourceProcedureRef: act.subject.procedureRef,
    },
  ]);
  const needsAttack = requireNeedsHoles(
    resolveBattleSubject({
      state: opponentTurn.state.battle.state,
      subject: act.subject,
      fills: [targetChoice],
    }),
  );
  const attack = requireBattleHole(needsAttack.holes, "attackRoll");
  const attackRoll = attackRollFill(attack, {
    total: 20,
    naturalD20: 15,
  });
  const needsDamage = requireNeedsHoles(
    resolveBattleSubject({
      state: opponentTurn.state.battle.state,
      subject: act.subject,
      fills: [targetChoice, attackRoll],
    }),
  );
  const damage = requireBattleHole(needsDamage.holes, "rolledDice");
  const result = resolveBattleSubject({
    state: opponentTurn.state.battle.state,
    subject: act.subject,
    fills: [targetChoice, attackRoll, damageRollFillWithGroups(damage, [[10]])],
  });
  if (result.tag !== "resolved") {
    throw new Error(
      result.tag === "invalid"
        ? result.message
        : `Expected Fire Bolt death reversion to resolve, got ${result.tag}.`,
    );
  }
  const resolved = result;
  return {
    state: {
      battle: battleRuntimeSessionForTest({
        ...opponentTurn.state.battle,
        state: resolved.state,
      }),
      lastResult: "dead",
    },
    terminalRouteEvents: resolved.routeEvents ?? [],
    routeEvents: [
      ...opponentTurn.routeEvents,
      ...(act.routeEvents ?? []),
      ...(needsAttack.routeEvents ?? []),
      ...(needsDamage.routeEvents ?? []),
      ...(resolved.routeEvents ?? []),
    ],
  };
}

function endDruidTurnWithRoute(
  state: DruidWildShapeFormLifecycleRuntimeState,
): {
  readonly state: DruidWildShapeFormLifecycleRuntimeState;
  readonly routeEvents: readonly ReducerRouteEvent[];
} {
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: {
        tag: "runtimeCommand",
        actorId: druidId,
        command: "endTurn",
      },
      fills: [],
    }),
  );
  return {
    state: {
      battle: battleRuntimeSessionForTest({
        ...state.battle,
        state: resolved.state,
      }),
      lastResult: state.lastResult,
    },
    routeEvents: resolved.routeEvents ?? [],
  };
}

function activeFormLifecycleRouteEvents(
  events: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return events.filter(
    (event) => "subject" in event && event.subject === "activeFormLifecycle",
  );
}

function routeSubjects(
  events: readonly ReducerRouteEvent[],
): readonly string[] {
  return events.flatMap((event) => ("subject" in event ? [event.subject] : []));
}

function isActionSpellAvailableAct(
  act: AvailableBattleAct,
): act is ActionSpellAvailableAct {
  return act.subject.tag === "actionSpell";
}

function actionSpellAct(
  session: BattleRuntimeSession,
  spellUnitId: string,
  invocation:
    | {
        readonly tag: "cantrip";
      }
    | {
        readonly tag: "spellSlot";
        readonly slotLevel: number;
      },
): ActionSpellAvailableAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAvailableAct => {
      if (!isActionSpellAvailableAct(candidate)) {
        return false;
      }
      return (
        candidate.subject.actorId === opponentId &&
        battleActSpellPresentation(candidate)?.invocation.tag ===
          invocation.tag &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          spellUnitId &&
        (invocation.tag === "cantrip" ||
          (battleActSpellPresentation(candidate)?.invocation.tag ===
            "spellSlot" &&
            Number(
              battleActSpellSlotPresentation(candidate)?.invocation.slotLevel,
            ) === invocation.slotLevel))
      );
    },
  );
  if (act?.subject.tag !== "actionSpell") {
    throw new Error(`Expected ${spellUnitId} action spell act.`);
  }
  return act;
}

function hypnoticPatternSavingThrowOutcomeFill(
  hole: BattleHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const baseFill = savingThrowOutcomeFill(hole, [
    { targetId: druidId, succeeded: false, withoutRoll: true },
  ]);
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected Hypnotic Pattern saving throw outcome hole.");
  }
  return {
    ...baseFill,
    value: {
      area: {
        kind: "hypnoticPatternArea",
        originAnchorId: opponentId,
        affectedTargetIds: [druidId],
        cubeSideFeet: 30,
        affectedCreatureWitnesses: [
          {
            targetId: druidId,
            inCube: true,
            canSeePattern: true,
          },
        ],
      },
      outcomes: baseFill.value.outcomes,
    },
  };
}

function requireBattleHole(
  holes: readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function beginNextTurnWithRoute(
  state: DruidWildShapeFormLifecycleRuntimeState,
): {
  readonly state: DruidWildShapeFormLifecycleRuntimeState;
  readonly routeEvents: readonly ReducerRouteEvent[];
} {
  const opponentTurn = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: {
        tag: "runtimeCommand",
        actorId: druidId,
        command: "endTurn",
      },
      fills: [],
    }),
  );
  const druidTurn = requireResolved(
    resolveBattleSubject({
      state: opponentTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: opponentId,
        command: "endTurn",
      },
      fills: [],
    }),
  );
  return {
    state: {
      battle: battleRuntimeSessionForTest({
        ...state.battle,
        state: druidTurn.state,
      }),
      lastResult: "nextTurn",
    },
    routeEvents: [
      ...(opponentTurn.routeEvents ?? []),
      ...(druidTurn.routeEvents ?? []),
    ],
  };
}

function isDruidWildShapeAvailableAct(
  act: AvailableBattleAct,
): act is DruidWildShapeAvailableAct {
  return act.subject.tag === "druidWildShape";
}

function wildShapeAct(
  session: BattleRuntimeSession,
  input:
    | {
        readonly action: "assumeForm";
        readonly formStatBlockId: string;
      }
    | { readonly action: "dismiss" },
): DruidWildShapeAvailableAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is DruidWildShapeAvailableAct => {
      if (!isDruidWildShapeAvailableAct(candidate)) {
        return false;
      }
      return (
        candidate.subject.action === input.action &&
        (input.action === "dismiss" ||
          (candidate.subject.action === "assumeForm" &&
            battleActDruidWildShapePresentation(candidate)?.formStatBlockId ===
              input.formStatBlockId))
      );
    },
  );
  if (act?.subject.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape act.");
  }
  return act;
}

function druidWildShapeFormProjection(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleProjection {
  const druid = requireCharacter(state.battle.state, druidId);
  const snapshot = snapshotCreature(
    snapshotBattle(state.battle.state),
    druidId,
  );
  const form = activeDruidWildShapeForm(druid);
  const mergedEquipmentCount =
    activeDruidWildShapeEffect(druid)?.equipmentDisposition.filter(
      (disposition) => disposition.disposition === "merges",
    ).length ?? 0;
  const activeFormEffectCount = combatantHasActiveDruidWildShape(druid)
    ? druid.activeEffects.filter(
        (effect) => effect.kind === "druidWildShapeForm",
      ).length
    : 0;
  const spellAvailable = discoverBattleActs(state.battle).some(
    (act) => act.subject.tag === "actionSpell",
  );
  const projection = {
    activeForm: activeFormFromStatBlock(form),
    bonusActionAvailable: canSpendBonusAction(
      state.battle.state.currentTurnResources,
    ),
    usesRemaining: druidWildShapeUsesRemaining(state.battle),
    tempHp: Number(druid.tempHp),
    armorClass: Number(snapshot.armorClass),
    creatureSize: literalField(snapshot.size, CREATURE_SIZES),
    speedFeet: Number(snapshot.movement.speedFeet),
    shoveDc:
      8 +
      Number(combatantD20AbilityModifier(druid, "str")) +
      Number(combatantD20ProficiencyBonus(druid)),
    spellAvailable,
    activeFormEffectCount,
    mergedEquipmentCount,
    druidAlive: druidIsAlive(druid),
    lastResult: state.lastResult,
  } satisfies DruidWildShapeFormLifecycleProjection;

  return projection;
}

function druidIsAlive(druid: CharacterBattleCreatureState): boolean {
  return (
    Number(druid.hp) > 0 &&
    (druid.zeroHpLifecycle.policy !== "usesDeathSavingThrows" ||
      !druid.zeroHpLifecycle.deathSaves.dead)
  );
}

function activeFormFromStatBlock(
  form: ReturnType<typeof activeDruidWildShapeForm>,
): ActiveForm {
  if (form === null) return "trueForm";
  if (form.id === ridingHorseId) return "ridingHorse";
  if (form.id === catId) return "cat";
  throw new Error(`Unexpected Druid Wild Shape form ${form.id}.`);
}

function druidWildShapeAvailableForms(): readonly StatBlockRecord[] {
  return [
    statBlockCatalog.requireStatBlock(ratId),
    statBlockCatalog.requireStatBlock(ridingHorseId),
    statBlockCatalog.requireStatBlock(lizardId),
    statBlockCatalog.requireStatBlock(catId),
  ];
}

function requireCharacter(
  state: BattleState,
  combatantId: typeof druidId,
): CharacterBattleCreatureState {
  const combatant = state.combatants.get(combatantId);
  if (!isCharacterBattleCreatureState(combatant)) {
    throw new Error("Expected Druid character combatant.");
  }
  return combatant;
}

function isCharacterBattleCreatureState(
  combatant: BattleCreatureState | undefined,
): combatant is CharacterBattleCreatureState {
  return combatant?.origin.kind === "character";
}

function druidWildShapeUsesRemaining(session: BattleRuntimeSession): number {
  const resourcePoolRef = session.context.characters
    .get(druidId)
    ?.resourceOwnership.find(
      (ownership) => ownership.unit.id === "druid_wild_shape",
    )?.resourcePoolRef;
  const druid = requireCharacter(session.state, druidId);
  const resource = druid.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Druid Wild Shape resource.");
  }
  return Number(resource.usesRemaining);
}

function snapshotCreature(
  snapshot: ReturnType<typeof snapshotBattle>,
  combatantId: typeof druidId,
) {
  const creature = snapshot.combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (creature === undefined) {
    throw new Error("Expected Druid snapshot.");
  }
  return creature;
}

function normalizeDruidWildShapeFormQuintState(
  raw: unknown,
): DruidWildShapeFormLifecycleProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: druidWildShapeUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error("Expected Druid Wild Shape witness holes to be empty.");
  }
  const scenarioResult = wildShapeLastResult(state["qScenarioOutcome"]);
  assertWitnessProtocolConsistentWithScenario({
    label: "Druid Wild Shape form lifecycle",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    activeForm: literalField(state["qActiveForm"], ACTIVE_FORMS),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    usesRemaining: numberFromQuintInt(
      state["qUsesRemaining"],
      "qUsesRemaining",
    ),
    tempHp: numberFromQuintInt(state["qTempHp"], "qTempHp"),
    armorClass: numberFromQuintInt(state["qArmorClass"], "qArmorClass"),
    creatureSize: literalField(state["qCreatureSize"], CREATURE_SIZES),
    speedFeet: numberFromQuintInt(state["qSpeedFeet"], "qSpeedFeet"),
    shoveDc: numberFromQuintInt(state["qShoveDc"], "qShoveDc"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    activeFormEffectCount: numberFromQuintInt(
      state["qActiveFormEffectCount"],
      "qActiveFormEffectCount",
    ),
    mergedEquipmentCount: numberFromQuintInt(
      state["qMergedEquipmentCount"],
      "qMergedEquipmentCount",
    ),
    druidAlive: druidStatusIsAlive(
      literalField(state["qDruidStatus"], DRUID_STATUSES),
    ),
    lastResult: scenarioResult,
  };
}

function druidWildShapeUnexpectedHole(raw: unknown): never {
  throw new Error(`Unexpected Druid Wild Shape witness hole ${String(raw)}.`);
}

function druidStatusIsAlive(status: DruidStatus): boolean {
  return status !== "dead";
}

function compareDruidWildShapeFormStates(
  spec: DruidWildShapeFormLifecycleProjection,
  impl: DruidWildShapeFormLifecycleProjection,
): boolean {
  try {
    expect(impl).toEqual(spec);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\n${JSON.stringify({ spec, impl }, null, 2)}`,
      );
    }
    throw error;
  }
  return true;
}

function literalField<const T extends readonly string[]>(
  raw: unknown,
  values: T,
): T[number] {
  if (typeof raw === "string" && values.includes(raw)) {
    return raw;
  }
  throw new Error(`Unexpected literal value: ${String(raw)}.`);
}

function wildShapeLastResult(raw: unknown): LastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value = DRUID_WILD_SHAPE_FORM_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(
    `Expected Quint scenario outcome variant qScenarioOutcome, got ${tag}.`,
  );
}
