// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-chained-attack-damage
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Chromatic Orb:
//   damage-type choice, ranged Spell Attack, 3d8 chosen-type damage, duplicate
//   d8 leap admission, 30-foot different-target leap, higher-slot damage dice,
//   slot-level leap limit, and once-per-target-per-casting history.
// - .references/srd-5.2.1/Rules-Glossary.md#Spell Attack.
// - UBIQUITOUS_LANGUAGE.md: Spell Attack, Damage Roll, Damage Type, Spell
//   Slot, and Cast Level.
import {
  DieRollResult,
  movementFeet,
  type DamageType,
} from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintSet,
  quintVariantTag,
  quintRecordField,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  chromaticOrbUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const CHAINED_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "thunder",
] as const satisfies ReadonlyArray<DamageType>;

const CHAINED_HOLE_NAMES = [
  "DamageTypeChoice",
  "TargetChoice0",
  "AttackRoll0",
  "DamageRoll0",
  "TargetChoice1",
  "AttackRoll1",
  "DamageRoll1",
  "TargetChoice2",
] as const;

const CHAINED_TARGET_LABELS = ["first", "second", "third"] as const;

const CHAINED_LAST_RESULTS = [
  "init",
  "awaitingDamageType",
  "awaitingInitialTarget",
  "awaitingStep0Attack",
  "awaitingStep0Damage",
  "step0NoLeapComplete",
  "awaitingFirstLeapTarget",
  "awaitingStep1Attack",
  "awaitingStep1Damage",
  "slot1LeapLimitComplete",
  "awaitingSecondLeapTarget",
] as const;

type ChainedDamageType = (typeof CHAINED_DAMAGE_TYPES)[number];
type ChainedDamageTypeState = ChainedDamageType | "none";
type ChainedHole = (typeof CHAINED_HOLE_NAMES)[number];
type ChainedLastResult = (typeof CHAINED_LAST_RESULTS)[number];
const CHAINED_ATTACK_SEQUENCE_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, ChainedLastResult>
> = {
  Init: "init",
  AwaitingDamageType: "awaitingDamageType",
  AwaitingInitialTarget: "awaitingInitialTarget",
  AwaitingStep0Attack: "awaitingStep0Attack",
  AwaitingStep0Damage: "awaitingStep0Damage",
  Step0NoLeapComplete: "step0NoLeapComplete",
  AwaitingFirstLeapTarget: "awaitingFirstLeapTarget",
  AwaitingStep1Attack: "awaitingStep1Attack",
  AwaitingStep1Damage: "awaitingStep1Damage",
  Slot1LeapLimitComplete: "slot1LeapLimitComplete",
  AwaitingSecondLeapTarget: "awaitingSecondLeapTarget",
} as const;

type ChainedTargetLabel = (typeof CHAINED_TARGET_LABELS)[number];
type ChainedPreviousTarget = ChainedTargetLabel | "none";
type ChainedSlotLevel = 1 | 2;

type ChainedAttackSequenceState = {
  readonly damageType: ChainedDamageTypeState;
  readonly slotLevel: number;
  readonly targeted: readonly ChainedTargetLabel[];
  readonly previousTarget: ChainedPreviousTarget;
  readonly leapsUsed: number;
  readonly stepIndex: number;
  readonly firstTargetHp: number;
  readonly secondTargetHp: number;
  readonly thirdTargetHp: number;
  readonly step0AttackTotal: number;
  readonly step0NaturalD20: number;
  readonly step0DamageTotal: number;
  readonly step0DamageHasDuplicate: boolean;
  readonly step1AttackTotal: number;
  readonly step1NaturalD20: number;
  readonly step1DamageTotal: number;
  readonly step1DamageHasDuplicate: boolean;
  readonly holes: readonly ChainedHole[];
  readonly lastResult: ChainedLastResult;
};

