// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L13UG-A01-MIND-SPIKE-SELECTED-IDENTITY mind_spike
// UNIT-IDENTITY-MBT-REPLAY: L13UG-A01-MIND-SPIKE-SELECTED-IDENTITY mind_spike doResolveMindSpikeFailedSaveConcentrationDuration doResolveMindSpikeSuccessfulSaveHalfDamage
import * as path from "node:path";

import {
  run,
  stateCheck,
  type SimpleActionMap,
  type SimpleDriver,
} from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";

import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import type { BattleState } from "./index.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  mindSpikeDurationTicks,
  mindSpikeUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  resolveBattleSubject,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";

const driverSchema = {
  init: {},
  step: {},
  doResolveMindSpikeFailedSaveConcentrationDuration: {},
  doResolveMindSpikeSuccessfulSaveHalfDamage: {},
} as const;

const mindSpikeSelectedIdentityResults = [
  "init",
  "mindSpikeFailedSaveConcentrationDuration",
  "mindSpikeSuccessfulSaveHalfDamage",
] as const;
const mindSpikeSelectedIdentityResultSet: ReadonlySet<string> = new Set(
  mindSpikeSelectedIdentityResults,
);
type MindSpikeSelectedIdentityResult =
  (typeof mindSpikeSelectedIdentityResults)[number];
type MindSpikeSelectedIdentityProjection = {
  readonly level2SlotsRemaining: number;
  readonly targetHp: number;
  readonly casterConcentratingOnMindSpike: boolean;
  readonly mindSpikeDurationActive: boolean;
  readonly mindSpikeDurationCleanedUp: boolean;
  readonly targetActiveEffectCount: number;
  readonly lastResult: MindSpikeSelectedIdentityResult;
};
type DriverActionName = keyof typeof driverSchema;
type MindSpikeSelectedIdentityAction = Exclude<
  DriverActionName,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly MindSpikeSelectedIdentityAction[];
  readonly expected: MindSpikeSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L13UG-A01-MIND-SPIKE-SELECTED-IDENTITY";
  readonly unitId: typeof mindSpikeUnitId;
  readonly actions: readonly MindSpikeSelectedIdentityAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L13UG-A01-MIND-SPIKE-SELECTED-IDENTITY",
    unitId: "mind_spike",
    actions: [
      "doResolveMindSpikeFailedSaveConcentrationDuration",
      "doResolveMindSpikeSuccessfulSaveHalfDamage",
    ],
    sequences: [
      {
        name: "failed-save-wisdom-psychic-damage-concentration-duration-cleanup",
        actions: ["doResolveMindSpikeFailedSaveConcentrationDuration"],
        expected: expectedProjection({
          level2SlotsRemaining: 0,
          targetHp: 18,
          casterConcentratingOnMindSpike: true,
          mindSpikeDurationActive: true,
          mindSpikeDurationCleanedUp: true,
          lastResult: "mindSpikeFailedSaveConcentrationDuration",
        }),
      },
      {
        name: "successful-save-half-damage-without-mind-spike-effect",
        actions: ["doResolveMindSpikeSuccessfulSaveHalfDamage"],
        expected: expectedProjection({
          level2SlotsRemaining: 0,
          targetHp: 24,
          lastResult: "mindSpikeSuccessfulSaveHalfDamage",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const mindSpikeDiscoveries = {
  doResolveMindSpikeFailedSaveConcentrationDuration:
    resolveMindSpikeFailedSaveConcentrationDuration,
  doResolveMindSpikeSuccessfulSaveHalfDamage:
    resolveMindSpikeSuccessfulSaveHalfDamage,
} as const satisfies Record<
  MindSpikeSelectedIdentityAction,
  () => MindSpikeSelectedIdentityProjection
>;

describe("Mind Spike selected identity MBT", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      for (const sequence of replay.sequences) {
        const actionName = singleReplayAction(
          replay.unitId,
          sequence.name,
          sequence.actions,
        );
        expect(
          mindSpikeDiscoveries[actionName](),
          `${replay.unitId}:${sequence.name}`,
        ).toEqual(sequence.expected);
      }
    }
  });

  it("replays MBT parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-mind-spike-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDriver,
      backend: "typescript",
      seed: process.env["QUINT_SEED"],
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: mindSpikeStateCheck,
    });
  }, 120_000);
});

