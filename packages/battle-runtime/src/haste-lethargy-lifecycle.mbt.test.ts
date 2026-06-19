// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-haste-positive
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Haste: when the spell
//   ends, the target is Incapacitated and has Speed 0 until the end of its next
//   turn.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration: a Concentration
//   effect ends when its creator loses Concentration.
// - UBIQUITOUS_LANGUAGE.md: Concentration, Incapacitated, Speed, Spell Effect.
// Boundary: literal lifecycle projection witness. Haste positive-effect
// arithmetic remains owned by BATTLE.SPELL.HASTE_POSITIVE_EFFECTS.
import { describe, expect, it } from "vitest";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";

import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
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
  breakBattleConcentration,
  endTurn,
  resolveBattleSubject,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import {
  hasteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";

const hasteLethargyScenarios = [
  "init",
  "concentrationEnded",
  "durationExpired",
  "recastReplacement",
  "targetConcentrationBroken",
  "targetTurnCleanupPreserved",
] as const;
type HasteLethargyScenario = (typeof hasteLethargyScenarios)[number];

const hasteLethargyScenarioByQuintTag = {
  Init: "init",
  ConcentrationEnded: "concentrationEnded",
  DurationExpired: "durationExpired",
  RecastReplacement: "recastReplacement",
  TargetConcentrationBroken: "targetConcentrationBroken",
  TargetTurnCleanupPreserved: "targetTurnCleanupPreserved",
} as const satisfies Readonly<Record<string, HasteLethargyScenario>>;

type HasteLethargyHole = "hasteLethargyLifecycle";
const syntheticTargetConcentrationSpellId =
  "synthetic_target_concentration_spell";

type HasteLethargyProjection = {
  readonly scenario: HasteLethargyScenario;
  readonly casterConcentrating: boolean;
  readonly positiveEffectCount: number;
  readonly lethargyConditionActive: boolean;
  readonly lethargySpeedZeroActive: boolean;
  readonly targetIncapacitated: boolean;
  readonly targetWalkSpeedFeet: number;
  readonly targetConcentrating: boolean;
  readonly targetConcentrationEffectActive: boolean;
  readonly spellSlotExpended: number;
  readonly currentSpellActionResourceCount: number;
  readonly preexistingIncapacitatedPreserved: boolean;
};

type HasteLethargyRuntimeState = {
  readonly battle: BattleState;
  readonly scenario: HasteLethargyScenario;
  readonly preexistingIncapacitatedPreserved: boolean;
};

type HasteLethargyDriverAction =
  | "doBreakConcentration"
  | "doExpireDuration"
  | "doRecastReplacement"
  | "doBreakTargetConcentration"
  | "doCleanupWithPreexistingIncapacitated";

type HasteLethargyReplaySequence = {
  readonly name: string;
  readonly actions: readonly HasteLethargyDriverAction[];
  readonly expected: HasteLethargyProjection;
};

const driverSchema = {
  init: {},
  doBreakConcentration: {},
  doExpireDuration: {},
  doRecastReplacement: {},
  doBreakTargetConcentration: {},
  doCleanupWithPreexistingIncapacitated: {},
  step: {},
} as const;

const replaySequences = [
  {
    name: "concentration-loss-promotes-lethargy",
    actions: ["doBreakConcentration"],
    expected: expectedProjection({
      scenario: "concentrationEnded",
      lethargyConditionActive: true,
      lethargySpeedZeroActive: true,
      targetIncapacitated: true,
      targetWalkSpeedFeet: 0,
      spellSlotExpended: 1,
    }),
  },
  {
    name: "duration-expiry-promotes-lethargy",
    actions: ["doExpireDuration"],
    expected: expectedProjection({
      scenario: "durationExpired",
      lethargyConditionActive: true,
      lethargySpeedZeroActive: true,
      targetIncapacitated: true,
      targetWalkSpeedFeet: 0,
      spellSlotExpended: 1,
    }),
  },
  {
    name: "recast-replacement-keeps-new-haste-and-old-lethargy",
    actions: ["doRecastReplacement"],
    expected: expectedProjection({
      scenario: "recastReplacement",
      casterConcentrating: true,
      positiveEffectCount: 5,
      lethargyConditionActive: true,
      lethargySpeedZeroActive: true,
      targetIncapacitated: true,
      targetWalkSpeedFeet: 0,
      spellSlotExpended: 2,
    }),
  },
  {
    name: "lethargy-incapacitated-breaks-target-concentration",
    actions: ["doBreakTargetConcentration"],
    expected: expectedProjection({
      scenario: "targetConcentrationBroken",
      lethargyConditionActive: true,
      lethargySpeedZeroActive: true,
      targetIncapacitated: true,
      targetWalkSpeedFeet: 0,
      spellSlotExpended: 1,
    }),
  },
  {
    name: "target-turn-cleanup-preserves-unrelated-incapacitated",
    actions: ["doCleanupWithPreexistingIncapacitated"],
    expected: expectedProjection({
      scenario: "targetTurnCleanupPreserved",
      targetIncapacitated: true,
      targetWalkSpeedFeet: 30,
      spellSlotExpended: 1,
      preexistingIncapacitatedPreserved: true,
    }),
  },
] as const satisfies readonly HasteLethargyReplaySequence[];

const hasteLethargyStateCheck = stateCheck(
  normalizeHasteLethargyQuintState,
  compareHasteLethargyStates,
);

describe("Haste lethargy lifecycle MBT parity", () => {
  it("replays every focused Haste lethargy path deterministically", async () => {
    for (const sequence of replaySequences) {
      const driver = createHasteLethargyDriver()();

      for (const actionName of sequence.actions) {
        const action = driver.actions[actionName];
        if (action === undefined) {
          throw new Error(`Missing Haste lethargy action ${actionName}.`);
        }
        await action.handler({});
      }

      const runtime = driver.getState?.();
      if (runtime === undefined) {
        throw new Error("Haste lethargy driver must expose getState.");
      }
      expect(runtime, sequence.name).toEqual(sequence.expected);
    }
  });

  it(
    "matches focused Haste lethargy lifecycle traces against Quint",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-haste-lethargy-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createHasteLethargyDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: hasteLethargyStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createHasteLethargyDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doBreakConcentration: () => {
        state = concentrationEndedState();
      },
      doExpireDuration: () => {
        state = durationExpiredState();
      },
      doRecastReplacement: () => {
        state = recastReplacementState();
      },
      doBreakTargetConcentration: () => {
        state = targetConcentrationBrokenState();
      },
      doCleanupWithPreexistingIncapacitated: () => {
        state = cleanupWithPreexistingIncapacitatedState();
      },
      step: () => {},
      getState: () => hasteLethargyProjection(state),
    };
  });
}