type ChainedAttackRuntimeState = {
  readonly baseBattle: BattleState;
  readonly projectionBattle: BattleState;
  readonly subject: ChainedAttackSubject | null;
  readonly fills: readonly BattleFill[];
  readonly holes: readonly BattleHole[];
  readonly damageType: ChainedDamageTypeState;
  readonly slotLevel: number;
  readonly targeted: readonly ChainedTargetLabel[];
  readonly previousTarget: ChainedPreviousTarget;
  readonly leapsUsed: number;
  readonly stepIndex: number;
  readonly step0AttackTotal: number;
  readonly step0NaturalD20: number;
  readonly step0DamageTotal: number;
  readonly step0DamageHasDuplicate: boolean;
  readonly step1AttackTotal: number;
  readonly step1NaturalD20: number;
  readonly step1DamageTotal: number;
  readonly step1DamageHasDuplicate: boolean;
  readonly lastResult: ChainedLastResult;
};

type ActionSpellSubject = Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
>;

type ChainedAttackSubject = ActionSpellSubject & {
  readonly invocation: ActionSpellSubject["invocation"] & {
    readonly procedure: "chainedSpellAttackDamage";
  };
};

type ChainedActionSpellAct = AvailableBattleAct & {
  readonly subject: ChainedAttackSubject;
};

type ChainedReplaySequence = {
  readonly name: string;
  readonly slotLevel: ChainedSlotLevel;
  readonly actions: readonly ChainedAttackDriverAction[];
  readonly expected: Partial<ChainedAttackSequenceState>;
};

type ChainedAttackDriver = ReturnType<
  ReturnType<typeof createChainedAttackSequenceDriver>
>;

const secondTargetId = combatantId("chained-attack-second-target");
const thirdTargetId = combatantId("chained-attack-third-target");
const targetIdsByLabel = {
  first: spellTargetId,
  second: secondTargetId,
  third: thirdTargetId,
} as const satisfies Record<ChainedTargetLabel, CombatantId>;

const chainedAttackDriverSchema = {
  init: {},
  doStartCast: { slotLevel: mbtPickSchemas.int },
  doChooseDamageType: { damageType: mbtPickSchemas.unknown },
  doChooseInitialTarget: {},
  doResolveStep0AttackHit: {},
  doResolveStep0DamageNoDuplicate: {},
  doResolveStep0DamageDuplicate: {},
  doChooseFirstLeapTarget: {},
  doResolveStep1AttackHit: {},
  doResolveStep1DuplicateDamageSlot1Limit: {},
  doResolveStep1DuplicateDamageSlot2AllowsLeap: {},
  step: {},
} as const;

type ChainedAttackDriverAction = Exclude<
  keyof typeof chainedAttackDriverSchema,
  "init" | "step"
>;

const replaySequences = [
  {
    name: "chosen-damage-type-and-no-duplicate-damage-complete",
    slotLevel: 1,
    actions: [
      "doStartCast",
      "doChooseDamageType",
      "doChooseInitialTarget",
      "doResolveStep0AttackHit",
      "doResolveStep0DamageNoDuplicate",
    ],
    expected: {
      damageType: "fire",
      slotLevel: 1,
      firstTargetHp: 6,
      step0DamageTotal: 6,
      step0DamageHasDuplicate: false,
      holes: [],
      lastResult: "step0NoLeapComplete",
    },
  },
  {
    name: "level-1-duplicate-leap-stops-after-one-leap",
    slotLevel: 1,
    actions: [
      "doStartCast",
      "doChooseDamageType",
      "doChooseInitialTarget",
      "doResolveStep0AttackHit",
      "doResolveStep0DamageDuplicate",
      "doChooseFirstLeapTarget",
      "doResolveStep1AttackHit",
      "doResolveStep1DuplicateDamageSlot1Limit",
    ],
    expected: {
      damageType: "fire",
      slotLevel: 1,
      targeted: ["first", "second"],
      leapsUsed: 1,
      firstTargetHp: 3,
      secondTargetHp: 9,
      step1DamageHasDuplicate: true,
      holes: [],
      lastResult: "slot1LeapLimitComplete",
    },
  },
  {
    name: "level-2-duplicate-leap-opens-second-leap-target",
    slotLevel: 2,
    actions: [
      "doStartCast",
      "doChooseDamageType",
      "doChooseInitialTarget",
      "doResolveStep0AttackHit",
      "doResolveStep0DamageDuplicate",
      "doChooseFirstLeapTarget",
      "doResolveStep1AttackHit",
      "doResolveStep1DuplicateDamageSlot2AllowsLeap",
    ],
    expected: {
      damageType: "fire",
      slotLevel: 2,
      targeted: ["first", "second"],
      leapsUsed: 1,
      firstTargetHp: 2,
      secondTargetHp: 8,
      step1DamageTotal: 4,
      step1DamageHasDuplicate: true,
      holes: ["TargetChoice2"],
      lastResult: "awaitingSecondLeapTarget",
    },
  },
] as const satisfies ReadonlyArray<ChainedReplaySequence>;

