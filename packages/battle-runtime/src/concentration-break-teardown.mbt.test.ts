// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration: a Concentration
//   effect ends when its creator loses Concentration; the creator can end
//   Concentration at any time; another Concentration effect breaks the prior
//   one; damage requires a Constitution Saving Throw with DC 10 or half damage
//   taken, whichever is higher, up to 30.
// - UBIQUITOUS_LANGUAGE.md: Concentration, Spell Effect, Saving Throw.
// Boundary: Incapacitated and death-triggered Concentration breaks stay outside
// this witness; PPW-T14 owns the death path.
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
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  attackRollFill,
  concentrationSavingThrowFill,
  damageRollFill,
} from "./battle-runtime-test-support.ts";
import {
  blurUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackTargetFill,
  requireCombatant,
  requireResultHole,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  breakBattleConcentration,
  combatantId,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

const concentrationBreakTeardownScenarios = [
  "init",
  "concentrationSpellCast",
  "damageSaveNeeded",
  "damageFailedTeardownBeforeNextCommand",
  "voluntaryEndTeardown",
  "replacementTeardownBeforeNewEffect",
] as const;
type ConcentrationBreakTeardownScenario =
  (typeof concentrationBreakTeardownScenarios)[number];

const concentrationBreakTeardownScenarioByQuintTag = {
  Init: "init",
  ConcentrationSpellCast: "concentrationSpellCast",
  DamageSaveNeeded: "damageSaveNeeded",
  DamageFailedTeardownBeforeNextCommand:
    "damageFailedTeardownBeforeNextCommand",
  VoluntaryEndTeardown: "voluntaryEndTeardown",
  ReplacementTeardownBeforeNewEffect: "replacementTeardownBeforeNewEffect",
} as const;
const concentrationBreakTeardownScenarioByTag: Readonly<
  Record<string, ConcentrationBreakTeardownScenario>
> = concentrationBreakTeardownScenarioByQuintTag;

const concentrationBreakTeardownHoles = [
  "concentrationSavingThrow",
  "concentrationBreakTeardown",
] as const;
type ConcentrationBreakTeardownHole =
  (typeof concentrationBreakTeardownHoles)[number];

type ConcentrationBreakTeardownProjection = {
  readonly scenario: ConcentrationBreakTeardownScenario;
  readonly damageTaken: number;
  readonly saveDc: number;
  readonly saveRollTotal: number;
  readonly concentrationSaveOffered: boolean;
  readonly casterConcentrating: boolean;
  readonly blurredEffectCount: number;
  readonly spellSlotExpended: number;
  readonly teardownBeforeNextCommand: boolean;
  readonly replacementStartedAfterTeardown: boolean;
};

type PendingConcentrationSave = {
  readonly state: BattleState;
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
  readonly fills: readonly BattleFill[];
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "concentrationSavingThrow" }
  >;
};

type ConcentrationBreakTeardownRuntimeState = {
  readonly battle: BattleState;
  readonly scenario: ConcentrationBreakTeardownScenario;
  readonly damageTaken: number;
  readonly saveDc: number;
  readonly saveRollTotal: number;
  readonly concentrationSaveOffered: boolean;
  readonly teardownBeforeNextCommand: boolean;
  readonly replacementStartedAfterTeardown: boolean;
  readonly pendingConcentrationSave: PendingConcentrationSave | null;
};

const attackerId = combatantId("concentration-break-attacker");

const driverSchema = {
  init: {},
  doCastConcentrationSpell: {},
  doDamageRequestsConcentrationSave: {
    damageDiePip: mbtPickSchemas.int,
  },
  doFailConcentrationSave: {
    saveRollTotal: mbtPickSchemas.int,
  },
  doVoluntaryEndConcentration: {},
  doCastReplacementConcentrationSpell: {},
  step: {},
} as const;

