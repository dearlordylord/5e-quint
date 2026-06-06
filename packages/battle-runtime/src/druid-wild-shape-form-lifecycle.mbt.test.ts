// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape:
//   Bonus Action known Beast form assumption, use spending, Temporary Hit
//   Points equal to Druid level, Beast stat-block projection, no spellcasting,
//   reuse replacement, Bonus Action dismissal, and ending on Incapacitated or
//   death.
// - .references/srd-5.2.1/Rules-Glossary.md#Shape-Shifting:
//   shape-shifting effects specify their own form rules and revert on death.
// - UBIQUITOUS_LANGUAGE.md: Temporary Hit Points, Creature, Stat Block,
//   Character Sheet, and Action Lifecycle.
import * as path from "node:path";

import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { Hp } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import {
  activeDruidWildShapeForm,
  combatantD20AbilityModifier,
  combatantD20ProficiencyBonus,
  combatantHasActiveDruidWildShape,
  discoverBattleActs,
  resolveBattleSubject,
  snapshotBattle,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CharacterBattleCreatureState,
} from "./index.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  requireResolved,
  spellRecord,
  startBattleRight,
  statBlockCatalog,
  statBlockCreatureInit,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";

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
  readonly druidAlive: boolean;
  readonly lastResult: LastResult;
};

type DruidWildShapeFormLifecycleRuntimeState = {
  readonly battle: BattleState;
  readonly lastResult: LastResult;
};

const druidId = combatantId("wild-shape-form-lifecycle-mbt-druid");
const ratId = "stat_block_rat";
const ridingHorseId = "stat_block_riding_horse";
const lizardId = "stat_block_lizard";
const catId = "stat_block_cat";

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
      druidAlive: true,
      lastResult: "dismissed",
    });
    expect(druidWildShapeFormProjection(incapacitated)).toMatchObject({
      activeForm: "trueForm",
      spellAvailable: false,
      activeFormEffectCount: 0,
      druidAlive: true,
      lastResult: "incapacitated",
    });
    expect(druidWildShapeFormProjection(dead)).toMatchObject({
      activeForm: "trueForm",
      spellAvailable: false,
      activeFormEffectCount: 0,
      druidAlive: false,
      lastResult: "dead",
    });
  });

  it("matches the focused form lifecycle against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDruidWildShapeFormLifecycleDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 5,
      stateCheck: druidWildShapeFormStateCheck,
    });
  }, 120_000);
});

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
          druidWildShapeKnownForms: druidWildShapeKnownForms(),
          selectedLoadout: {},
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
  return resolveBattleSubject({ state, subject, fills: [] });
}

function druidWildShapeFormProjection(
  state: DruidWildShapeFormLifecycleRuntimeState,
): DruidWildShapeFormLifecycleProjection {
  const druid = requireCharacter(state.battle, druidId);
  const snapshot = snapshotCreature(snapshotBattle(state.battle), druidId);
  const form = activeDruidWildShapeForm(druid);
  const activeFormEffectCount = combatantHasActiveDruidWildShape(druid)
    ? druid.activeEffects.filter((effect) => effect.kind === "druidWildShapeForm")
        .length
    : 0;
  const spellAvailable = discoverBattleActs(state.battle).some(
    (act) => act.subject.tag === "actionSpell",
  );
  const projection = {
    activeForm: activeFormFromStatBlock(form),
    bonusActionAvailable: canSpendBonusAction(state.battle.currentTurnResources),
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

function druidWildShapeKnownForms(): readonly StatBlockRecord[] {
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
  const state = quintStateRecord(raw);
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
    druidAlive: druidStatusIsAlive(
      literalField(state["qDruidStatus"], DRUID_STATUSES),
    ),
    lastResult: literalField(state["qLastResult"], LAST_RESULTS),
  };
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

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint Druid Wild Shape form lifecycle state.");
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

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