const chainedAttackSequenceStateCheck = stateCheck(
  normalizeChainedAttackQuintState,
  compareChainedAttackStates,
);

describe("Chained attack sequence MBT parity", () => {
  it("replays focused Chromatic Orb-style chained attack paths", async () => {
    const replayedActions = new Set<ChainedAttackDriverAction>();

    for (const sequence of replaySequences) {
      const driver = createChainedAttackSequenceDriver()();

      for (const actionName of sequence.actions) {
        replayedActions.add(actionName);
        await replayChainedAttackDriverAction(
          driver,
          sequence.slotLevel,
          actionName,
        );
      }

      const runtime = driver.getState?.();
      if (runtime === undefined) {
        throw new Error("Chained attack driver must expose getState.");
      }
      expect(runtime).toMatchObject(sequence.expected);
    }

    expect(replayedActions).toEqual(
      new Set(replaySequences.flatMap((sequence) => sequence.actions)),
    );
  });

  it("keeps leap target history and range facts table-owned", async () => {
    let state = initialRuntimeState();
    state = startCast(state, 2);
    state = chooseDamageType(state, "fire");
    state = chooseInitialTarget(state);
    state = resolveStepAttackHit(state, 0);
    state = resolveStep0DamageDuplicate(state);

    expect(chainedAttackSequenceProjection(state)).toMatchObject({
      targeted: ["first"],
      previousTarget: "first",
      holes: ["TargetChoice1"],
    });

    const subject = requireSubject(state);
    const firstLeapTargetHole = requireHole(state.holes, "targetChoice");
    expect(firstLeapTargetHole.choices).toContain(secondTargetId);
    expect(firstLeapTargetHole.choices).toContain(thirdTargetId);
    expect(firstLeapTargetHole.choices).not.toContain(spellTargetId);

    expect(
      resolveBattleSubject({
        state: state.baseBattle,
        subject,
        fills: [
          ...state.fills,
          spellLeapTargetFill(firstLeapTargetHole, "first", "first"),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state: state.baseBattle,
        subject,
        fills: [
          ...state.fills,
          spellLeapTargetFill(firstLeapTargetHole, "first", "second", false),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    state = chooseFirstLeapTarget(state);
    state = resolveStepAttackHit(state, 1);
    state = resolveStep1DuplicateDamageSlot2AllowsLeap(state);

    const secondLeapTargetHole = requireHole(state.holes, "targetChoice");
    expect(secondLeapTargetHole.choices).toContain(thirdTargetId);
    expect(secondLeapTargetHole.choices).not.toContain(spellTargetId);
    expect(secondLeapTargetHole.choices).not.toContain(secondTargetId);
  });

  it(
    "matches focused chained attack traces against Quint",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-chained-attack-sequence.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createChainedAttackSequenceDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(8),
        stateCheck: chainedAttackSequenceStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createChainedAttackSequenceDriver() {
  return defineDriver(chainedAttackDriverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doStartCast: (input: { readonly slotLevel: number }) => {
        state = startCast(state, chainedSlotLevel(input.slotLevel));
      },
      doChooseDamageType: (input: { readonly damageType: unknown }) => {
        state = chooseDamageType(state, chainedDamageType(input.damageType));
      },
      doChooseInitialTarget: () => {
        state = chooseInitialTarget(state);
      },
      doResolveStep0AttackHit: () => {
        state = resolveStepAttackHit(state, 0);
      },
      doResolveStep0DamageNoDuplicate: () => {
        state = resolveStep0DamageNoDuplicate(state);
      },
      doResolveStep0DamageDuplicate: () => {
        state = resolveStep0DamageDuplicate(state);
      },
      doChooseFirstLeapTarget: () => {
        state = chooseFirstLeapTarget(state);
      },
      doResolveStep1AttackHit: () => {
        state = resolveStepAttackHit(state, 1);
      },
      doResolveStep1DuplicateDamageSlot1Limit: () => {
        state = resolveStep1DuplicateDamageSlot1Limit(state);
      },
      doResolveStep1DuplicateDamageSlot2AllowsLeap: () => {
        state = resolveStep1DuplicateDamageSlot2AllowsLeap(state);
      },
      step: () => {},
      getState: () => chainedAttackSequenceProjection(state),
    };
  });
}

async function replayChainedAttackDriverAction(
  driver: ChainedAttackDriver,
  slotLevel: ChainedSlotLevel,
  actionName: ChainedAttackDriverAction,
): Promise<void> {
  if (actionName === "doStartCast") {
    await driver.actions.doStartCast.handler({ slotLevel });
    return;
  }
  if (actionName === "doChooseDamageType") {
    await driver.actions.doChooseDamageType.handler({ damageType: "fire" });
    return;
  }
  if (actionName === "doChooseInitialTarget") {
    await driver.actions.doChooseInitialTarget.handler({});
    return;
  }
  if (actionName === "doResolveStep0AttackHit") {
    await driver.actions.doResolveStep0AttackHit.handler({});
    return;
  }
  if (actionName === "doResolveStep0DamageNoDuplicate") {
    await driver.actions.doResolveStep0DamageNoDuplicate.handler({});
    return;
  }
  if (actionName === "doResolveStep0DamageDuplicate") {
    await driver.actions.doResolveStep0DamageDuplicate.handler({});
    return;
  }
  if (actionName === "doChooseFirstLeapTarget") {
    await driver.actions.doChooseFirstLeapTarget.handler({});
    return;
  }
  if (actionName === "doResolveStep1AttackHit") {
    await driver.actions.doResolveStep1AttackHit.handler({});
    return;
  }
  if (actionName === "doResolveStep1DuplicateDamageSlot1Limit") {
    await driver.actions.doResolveStep1DuplicateDamageSlot1Limit.handler({});
    return;
  }
  if (actionName === "doResolveStep1DuplicateDamageSlot2AllowsLeap") {
    await driver.actions.doResolveStep1DuplicateDamageSlot2AllowsLeap.handler(
      {},
    );
    return;
  }
  const unhandled: never = actionName;
  throw new Error(`Unhandled chained attack action ${String(unhandled)}.`);
}

function initialRuntimeState(): ChainedAttackRuntimeState {
  const battle = spellBattle({
    preparedSpells: [spellRecord(chromaticOrbUnitId)],
    spellSlots: [
      { spellLevel: 1, count: 1 },
      { spellLevel: 2, count: 1 },
    ],
    extraTargetIds: [secondTargetId, thirdTargetId],
  });
  return {
    baseBattle: battle,
    projectionBattle: battle,
    subject: null,
    fills: [],
    holes: [],
    damageType: "none",
    slotLevel: 0,
    targeted: [],
    previousTarget: "none",
    leapsUsed: 0,
    stepIndex: 0,
    step0AttackTotal: 0,
    step0NaturalD20: 0,
    step0DamageTotal: 0,
    step0DamageHasDuplicate: false,
    step1AttackTotal: 0,
    step1NaturalD20: 0,
    step1DamageTotal: 0,
    step1DamageHasDuplicate: false,
    lastResult: "init",
  };
}

function startCast(
  state: ChainedAttackRuntimeState,
  slotLevel: ChainedSlotLevel,
): ChainedAttackRuntimeState {
  const act = chainedAttackAct(state.baseBattle, slotLevel);
  return {
    ...state,
    subject: act.subject,
    holes: act.initialHoles,
    slotLevel,
    lastResult: "awaitingDamageType",
  };
}

function chooseDamageType(
  state: ChainedAttackRuntimeState,
  damageType: ChainedDamageType,
): ChainedAttackRuntimeState {
  const subject = requireSubject(state);
  const damageTypeHole = requireHole(state.holes, "damageTypeChoice");
  const fill = damageTypeFill(damageTypeHole, damageType);
  const result = requireNeedsHoles(
    resolveBattleSubject({
      state: state.baseBattle,
      subject,
      fills: [fill],
    }),
    "Expected chained attack target hole.",
  );
  return {
    ...state,
    projectionBattle: result.state,
    fills: [fill],
    holes: result.holes,
    damageType,
    lastResult: "awaitingInitialTarget",
  };
}

function chooseInitialTarget(
  state: ChainedAttackRuntimeState,
): ChainedAttackRuntimeState {
  const subject = requireSubject(state);
  const targetHole = requireHole(state.holes, "targetChoice");
  const fill = spellTargetFill(targetHole, "first");
  const result = requireNeedsHoles(
    resolveBattleSubject({
      state: state.baseBattle,
      subject,
      fills: [...state.fills, fill],
    }),
    "Expected chained attack roll hole.",
  );
  return {
    ...state,
    projectionBattle: result.state,
    fills: [...state.fills, fill],
    holes: result.holes,
    targeted: ["first"],
    previousTarget: "first",
    stepIndex: 0,
    lastResult: "awaitingStep0Attack",
  };
}

function resolveStepAttackHit(
  state: ChainedAttackRuntimeState,
  stepIndex: 0 | 1,
): ChainedAttackRuntimeState {
  const subject = requireSubject(state);
  const attackHole = requireHole(state.holes, "attackRoll");
  const attackTotal = 18;
  const naturalD20 = 12;
  const fill = attackRollFill(attackHole, attackTotal, naturalD20);
  const result = requireNeedsHoles(
    resolveBattleSubject({
      state: state.baseBattle,
      subject,
      fills: [...state.fills, fill],
    }),
    "Expected chained damage roll hole.",
  );
  return {
    ...state,
    projectionBattle: result.state,
    fills: [...state.fills, fill],
    holes: result.holes,
    stepIndex,
    ...(stepIndex === 0
      ? {
          step0AttackTotal: attackTotal,
          step0NaturalD20: naturalD20,
          lastResult: "awaitingStep0Damage" as const,
        }
      : {
          step1AttackTotal: attackTotal,
          step1NaturalD20: naturalD20,
          lastResult: "awaitingStep1Damage" as const,
        }),
  };
}

function resolveStep0DamageNoDuplicate(
  state: ChainedAttackRuntimeState,
): ChainedAttackRuntimeState {
  const faces = state.slotLevel === 1 ? [1, 2, 3] : [1, 2, 3, 4];
  const damageTotal = damageRollTotal(faces);
  const result = resolveDamageRoll(state, faces, "resolved");
  return {
    ...state,
    projectionBattle: result.state,
    fills: [...state.fills, result.fill],
    holes: [],
    step0DamageTotal: damageTotal,
    step0DamageHasDuplicate: false,
    lastResult: "step0NoLeapComplete",
  };
}

function resolveStep0DamageDuplicate(
  state: ChainedAttackRuntimeState,
): ChainedAttackRuntimeState {
  const faces = state.slotLevel === 1 ? [2, 2, 5] : [2, 2, 5, 1];
  const damageTotal = damageRollTotal(faces);
  const result = resolveDamageRoll(state, faces, "needsHoles");
  return {
    ...state,
    projectionBattle: result.state,
    fills: [...state.fills, result.fill],
    holes: result.holes,
    step0DamageTotal: damageTotal,
    step0DamageHasDuplicate: true,
    previousTarget: "first",
    lastResult: "awaitingFirstLeapTarget",
  };
}

function chooseFirstLeapTarget(
  state: ChainedAttackRuntimeState,
): ChainedAttackRuntimeState {
  const subject = requireSubject(state);
  const targetHole = requireHole(state.holes, "targetChoice");
  const fill = spellLeapTargetFill(targetHole, "first", "second");
  const result = requireNeedsHoles(
    resolveBattleSubject({
      state: state.baseBattle,
      subject,
      fills: [...state.fills, fill],
    }),
    "Expected first leap attack roll hole.",
  );
  return {
    ...state,
    projectionBattle: result.state,
    fills: [...state.fills, fill],
    holes: result.holes,
    targeted: ["first", "second"],
    previousTarget: "second",
    leapsUsed: 1,
    stepIndex: 1,
    lastResult: "awaitingStep1Attack",
  };
}

function resolveStep1DuplicateDamageSlot1Limit(
  state: ChainedAttackRuntimeState,
): ChainedAttackRuntimeState {
  const faces = [1, 1, 1];
  const result = resolveDamageRoll(state, faces, "resolved");
  return {
    ...state,
    projectionBattle: result.state,
    fills: [...state.fills, result.fill],
    holes: [],
    step1DamageTotal: damageRollTotal(faces),
    step1DamageHasDuplicate: true,
    lastResult: "slot1LeapLimitComplete",
  };
}

function resolveStep1DuplicateDamageSlot2AllowsLeap(
  state: ChainedAttackRuntimeState,
): ChainedAttackRuntimeState {
  const faces = [1, 1, 1, 1];
  const result = resolveDamageRoll(state, faces, "needsHoles");
  return {
    ...state,
    projectionBattle: result.state,
    fills: [...state.fills, result.fill],
    holes: result.holes,
    step1DamageTotal: damageRollTotal(faces),
    step1DamageHasDuplicate: true,
    lastResult: "awaitingSecondLeapTarget",
  };
}

function resolveDamageRoll(
  state: ChainedAttackRuntimeState,
  faces: readonly number[],
  expectedTag: "needsHoles" | "resolved",
): {
  readonly state: BattleState;
  readonly fill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly holes: readonly BattleHole[];
} {
  const subject = requireSubject(state);
  const damageHole = requireHole(state.holes, "rolledDice");
  const fill = damageRollFill(damageHole, faces);
  const result = resolveBattleSubject({
    state: state.baseBattle,
    subject,
    fills: [...state.fills, fill],
  });
  if (result.tag !== expectedTag) {
    throw new Error(`Expected ${expectedTag}, got ${result.tag}.`);
  }
  return {
    state: result.state,
    fill,
    holes: result.tag === "needsHoles" ? result.holes : [],
  };
}

function chainedAttackSequenceProjection(
  state: ChainedAttackRuntimeState,
): ChainedAttackSequenceState {
  return {
    damageType: state.damageType,
    slotLevel: state.slotLevel,
    targeted: state.targeted,
    previousTarget: state.previousTarget,
    leapsUsed: state.leapsUsed,
    stepIndex: state.stepIndex,
    firstTargetHp: combatantHp(state.projectionBattle, spellTargetId),
    secondTargetHp: combatantHp(state.projectionBattle, secondTargetId),
    thirdTargetHp: combatantHp(state.projectionBattle, thirdTargetId),
    step0AttackTotal: state.step0AttackTotal,
    step0NaturalD20: state.step0NaturalD20,
    step0DamageTotal: state.step0DamageTotal,
    step0DamageHasDuplicate: state.step0DamageHasDuplicate,
    step1AttackTotal: state.step1AttackTotal,
    step1NaturalD20: state.step1NaturalD20,
    step1DamageTotal: state.step1DamageTotal,
    step1DamageHasDuplicate: state.step1DamageHasDuplicate,
    holes: battleHolesToChainedHoles(state.holes, state.lastResult),
    lastResult: state.lastResult,
  };
}

function chainedAttackAct(
  state: BattleState,
  slotLevel: ChainedSlotLevel,
): ChainedActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ChainedActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "chainedSpellAttackDamage" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      Number(candidate.subject.invocation.slotLevel) === slotLevel,
  );
  if (act === undefined) {
    throw new Error(`Expected chained spell attack act at slot ${slotLevel}.`);
  }
  return act;
}

function requireSubject(
  state: ChainedAttackRuntimeState,
): ChainedAttackSubject {
  if (state.subject === null) {
    throw new Error("Expected chained attack subject.");
  }
  return state.subject;
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function requireNeedsHoles(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error(message);
  }
  return result;
}

function damageTypeFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: ChainedDamageType,
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  target: ChainedTargetLabel,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const targetId = targetIdsByLabel[target];
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: spellCasterId,
        targetId,
        spellId: chromaticOrbUnitId,
      },
    ],
  };
}

function spellLeapTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  previousTarget: ChainedTargetLabel,
  target: ChainedTargetLabel,
  inRange = true,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const previousTargetId = targetIdsByLabel[previousTarget];
  const targetId = targetIdsByLabel[target];
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: inRange
      ? [
          {
            kind: "spellLeapTargetWithinRange",
            previousTargetId,
            targetId,
            spellId: chromaticOrbUnitId,
            rangeFeet: movementFeet(30),
          },
        ]
      : [],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  total: number,
  naturalD20: number,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: { total, naturalD20: DieRollResult(naturalD20) },
  };
}

function damageRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  faces: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [first, ...rest] = faces;
  if (first === undefined) {
    throw new Error("Expected at least one damage die face.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(first), ...rest.map(DieRollResult)] }],
  };
}

function damageRollTotal(faces: readonly number[]): number {
  return faces.reduce((total, face) => total + face, 0);
}

function battleHolesToChainedHoles(
  holes: readonly BattleHole[],
  lastResult: ChainedLastResult,
): readonly ChainedHole[] {
  if (holes.length === 0) return [];
  return holes
    .map((hole): ChainedHole => {
      if (hole.kind === "damageTypeChoice") return "DamageTypeChoice";
      if (
        hole.kind === "targetChoice" &&
        lastResult === "awaitingInitialTarget"
      ) {
        return "TargetChoice0";
      }
      if (hole.kind === "attackRoll" && lastResult === "awaitingStep0Attack") {
        return "AttackRoll0";
      }
      if (hole.kind === "rolledDice" && lastResult === "awaitingStep0Damage") {
        return "DamageRoll0";
      }
      if (
        hole.kind === "targetChoice" &&
        lastResult === "awaitingFirstLeapTarget"
      ) {
        return "TargetChoice1";
      }
      if (hole.kind === "attackRoll" && lastResult === "awaitingStep1Attack") {
        return "AttackRoll1";
      }
      if (hole.kind === "rolledDice" && lastResult === "awaitingStep1Damage") {
        return "DamageRoll1";
      }
      if (
        hole.kind === "targetChoice" &&
        lastResult === "awaitingSecondLeapTarget"
      ) {
        return "TargetChoice2";
      }
      throw new Error(`Unexpected chained attack hole ${hole.kind}.`);
    })
    .sort();
}