function initialRuntimeState(): HasteLethargyRuntimeState {
  return {
    battle: hasteBattle(),
    scenario: "init",
    preexistingIncapacitatedPreserved: false,
  };
}

function concentrationEndedState(): HasteLethargyRuntimeState {
  const cast = castHaste(hasteBattle());
  return {
    battle: breakBattleConcentration(cast, spellCasterId),
    scenario: "concentrationEnded",
    preexistingIncapacitatedPreserved: false,
  };
}

function durationExpiredState(): HasteLethargyRuntimeState {
  const cast = castHaste(hasteBattle());
  const nearExpiry = stateWithHasteDurationTicks(cast, elapsedTimeTicks(1));
  return {
    battle: expectEndTurn(
      expectEndTurn(nearExpiry, spellCasterId),
      spellTargetId,
    ),
    scenario: "durationExpired",
    preexistingIncapacitatedPreserved: false,
  };
}

function recastReplacementState(): HasteLethargyRuntimeState {
  const first = castHaste(hasteBattle());
  const nextCasterTurn = expectEndTurn(
    expectEndTurn(first, spellCasterId),
    spellTargetId,
  );
  return {
    battle: castHaste(nextCasterTurn),
    scenario: "recastReplacement",
    preexistingIncapacitatedPreserved: false,
  };
}

function targetConcentrationBrokenState(): HasteLethargyRuntimeState {
  const cast = castHaste(stateWithSyntheticTargetConcentration(hasteBattle()));
  return {
    battle: breakBattleConcentration(cast, spellCasterId),
    scenario: "targetConcentrationBroken",
    preexistingIncapacitatedPreserved: false,
  };
}

function cleanupWithPreexistingIncapacitatedState(): HasteLethargyRuntimeState {
  const initial = stateWithDirectIncapacitated(hasteBattle(), spellTargetId);
  const cast = castHaste(initial);
  const concentrationEnded = breakBattleConcentration(cast, spellCasterId);
  const cleaned = expectEndTurn(
    expectEndTurn(concentrationEnded, spellCasterId),
    spellTargetId,
  );
  return {
    battle: cleaned,
    scenario: "targetTurnCleanupPreserved",
    preexistingIncapacitatedPreserved: true,
  };
}

function hasteBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(hasteUnitId)],
    spellSlots: [{ spellLevel: 3, count: 2 }],
  });
}

function castHaste(state: BattleState): BattleState {
  const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          hasteUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    }),
  );
  return resolved.state;
}

function expectEndTurn(state: BattleState, actorId: CombatantId): BattleState {
  const result = endTurn({ state, actorId });
  return requireResolved(result).state;
}

function hasteLethargyProjection(
  state: HasteLethargyRuntimeState,
): HasteLethargyProjection {
  const caster = requireCombatant(state.battle, spellCasterId);
  const target = requireCombatant(state.battle, spellTargetId);
  return {
    scenario: state.scenario,
    casterConcentrating:
      caster.concentration?.effectKind === "spellEffect" &&
      caster.concentration.sourceSpellId === hasteUnitId,
    positiveEffectCount: positiveHasteEffectCount(target),
    lethargyConditionActive: hasHasteLethargyCondition(target),
    lethargySpeedZeroActive: hasHasteSpeedZero(target),
    targetIncapacitated: hasCondition(target.conditions, "incapacitated"),
    targetWalkSpeedFeet: Number(effectiveWalkSpeed(target)),
    targetConcentrating:
      target.concentration?.effectKind === "spellEffect" &&
      target.concentration.sourceSpellId ===
        syntheticTargetConcentrationSpellId,
    targetConcentrationEffectActive:
      hasSyntheticTargetConcentrationEffect(target),
    spellSlotExpended: casterSpellSlotExpended(state.battle),
    currentSpellActionResourceCount: hasteCurrentSpellActionResourceCount(
      state.battle,
    ),
    preexistingIncapacitatedPreserved:
      state.preexistingIncapacitatedPreserved &&
      hasCondition(target.conditions, "incapacitated") &&
      !hasHasteLethargyCondition(target) &&
      !hasHasteSpeedZero(target),
  };
}

function positiveHasteEffectCount(combatant: BattleCreatureState): number {
  return combatant.activeEffects.filter(
    (effect) =>
      isHastePositiveEffectKind(effect.kind) && effectIsOwnedByHaste(effect),
  ).length;
}

function isHastePositiveEffectKind(kind: BattleActiveEffect["kind"]): boolean {
  return (
    kind === "speedRatio" ||
    kind === "spellArmorClassBonus" ||
    kind === "savingThrowRollMode" ||
    kind === "spellGrantedActionResource" ||
    kind === "spellEndTargetState"
  );
}

function hasHasteLethargyCondition(combatant: BattleCreatureState): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      effect.kind === "spellCondition" &&
      effect.sourceSpellId === hasteUnitId &&
      effect.sourceCombatantId === spellCasterId &&
      effect.condition === "incapacitated",
  );
}

function hasHasteSpeedZero(combatant: BattleCreatureState): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      effect.kind === "spellSpeedZero" &&
      effect.sourceSpellId === hasteUnitId &&
      effect.sourceCombatantId === spellCasterId,
  );
}

function hasSyntheticTargetConcentrationEffect(
  combatant: BattleCreatureState,
): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      "sourceSpellId" in effect &&
      effect.sourceSpellId === syntheticTargetConcentrationSpellId &&
      effect.sourceCombatantId === spellTargetId,
  );
}

function effectIsOwnedByHaste(effect: BattleActiveEffect): boolean {
  return (
    "sourceSpellId" in effect &&
    effect.sourceSpellId === hasteUnitId &&
    effect.sourceCombatantId === spellCasterId
  );
}

function casterSpellSlotExpended(state: BattleState): number {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    return 0;
  }
  const slot = caster.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 3,
  );
  return Number(slot?.expended ?? 0);
}

function hasteCurrentSpellActionResourceCount(state: BattleState): number {
  return state.currentTurnResources.actionResources.filter(
    (resource) =>
      resource.source === "spellEffect" &&
      resource.sourceSpellId === hasteUnitId &&
      resource.sourceOwnerId === spellCasterId,
  ).length;
}

function stateWithDirectIncapacitated(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const combatant = requireCombatant(state, combatantId);
  if (combatant.positiveHpUnconscious !== null) {
    throw new Error(
      "Expected direct Incapacitated fixture target to be awake.",
    );
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      conditions: applyCondition(combatant.conditions, "incapacitated"),
    }),
  };
}

function stateWithSyntheticTargetConcentration(
  state: BattleState,
): BattleState {
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
        effectKind: "spellEffect",
        sourceSpellId: syntheticTargetConcentrationSpellId,
      },
      activeEffects: [...target.activeEffects, concentrationEffect],
    }),
  };
}

