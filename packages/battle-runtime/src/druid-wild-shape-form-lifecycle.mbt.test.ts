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
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { Hp } from "@dnd/shared/types";
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
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteResolveBattleSubjectWithoutFill,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  activeDruidWildShapeEffect,
  activeDruidWildShapeForm,
  combatantD20AbilityModifier,
  combatantD20ProficiencyBonus,
  combatantHasActiveDruidWildShape,
  discoverBattleActs,
  resolveBattleSubject,
  snapshotBattle,
  type BattleCreatureState,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CharacterBattleCreatureState,
} from "./index.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  heavyArmorClassState,
  requireResolved,
  spellRecord,
  startBattleRight,
  statBlockCatalog,
  statBlockCreatureInit,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";

const ACTIVE_FORMS = ["trueForm", "ridingHorse", "cat"] as const;
type ActiveForm = (typeof ACTIVE_FORMS)[number];
const CREATURE_SIZES = ["tiny", "medium", "large"] as const;
type CreatureSize = (typeof CREATURE_SIZES)[number];
const LAST_RESULTS = [
  "init",
  "assumedRidingHorse",
  "nextTurn",
  "reusedCat",
  "dismissed",
  "incapacitated",
  "dead",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
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
  readonly battle: BattleState;
  readonly lastResult: LastResult;
};

const druidId = combatantId("wild-shape-form-lifecycle-mbt-druid");
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
    const incapacitated = applyIncapacitatedReversion(active);
    const dead = applyDeathReversion(active);

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
      spellAvailable: false,
      activeFormEffectCount: 0,
      mergedEquipmentCount: 0,
      druidAlive: true,
      lastResult: "incapacitated",
    });
    expect(druidWildShapeFormProjection(dead)).toMatchObject({
      activeForm: "trueForm",
      spellAvailable: false,
      activeFormEffectCount: 0,
      mergedEquipmentCount: 0,
      druidAlive: false,
      lastResult: "dead",
    });
  });

  it("matches the focused form lifecycle against bounded random MBT traces", async () => {
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
  }, MBT_TEST_TIMEOUT_MS);
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
  it("routes active form lifecycle through durable battle owners", async () => {
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
  }, MBT_TEST_TIMEOUT_MS);
});

function createDruidWildShapeFormLifecycleRouteDriver() {
  return defineDriver<
    typeof druidWildShapeFormLifecycleRouteDriverSchema,
    DruidWildShapeFormLifecycleRouteProjection
  >(druidWildShapeFormLifecycleRouteDriverSchema, () => {
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      route = [reducerRouteStartBattle("battleActionEconomy")];
    }

    reset();

    return {
      init: reset,
      doAssumeForm: () => {
        route = appendAssumeOrReuseFormRoute(route);
      },
      doBeginNextTurn: () => {
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "activeFormLifecycle",
            holes: [],
            owner: "battleTurnBoundary",
          }),
          reducerRouteResolveBattleSubjectWithoutFill({
            subject: "activeFormLifecycle",
            holes: [],
            owner: "battleTurnBoundary",
          }),
          reducerRouteResolveBattleSubjectWithoutFill({
            subject: "activeFormLifecycle",
            holes: [],
            owner: "battleActionEconomy",
          }),
        ];
      },
      doReuseForm: () => {
        route = appendAssumeOrReuseFormRoute(route);
      },
      doDismissForm: () => {
        route = appendDismissalRoute(route);
      },
      doIncapacitatedReversion: () => {
        route = appendIncapacitatedReversionRoute(route);
      },
      doDeathReversion: () => {
        route = appendDeathReversionRoute(route);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => ({ route }),
    };
  });
}

function appendAssumeOrReuseFormRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "activeFormLifecycle",
      holes: [{ kind: "wildShapeEquipmentDisposition" }],
      owner: "battleActionEconomy",
    }),
    reducerRouteResolveBattleSubject({
      subject: "activeFormLifecycle",
      fill: "wildShapeEquipmentDisposition",
      holes: [],
      owner: "battleActionEconomy",
    }),
    ...activeFormLifecycleOwners(
      "battleFeatureResource",
      "battleTemporaryHitPoint",
      "battleActiveEffect",
      "battleCreatureState",
      "battleMovementResource",
    ),
  ];
}

function appendDismissalRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "activeFormLifecycle",
      holes: [],
      owner: "battleActionEconomy",
    }),
    ...activeFormLifecycleOwners(
      "battleActionEconomy",
      "battleActiveEffect",
      "battleCreatureState",
      "battleMovementResource",
    ),
  ];
}

function appendIncapacitatedReversionRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "activeFormLifecycle",
      holes: [],
      owner: "battleConditionLifecycle",
    }),
    ...activeFormLifecycleOwners(
      "battleConditionLifecycle",
      "battleActiveEffect",
      "battleCreatureState",
      "battleMovementResource",
    ),
  ];
}

function appendDeathReversionRoute(
  route: readonly ReducerRouteEvent[],
): readonly ReducerRouteEvent[] {
  return [
    ...route,
    reducerRouteDiscoverBattleActs({
      subject: "activeFormLifecycle",
      holes: [],
      owner: "battleHitPointAndZeroHpLifecycle",
    }),
    ...activeFormLifecycleOwners(
      "battleHitPointAndZeroHpLifecycle",
      "battleActiveEffect",
      "battleCreatureState",
      "battleMovementResource",
    ),
  ];
}

function activeFormLifecycleOwners(
  ...owners: readonly ReducerRouteEvent["owner"][]
): readonly ReducerRouteEvent[] {
  return owners.map((owner) =>
    reducerRouteResolveBattleSubjectWithoutFill({
      subject: "activeFormLifecycle",
      holes: [],
      owner,
    }),
  );
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
  quintVariantFieldTags: { lastResult: DRUID_WILD_SHAPE_FORM_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG },
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
          projectionAfter: expectedDruidWildShapeFormProjection({
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
            lastResult: "assumedRidingHorse",
          }),
          discover: () =>
            druidWildShapeFormProjection(
              assumeRidingHorse(initialRuntimeState()),
            ),
        },
        {
          actionName: "doReuseAsCat",
          projectionAfter: expectedDruidWildShapeFormProjection({
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
          }),
          discover: () =>
            druidWildShapeFormProjection(
              reuseAsCat(
                beginNextTurn(assumeRidingHorse(initialRuntimeState())),
              ),
            ),
        },
        {
          actionName: "doBeginNextTurn",
          projectionAfter: expectedDruidWildShapeFormProjection(),
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
          projectionAfter: expectedDruidWildShapeFormProjection({
            bonusActionAvailable: false,
            usesRemaining: 1,
            tempHp: 2,
            lastResult: "dismissed",
          }),
          discover: () =>
            druidWildShapeFormProjection(
              dismissForm(
                beginNextTurn(assumeRidingHorse(initialRuntimeState())),
              ),
            ),
        },
        {
          actionName: "doIncapacitatedReversion",
          projectionAfter: expectedDruidWildShapeFormProjection({
            bonusActionAvailable: false,
            usesRemaining: 1,
            tempHp: 2,
            spellAvailable: false,
            lastResult: "incapacitated",
          }),
          discover: () =>
            druidWildShapeFormProjection(
              applyIncapacitatedReversion(
                assumeRidingHorse(initialRuntimeState()),
              ),
            ),
        },
        {
          actionName: "doDeathReversion",
          projectionAfter: expectedDruidWildShapeFormProjection({
            bonusActionAvailable: false,
            usesRemaining: 1,
            tempHp: 2,
            spellAvailable: false,
            druidAlive: false,
            lastResult: "dead",
          }),
          discover: () =>
            druidWildShapeFormProjection(
              applyDeathReversion(assumeRidingHorse(initialRuntimeState())),
            ),
        },
        {
          actionName: "doStutter",
          projectionAfter: expectedDruidWildShapeFormProjection(),
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
    battle: startBattleRight({
      battleId: battleId("druid-wild-shape-form-lifecycle-mbt"),
      combatants: [
        characterSeed({
          combatantId: druidId,
          displayName: "Druid",
          initiative: 20,
          classLevels: [{ className: "druid", level: 2 }],
          resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
          druidWildShapeAvailableForms: druidWildShapeAvailableForms(),
          armorClass: heavyArmorClassState(),
          selectedLoadout: {
            armor: {
              itemId: "armor:armor_chain_mail",
              unitId: "armor_chain_mail",
            },
            weapon: {
              itemId: "main:weapon_quarterstaff",
              unitId: "weapon_quarterstaff",
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
        statBlockCreatureInit({ initiative: 10 }),
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
  const subject = wildShapeSubject(state.battle, { action: "dismiss" });
  return {
    battle: requireResolved(resolveDruidWildShape(state.battle, subject)).state,
    lastResult: "dismissed",
  };
}

function beginNextTurn(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleRuntimeState {
  return {
    battle: {
      ...state.battle,
      currentTurnResources: {
        ...state.battle.currentTurnResources,
        currentHasBonusAction: true,
      },
    },
    lastResult: "nextTurn",
  };
}

function applyIncapacitatedReversion(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleRuntimeState {
  const activeDruid = requireCharacter(state.battle, druidId);
  const incapacitatedDruid: BattleCreatureState = {
    ...activeDruid,
    conditions: applyCondition(activeDruid.conditions, "incapacitated"),
    positiveHpUnconscious: null,
  };
  return {
    battle: {
      ...state.battle,
      combatants: new Map(state.battle.combatants).set(
        druidId,
        incapacitatedDruid,
      ),
    },
    lastResult: "incapacitated",
  };
}

function applyDeathReversion(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleRuntimeState {
  const activeDruid = requireCharacter(state.battle, druidId);
  const deadDruid: CharacterBattleCreatureState = {
    ...activeDruid,
    hp: Hp(0),
    positiveHpUnconscious: null,
    zeroHpLifecycle:
      activeDruid.zeroHpLifecycle.policy === "usesDeathSavingThrows"
        ? {
            ...activeDruid.zeroHpLifecycle,
            deathSaves: {
              ...activeDruid.zeroHpLifecycle.deathSaves,
              dead: true,
            },
          }
        : activeDruid.zeroHpLifecycle,
  };
  return {
    battle: {
      ...state.battle,
      combatants: new Map(state.battle.combatants).set(druidId, deadDruid),
    },
    lastResult: "dead",
  };
}

function resolveWildShapeSubject(
  state: DruidWildShapeFormLifecycleRuntimeState,
  formStatBlockId: string,
  lastResult: Extract<LastResult, "assumedRidingHorse" | "reusedCat">,
): DruidWildShapeFormLifecycleRuntimeState {
  const subject = wildShapeSubject(state.battle, {
    action: "assumeForm",
    formStatBlockId,
  });
  return {
    battle: requireResolved(resolveDruidWildShape(state.battle, subject)).state,
    lastResult,
  };
}

function resolveDruidWildShape(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "druidWildShape" }>,
): BattleResolutionResult {
  const initial = resolveBattleSubject({ state, subject, fills: [] });
  if (initial.tag !== "needsHoles") return initial;
  const equipmentDispositionHole = initial.holes.find(
    (hole) => hole.kind === "wildShapeEquipmentDisposition",
  );
  if (equipmentDispositionHole === undefined) return initial;
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
  return resolveBattleSubject({ state, subject, fills: [allMergedFill] });
}

function druidWildShapeFormProjection(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleProjection {
  const druid = requireCharacter(state.battle, druidId);
  const snapshot = snapshotCreature(snapshotBattle(state.battle), druidId);
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
      state.battle.currentTurnResources,
    ),
    usesRemaining: druidWildShapeUsesRemaining(druid),
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

function wildShapeSubject(
  state: BattleState,
  input:
    | {
        readonly action: "assumeForm";
        readonly formStatBlockId: string;
      }
    | { readonly action: "dismiss" },
): Extract<BattleSubject, { readonly tag: "druidWildShape" }> {
  const subject = discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "druidWildShape" &&
      act.subject.action === input.action &&
      (input.action === "dismiss" ||
        (act.subject.action === "assumeForm" &&
          act.subject.formStatBlockId === input.formStatBlockId)),
  )?.subject;
  if (subject?.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape act.");
  }
  return subject;
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

function druidWildShapeUsesRemaining(
  combatant: CharacterBattleCreatureState,
): number {
  const resource = combatant.origin.resources.find(
    (candidate) => candidate.unit.id === "druid_wild_shape",
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
  const value =
    DRUID_WILD_SHAPE_FORM_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(
    `Expected Quint scenario outcome variant qScenarioOutcome, got ${tag}.`,
  );
}