const replaySequences = [
  {
    name: "damage-failed-save-tears-down-before-next-command",
    actions: [
      ["doCastConcentrationSpell", {}],
      ["doDamageRequestsConcentrationSave", { damageDiePip: 4 }],
      ["doFailConcentrationSave", { saveRollTotal: 9 }],
    ],
    expected: expectedProjection({
      scenario: "damageFailedTeardownBeforeNextCommand",
      damageTaken: 6,
      saveDc: 10,
      saveRollTotal: 9,
      spellSlotExpended: 1,
      teardownBeforeNextCommand: true,
    }),
  },
  {
    name: "voluntary-end-tears-down-before-next-command",
    actions: [["doVoluntaryEndConcentration", {}]],
    expected: expectedProjection({
      scenario: "voluntaryEndTeardown",
      spellSlotExpended: 1,
      teardownBeforeNextCommand: true,
    }),
  },
  {
    name: "replacement-breaks-prior-concentration-before-new-effect",
    actions: [["doCastReplacementConcentrationSpell", {}]],
    expected: expectedProjection({
      scenario: "replacementTeardownBeforeNewEffect",
      casterConcentrating: true,
      blurredEffectCount: 1,
      spellSlotExpended: 1,
      replacementStartedAfterTeardown: true,
    }),
  },
] as const;

const concentrationBreakTeardownStateCheck = stateCheck(
  normalizeConcentrationBreakTeardownQuintState,
  compareConcentrationBreakTeardownStates,
);

describe("Concentration break teardown MBT parity", () => {
  it("replays every focused Concentration break path deterministically", async () => {
    for (const sequence of replaySequences) {
      const driver = createConcentrationBreakTeardownDriver()();

      for (const [actionName, input] of sequence.actions) {
        const action = driver.actions[actionName];
        if (action === undefined) {
          throw new Error(
            `Missing Concentration break teardown driver action ${actionName}.`,
          );
        }
        await action.handler(input as never);
      }

      const runtime = driver.getState?.();
      if (runtime === undefined) {
        throw new Error(
          "Concentration break teardown driver must expose getState.",
        );
      }
      expect(runtime, sequence.name).toEqual(sequence.expected);
    }
  });

  it(
    "matches focused Concentration break teardown traces against Quint",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-concentration-break-teardown.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createConcentrationBreakTeardownDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(3),
        stateCheck: concentrationBreakTeardownStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createConcentrationBreakTeardownDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastConcentrationSpell: () => {
        state = {
          ...stateAfterBlurCast(initialRuntimeState()),
          scenario: "concentrationSpellCast",
        };
      },
      doDamageRequestsConcentrationSave: (input: {
        readonly damageDiePip: number;
      }) => {
        state = damageRequestsConcentrationSave(state, input.damageDiePip);
      },
      doFailConcentrationSave: (input: { readonly saveRollTotal: number }) => {
        state = failConcentrationSave(state, input.saveRollTotal);
      },
      doVoluntaryEndConcentration: () => {
        state = voluntarilyEndConcentration(initialRuntimeState());
      },
      doCastReplacementConcentrationSpell: () => {
        state = castReplacementConcentrationSpell(initialRuntimeState());
      },
      step: () => {},
      getState: () => concentrationBreakTeardownProjection(state),
    };
  });
}

function initialRuntimeState(): ConcentrationBreakTeardownRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(blurUnitId)],
      spellSlots: [{ spellLevel: 2, count: 2 }],
      statBlockTargets: [
        {
          combatantId: attackerId,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 19,
        },
      ],
    }),
    scenario: "init",
    damageTaken: 0,
    saveDc: 0,
    saveRollTotal: 0,
    concentrationSaveOffered: false,
    teardownBeforeNextCommand: false,
    replacementStartedAfterTeardown: false,
    pendingConcentrationSave: null,
  };
}

function stateAfterBlurCast(
  state: ConcentrationBreakTeardownRuntimeState,
): ConcentrationBreakTeardownRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: blurUnitId,
    slotLevel: 2,
  });
  expect(act.initialHoles).toEqual([]);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [],
    }),
  );
  return {
    ...state,
    battle: resolved.state,
    pendingConcentrationSave: null,
  };
}