function stateWithHasteDurationTicks(
  state: BattleState,
  ticks: ReturnType<typeof elapsedTimeTicks>,
): BattleState {
  return {
    ...state,
    combatants: new Map(
      [...state.combatants].map(([combatantId, combatant]) => [
        combatantId,
        {
          ...combatant,
          activeEffects: combatant.activeEffects.map((effect) =>
            effectIsOwnedByHaste(effect) &&
            "expiresAt" in effect &&
            effect.expiresAt.kind === "concentration" &&
            effect.expiresAt.durationTicks !== undefined
              ? // The guards above prove this is a BattleActiveEffect with a
                // tickable Concentration expiration; the spread only replaces
                // that branded duration count.
                ({
                  ...effect,
                  expiresAt: { ...effect.expiresAt, durationTicks: ticks },
                } as BattleActiveEffect)
              : effect,
          ),
        },
      ]),
    ),
  };
}

function expectedProjection(
  input: Partial<HasteLethargyProjection> & {
    readonly scenario: HasteLethargyScenario;
  },
): HasteLethargyProjection {
  return {
    scenario: input.scenario,
    casterConcentrating: input.casterConcentrating ?? false,
    positiveEffectCount: input.positiveEffectCount ?? 0,
    lethargyConditionActive: input.lethargyConditionActive ?? false,
    lethargySpeedZeroActive: input.lethargySpeedZeroActive ?? false,
    targetIncapacitated: input.targetIncapacitated ?? false,
    targetWalkSpeedFeet: input.targetWalkSpeedFeet ?? 30,
    targetConcentrating: input.targetConcentrating ?? false,
    targetConcentrationEffectActive:
      input.targetConcentrationEffectActive ?? false,
    spellSlotExpended: input.spellSlotExpended ?? 0,
    currentSpellActionResourceCount: input.currentSpellActionResourceCount ?? 0,
    preexistingIncapacitatedPreserved:
      input.preexistingIncapacitatedPreserved ?? false,
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

function normalizeHasteLethargyQuintState(
  raw: unknown,
): HasteLethargyProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenario = hasteLethargyScenario(state["qScenario"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: hasteLethargyHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "Haste lethargy lifecycle",
    scenarioResult: scenario,
    protocol,
  });
  return {
    scenario,
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    positiveEffectCount: numberFromQuintInt(
      state["qPositiveEffectCount"],
      "qPositiveEffectCount",
    ),
    lethargyConditionActive: booleanField(state, "qLethargyConditionActive"),
    lethargySpeedZeroActive: booleanField(state, "qLethargySpeedZeroActive"),
    targetIncapacitated: booleanField(state, "qTargetIncapacitated"),
    targetWalkSpeedFeet: numberFromQuintInt(
      state["qTargetWalkSpeedFeet"],
      "qTargetWalkSpeedFeet",
    ),
    targetConcentrating: booleanField(state, "qTargetConcentrating"),
    targetConcentrationEffectActive: booleanField(
      state,
      "qTargetConcentrationEffectActive",
    ),
    spellSlotExpended: numberFromQuintInt(
      state["qSpellSlotExpended"],
      "qSpellSlotExpended",
    ),
    currentSpellActionResourceCount: numberFromQuintInt(
      state["qCurrentSpellActionResourceCount"],
      "qCurrentSpellActionResourceCount",
    ),
    preexistingIncapacitatedPreserved: booleanField(
      state,
      "qPreexistingIncapacitatedPreserved",
    ),
  };
}

function hasteLethargyScenario(raw: unknown): HasteLethargyScenario {
  const tag = quintVariantTag(raw, "qScenario");
  const scenario =
    hasteLethargyScenarioByQuintTag[
      tag as keyof typeof hasteLethargyScenarioByQuintTag
    ];
  if (scenario !== undefined) {
    return scenario;
  }
  throw new Error(`Unexpected Haste lethargy scenario ${tag}.`);
}

function hasteLethargyHole(raw: unknown): HasteLethargyHole {
  const tag = quintVariantTag(raw, "Haste lethargy witness hole");
  if (tag === "HasteLethargyLifecycle") {
    return "hasteLethargyLifecycle";
  }
  throw new Error(`Unexpected Haste lethargy witness hole ${tag}.`);
}

function compareHasteLethargyStates(
  runtime: HasteLethargyProjection,
  quint: HasteLethargyProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}