function combatantHp(state: BattleState, combatantId: CombatantId): number {
  return Number(requireCombatant(state, combatantId).hp);
}

function normalizeChainedAttackQuintState(
  raw: unknown,
): ChainedAttackSequenceState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const lastResult = chainedLastResult(state["qScenarioOutcome"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "none",
    decodeHole: chainedHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "chained attack",
    scenarioOutcome: lastResult,
    protocol,
  });
  return {
    damageType: chainedDamageTypeOrNone(state["qDamageType"]),
    slotLevel: numberFromQuintInt(state["qSlotLevel"], "qSlotLevel"),
    targeted: quintSet(state["qTargeted"], "qTargeted")
      .map(chainedTargetLabel)
      .sort(),
    previousTarget: chainedPreviousTarget(state["qPreviousTarget"]),
    leapsUsed: numberFromQuintInt(state["qLeapsUsed"], "qLeapsUsed"),
    stepIndex: numberFromQuintInt(state["qStepIndex"], "qStepIndex"),
    firstTargetHp: numberFromQuintInt(
      state["qFirstTargetHp"],
      "qFirstTargetHp",
    ),
    secondTargetHp: numberFromQuintInt(
      state["qSecondTargetHp"],
      "qSecondTargetHp",
    ),
    thirdTargetHp: numberFromQuintInt(
      state["qThirdTargetHp"],
      "qThirdTargetHp",
    ),
    step0AttackTotal: numberFromQuintInt(
      state["qStep0AttackTotal"],
      "qStep0AttackTotal",
    ),
    step0NaturalD20: numberFromQuintInt(
      state["qStep0NaturalD20"],
      "qStep0NaturalD20",
    ),
    step0DamageTotal: numberFromQuintInt(
      state["qStep0DamageTotal"],
      "qStep0DamageTotal",
    ),
    step0DamageHasDuplicate: booleanField(state, "qStep0DamageHasDuplicate"),
    step1AttackTotal: numberFromQuintInt(
      state["qStep1AttackTotal"],
      "qStep1AttackTotal",
    ),
    step1NaturalD20: numberFromQuintInt(
      state["qStep1NaturalD20"],
      "qStep1NaturalD20",
    ),
    step1DamageTotal: numberFromQuintInt(
      state["qStep1DamageTotal"],
      "qStep1DamageTotal",
    ),
    step1DamageHasDuplicate: booleanField(state, "qStep1DamageHasDuplicate"),
    holes: protocol.holes,
    lastResult,
  };
}