function damageRequestsConcentrationSave(
  state: ConcentrationBreakTeardownRuntimeState,
  damageDiePip: number,
): ConcentrationBreakTeardownRuntimeState {
  expect(state.scenario).toBe("concentrationSpellCast");
  const attackerTurn = advanceToAttackerTurn(state.battle);
  const attack = statBlockAttackAct(attackerTurn, attackerId, "Scimitar");
  const target = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn,
      subject: attack.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    attackerId,
    spellCasterId,
    "Scimitar",
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 16,
    ...(attackRoll.rollMode === undefined
      ? {}
      : { rollMode: attackRoll.rollMode }),
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn,
      subject: attack.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  const damageFill = damageRollFill(damage, damageDiePip);
  const fills = [targetFill, attackFill, damageFill] as const;
  const pending = resolveBattleSubject({
    state: attackerTurn,
    subject: attack.subject,
    fills,
  });
  expect(pending).toMatchObject({ tag: "needsHoles" });
  if (pending.tag !== "needsHoles") {
    throw new Error("Expected damage to request a Concentration Saving Throw.");
  }
  const concentration = requireResultHole(pending, "concentrationSavingThrow");
  const damageTaken = Number(concentration.damageAmount);
  expect(damageTaken).toBe(damageDiePip + 2);
  return {
    ...state,
    battle: pending.state,
    scenario: "damageSaveNeeded",
    damageTaken,
    saveDc: Number(concentration.dc),
    concentrationSaveOffered: true,
    pendingConcentrationSave: {
      state: pending.state,
      subject: attack.subject,
      fills,
      hole: concentration,
    },
  };
}

function failConcentrationSave(
  state: ConcentrationBreakTeardownRuntimeState,
  saveRollTotal: number,
): ConcentrationBreakTeardownRuntimeState {
  expect(state.scenario).toBe("damageSaveNeeded");
  const pending = state.pendingConcentrationSave;
  if (pending === null) {
    throw new Error("Expected pending Concentration save.");
  }
  expect(saveRollTotal).toBeLessThan(Number(pending.hole.dc));
  const resolved = requireResolved(
    resolveBattleSubject({
      state: pending.state,
      subject: pending.subject,
      fills: [
        ...pending.fills,
        concentrationSavingThrowFill(pending.hole, false),
      ],
    }),
  );
  return {
    ...state,
    battle: resolved.state,
    scenario: "damageFailedTeardownBeforeNextCommand",
    saveRollTotal,
    concentrationSaveOffered: false,
    teardownBeforeNextCommand: concentrationTeardownIsVisibleBeforeNextCommand(
      resolved.state,
    ),
    pendingConcentrationSave: null,
  };
}

function voluntarilyEndConcentration(
  state: ConcentrationBreakTeardownRuntimeState,
): ConcentrationBreakTeardownRuntimeState {
  const cast = stateAfterBlurCast(state);
  const broken = breakBattleConcentration(cast.battle, spellCasterId);
  return {
    ...cast,
    battle: broken,
    scenario: "voluntaryEndTeardown",
    teardownBeforeNextCommand:
      concentrationTeardownIsVisibleBeforeNextCommand(broken),
  };
}

function castReplacementConcentrationSpell(
  state: ConcentrationBreakTeardownRuntimeState,
): ConcentrationBreakTeardownRuntimeState {
  const beforeReplacement = stateWithPreexistingBlurConcentration(state.battle);
  const replaced = stateAfterBlurCast({
    ...state,
    battle: beforeReplacement,
  });
  return {
    ...replaced,
    scenario: "replacementTeardownBeforeNewEffect",
    replacementStartedAfterTeardown: blurredEffectCount(replaced.battle) === 1,
  };
}

function stateWithPreexistingBlurConcentration(
  state: BattleState,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      concentration: {
        sourceSpellId: blurUnitId,
        effectKind: "spellEffect",
      },
      activeEffects: [
        ...caster.activeEffects,
        {
          kind: "blurred",
          sourceSpellId: blurUnitId,
          sourceCombatantId: spellCasterId,
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
          },
        },
      ],
    }),
  };
}

function advanceToAttackerTurn(state: BattleState): BattleState {
  const result = endTurn({ state, actorId: spellCasterId });
  return requireResolved(result).state;
}

function concentrationTeardownIsVisibleBeforeNextCommand(
  state: BattleState,
): boolean {
  const caster = requireCombatant(state, spellCasterId);
  return (
    discoverBattleActs(state).length > 0 &&
    caster.concentration === null &&
    blurredEffectCount(state) === 0
  );
}