const mindSpikeStateCheck = stateCheck(
  normalizeMindSpikeQuintState,
  (spec, impl): boolean => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function createDriver(): SimpleDriver<
  MindSpikeSelectedIdentityProjection,
  SimpleActionMap
> {
  let projection = expectedProjection();
  return {
    actions: {
      init: {
        picks: {},
        handler: () => {
          projection = expectedProjection();
        },
      },
      step: { picks: {}, handler: () => {} },
      doResolveMindSpikeFailedSaveConcentrationDuration: {
        picks: {},
        handler: () => {
          projection = resolveMindSpikeFailedSaveConcentrationDuration();
        },
      },
      doResolveMindSpikeSuccessfulSaveHalfDamage: {
        picks: {},
        handler: () => {
          projection = resolveMindSpikeSuccessfulSaveHalfDamage();
        },
      },
    },
    getState: () => projection,
  };
}

function resolveMindSpikeFailedSaveConcentrationDuration(): MindSpikeSelectedIdentityProjection {
  const spell = spellRecord(mindSpikeUnitId);
  const state = mindSpikeBattle();
  const act = spellAct({ state, spellId: mindSpikeUnitId, slotLevel: 2 });
  expect(act.subject).toEqual({
    tag: "actionSpell",
    actorId: spellCasterId,
    invocation: spellSlotInvocationRef(mindSpikeUnitId, 2, "saveGatedDamage"),
    mode: { tag: "cast" },
  });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  expect(targetHole.choices).toEqual([spellCasterId, spellTargetId]);
  const targetFill = spellTargetFill(
    targetHole,
    mindSpikeUnitId,
    spellCasterId,
    spellTargetId,
  );
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  expect(spellHoleInvocation([savingThrow])).toEqual(
    expect.objectContaining({
      procedure: "saveGatedDamage",
      spell,
      resource: { tag: "spellSlot", slotLevel: 2 },
      ability: "wis",
      targeting: { kind: "singleCombatant" },
      damage: {
        expr: { dice: 3, dieSize: 8 },
        damageType: "psychic",
      },
      successDamage: "half",
      rangeFeet: 120,
      failedSavePostDamageRiders: [],
    }),
  );
  const saveFill = savingThrowOutcomeFill(savingThrow, [
    { targetId: spellTargetId, succeeded: false },
  ]);
  const damageRoll = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, saveFill],
    }),
    "rolledDice",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      saveFill,
      damageRollFillWithGroups(damageRoll, [[4, 4, 4]]),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected selected Mind Spike failed-save replay.");
  }

  const caster = requireCombatant(resolved.state, spellCasterId);
  expect(caster.concentration).toEqual({
    sourceSpellId: mindSpikeUnitId,
    effectKind: "spellEffect",
  });
  const durationActive = hasMindSpikeDurationEffect(resolved.state);
  expect(durationActive).toBe(true);
  const cleanedUp = tickExpiredMindSpikeDuration(resolved.state);

  return expectedProjection({
    level2SlotsRemaining: spellSlotsRemaining(resolved.state, 2),
    targetHp: Number(requireCombatant(resolved.state, spellTargetId).hp),
    casterConcentratingOnMindSpike:
      caster.concentration?.sourceSpellId === mindSpikeUnitId,
    mindSpikeDurationActive: durationActive,
    mindSpikeDurationCleanedUp: mindSpikeDurationCleanedUp(cleanedUp),
    targetActiveEffectCount: requireCombatant(resolved.state, spellTargetId)
      .activeEffects.length,
    lastResult: "mindSpikeFailedSaveConcentrationDuration",
  });
}

function resolveMindSpikeSuccessfulSaveHalfDamage(): MindSpikeSelectedIdentityProjection {
  const state = mindSpikeBattle();
  const caster = requireCombatant(state, spellCasterId);
  const concentratingState = {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      concentration: {
        sourceSpellId: spellId("synthetic_prior_concentration"),
        effectKind: "spellEffect",
      },
    }),
  };
  const act = spellAct({
    state: concentratingState,
    spellId: mindSpikeUnitId,
    slotLevel: 2,
  });
  const targetFill = spellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    mindSpikeUnitId,
    spellCasterId,
    spellTargetId,
  );
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state: concentratingState,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  expect(savingThrow.ability).toBe("wis");
  const saveFill = savingThrowOutcomeFill(savingThrow, [
    { targetId: spellTargetId, succeeded: true },
  ]);
  const damageRoll = requireResultHole(
    resolveBattleSubject({
      state: concentratingState,
      subject: act.subject,
      fills: [targetFill, saveFill],
    }),
    "rolledDice",
  );
  const resolved = resolveBattleSubject({
    state: concentratingState,
    subject: act.subject,
    fills: [
      targetFill,
      saveFill,
      damageRollFillWithGroups(damageRoll, [[4, 4, 4]]),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected selected Mind Spike successful-save replay.");
  }

  const resolvedCaster = requireCombatant(resolved.state, spellCasterId);
  expect(resolvedCaster.concentration).toBeNull();
  expect(hasMindSpikeDurationEffect(resolved.state)).toBe(false);

  return expectedProjection({
    level2SlotsRemaining: spellSlotsRemaining(resolved.state, 2),
    targetHp: Number(requireCombatant(resolved.state, spellTargetId).hp),
    casterConcentratingOnMindSpike: false,
    mindSpikeDurationActive: false,
    mindSpikeDurationCleanedUp: false,
    targetActiveEffectCount: requireCombatant(resolved.state, spellTargetId)
      .activeEffects.length,
    lastResult: "mindSpikeSuccessfulSaveHalfDamage",
  });
}

function mindSpikeBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(mindSpikeUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    targetHp: 30,
    targetMaxHp: 30,
  });
}