function compareChainedAttackStates(
  runtime: ChainedAttackSequenceState,
  quint: ChainedAttackSequenceState,
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

function chainedSlotLevel(raw: unknown): ChainedSlotLevel {
  if (raw === 1 || raw === 2) return raw;
  throw new Error(`Unknown chained attack slot level: ${String(raw)}.`);
}

function chainedDamageType(raw: unknown): ChainedDamageType {
  if (isChainedDamageType(raw)) {
    return raw;
  }
  throw new Error(`Unknown chained attack damage type: ${String(raw)}.`);
}

function chainedDamageTypeOrNone(raw: unknown): ChainedDamageTypeState {
  if (raw === "none") return raw;
  return chainedDamageType(raw);
}

function chainedTargetLabel(raw: unknown): ChainedTargetLabel {
  if (isChainedTargetLabel(raw)) {
    return raw;
  }
  throw new Error(`Unknown chained attack target: ${String(raw)}.`);
}

function chainedPreviousTarget(raw: unknown): ChainedPreviousTarget {
  if (raw === "none") return raw;
  return chainedTargetLabel(raw);
}

function chainedHole(raw: unknown): ChainedHole {
  const tag = quintVariantTag(raw, "protocol.holes");
  if (isChainedHole(tag)) {
    return tag;
  }
  throw new Error(`Unknown chained attack hole: ${String(raw)}.`);
}

function chainedLastResult(raw: unknown): ChainedLastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value = CHAINED_ATTACK_SEQUENCE_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(
    `Expected Quint scenario outcome variant qScenarioOutcome, got ${tag}.`,
  );
}

function isChainedDamageType(raw: unknown): raw is ChainedDamageType {
  return CHAINED_DAMAGE_TYPES.some((value) => value === raw);
}

function isChainedTargetLabel(raw: unknown): raw is ChainedTargetLabel {
  return CHAINED_TARGET_LABELS.some((value) => value === raw);
}

function isChainedHole(raw: unknown): raw is ChainedHole {
  return CHAINED_HOLE_NAMES.some((value) => value === raw);
}