function concentrationBreakTeardownProjection(
  state: ConcentrationBreakTeardownRuntimeState,
): ConcentrationBreakTeardownProjection {
  const caster = requireCombatant(state.battle, spellCasterId);
  return {
    scenario: state.scenario,
    damageTaken: state.damageTaken,
    saveDc: state.saveDc,
    saveRollTotal: state.saveRollTotal,
    concentrationSaveOffered: state.concentrationSaveOffered,
    casterConcentrating:
      caster.concentration?.sourceSpellId === blurUnitId &&
      caster.concentration.effectKind === "spellEffect",
    blurredEffectCount: blurredEffectCount(state.battle),
    spellSlotExpended: casterSpellSlotExpended(state.battle),
    teardownBeforeNextCommand: state.teardownBeforeNextCommand,
    replacementStartedAfterTeardown: state.replacementStartedAfterTeardown,
  };
}

function blurredEffectCount(state: BattleState): number {
  return requireCombatant(state, spellCasterId).activeEffects.filter(
    (effect) => effect.kind === "blurred",
  ).length;
}

function casterSpellSlotExpended(state: BattleState): number {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    return 0;
  }
  const slot = caster.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 2,
  );
  return Number(slot?.expended ?? 0);
}

function expectedProjection(
  input: Partial<ConcentrationBreakTeardownProjection> & {
    readonly scenario: ConcentrationBreakTeardownScenario;
  },
): ConcentrationBreakTeardownProjection {
  return {
    scenario: input.scenario,
    damageTaken: input.damageTaken ?? 0,
    saveDc: input.saveDc ?? 0,
    saveRollTotal: input.saveRollTotal ?? 0,
    concentrationSaveOffered: input.concentrationSaveOffered ?? false,
    casterConcentrating: input.casterConcentrating ?? false,
    blurredEffectCount: input.blurredEffectCount ?? 0,
    spellSlotExpended: input.spellSlotExpended ?? 0,
    teardownBeforeNextCommand: input.teardownBeforeNextCommand ?? false,
    replacementStartedAfterTeardown:
      input.replacementStartedAfterTeardown ?? false,
  };
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected battle resolution to resolve.");
  }
  return result;
}

function normalizeConcentrationBreakTeardownQuintState(
  raw: unknown,
): ConcentrationBreakTeardownProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenario = concentrationBreakTeardownScenario(state["qScenario"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: concentrationBreakTeardownHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "Concentration break teardown",
    scenarioOutcome: scenario,
    protocol,
  });
  return {
    scenario,
    damageTaken: numberFromQuintInt(state["qDamageTaken"], "qDamageTaken"),
    saveDc: numberFromQuintInt(state["qSaveDc"], "qSaveDc"),
    saveRollTotal: numberFromQuintInt(
      state["qSaveRollTotal"],
      "qSaveRollTotal",
    ),
    concentrationSaveOffered: booleanField(state, "qConcentrationSaveOffered"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    blurredEffectCount: numberFromQuintInt(
      state["qBlurredEffectCount"],
      "qBlurredEffectCount",
    ),
    spellSlotExpended: numberFromQuintInt(
      state["qSpellSlotExpended"],
      "qSpellSlotExpended",
    ),
    teardownBeforeNextCommand: booleanField(
      state,
      "qTeardownBeforeNextCommand",
    ),
    replacementStartedAfterTeardown: booleanField(
      state,
      "qReplacementStartedAfterTeardown",
    ),
  };
}

function concentrationBreakTeardownHole(
  raw: unknown,
): ConcentrationBreakTeardownHole {
  const tag = quintVariantTag(raw, "Concentration break teardown witness hole");
  if (tag === "ConcentrationSavingThrow") {
    return "concentrationSavingThrow";
  }
  if (tag === "ConcentrationBreakTeardown") {
    return "concentrationBreakTeardown";
  }
  throw new Error(`Unexpected Concentration break teardown hole ${tag}.`);
}

function concentrationBreakTeardownScenario(
  raw: unknown,
): ConcentrationBreakTeardownScenario {
  const tag = quintVariantTag(raw, "qScenario");
  const scenario = concentrationBreakTeardownScenarioByTag[tag];
  if (scenario !== undefined) {
    return scenario;
  }
  throw new Error(`Unexpected Concentration break teardown scenario ${tag}.`);
}

function compareConcentrationBreakTeardownStates(
  runtime: ConcentrationBreakTeardownProjection,
  quint: ConcentrationBreakTeardownProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}