function tickExpiredMindSpikeDuration(
  state: BattleState,
): BattleState["combatants"] {
  const caster = requireCombatant(state, spellCasterId);
  const nearlyExpiredCombatants = new Map(state.combatants).set(
    spellCasterId,
    {
      ...caster,
      activeEffects: caster.activeEffects.map((effect) =>
        effect.kind === "spellConcentrationDuration" &&
        effect.sourceSpellId === mindSpikeUnitId &&
        effect.expiresAt.kind === "concentration"
          ? {
              ...effect,
              expiresAt: {
                ...effect.expiresAt,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    },
  );
  return tickDurationEffects(nearlyExpiredCombatants).value;
}

function mindSpikeDurationCleanedUp(
  combatants: BattleState["combatants"],
): boolean {
  const caster = combatants.get(spellCasterId);
  return (
    caster?.concentration === null &&
    !caster.activeEffects.some(
      (effect) =>
        effect.kind === "spellConcentrationDuration" &&
        effect.sourceSpellId === mindSpikeUnitId,
    )
  );
}

function hasMindSpikeDurationEffect(state: BattleState): boolean {
  return requireCombatant(state, spellCasterId).activeEffects.some(
    (effect) =>
      effect.kind === "spellConcentrationDuration" &&
      effect.sourceSpellId === mindSpikeUnitId &&
      effect.expiresAt.kind === "concentration" &&
      effect.expiresAt.durationTicks === mindSpikeDurationTicks,
  );
}

function spellSlotsRemaining(state: BattleState, spellLevel: number): number {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected selected Mind Spike caster to be a character.");
  }
  const slot = caster.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === spellLevel,
  );
  return slot === undefined ? 0 : Number(slot.count) - Number(slot.expended);
}

function singleReplayAction(
  unitId: typeof mindSpikeUnitId,
  sequenceName: string,
  actions: readonly MindSpikeSelectedIdentityAction[],
): MindSpikeSelectedIdentityAction {
  if (actions.length !== 1 || actions[0] === undefined) {
    throw new Error(
      `Expected one Mind Spike selected identity replay action for ${unitId}:${sequenceName}.`,
    );
  }
  return actions[0];
}

function expectedProjection(
  input: Partial<MindSpikeSelectedIdentityProjection> = {},
): MindSpikeSelectedIdentityProjection {
  return {
    level2SlotsRemaining: 1,
    targetHp: 30,
    casterConcentratingOnMindSpike: false,
    mindSpikeDurationActive: false,
    mindSpikeDurationCleanedUp: false,
    targetActiveEffectCount: 0,
    lastResult: "init",
    ...input,
  };
}

function normalizeMindSpikeQuintState(
  raw: unknown,
): MindSpikeSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    level2SlotsRemaining: quintInt(state, "qLevel2SlotsRemaining"),
    targetHp: quintInt(state, "qTargetHp"),
    casterConcentratingOnMindSpike: quintBool(
      state,
      "qCasterConcentratingOnMindSpike",
    ),
    mindSpikeDurationActive: quintBool(state, "qMindSpikeDurationActive"),
    mindSpikeDurationCleanedUp: quintBool(state, "qMindSpikeDurationCleanedUp"),
    targetActiveEffectCount: quintInt(state, "qTargetActiveEffectCount"),
    lastResult: quintSelectedIdentityResult(state, "qLastResult"),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Mind Spike selected identity Quint state record.");
  }
  // Quint stateCheck supplies a record after the object guard; the cast only
  // gives TypeScript an index signature for q-prefixed field lookup.
  return raw as Readonly<Record<string, unknown>>;
}

function quintBool(
  state: Readonly<Record<string, unknown>>,
  key: string,
): boolean {
  const value = state[key];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected boolean Mind Spike Quint field ${key}.`);
}

function quintInt(
  state: Readonly<Record<string, unknown>>,
  key: string,
): number {
  const value = state[key];
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`Expected integer Mind Spike Quint field ${key}.`);
}

function quintSelectedIdentityResult(
  state: Readonly<Record<string, unknown>>,
  key: string,
): MindSpikeSelectedIdentityResult {
  const value = state[key];
  if (isMindSpikeSelectedIdentityResult(value)) {
    return value;
  }
  throw new Error(`Expected Mind Spike selected identity result field ${key}.`);
}

function isMindSpikeSelectedIdentityResult(
  value: unknown,
): value is MindSpikeSelectedIdentityResult {
  return (
    typeof value === "string" && mindSpikeSelectedIdentityResultSet.has(value)
  );
}
