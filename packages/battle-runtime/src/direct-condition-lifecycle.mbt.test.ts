// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, spellSlotLevel } from "@dnd/shared/types";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  applyDirectConditionSpellEffects,
  battleStateAfterDirectConditionTargetActionEarlyEndForActor,
  beginDirectConditionLaterTurn,
  directConditionCasterConcentrating,
  directConditionRemainsProjected,
  directConditionTargetHasSpellSource,
  resolveDirectConditionCast,
  resolveDirectConditionConcentrationCleanup,
  resolveDirectConditionEarlyEnd,
  tickDirectConditionDuration,
  type DirectConditionLifecycleState,
} from "./battle-reducer/direct-condition-lifecycle.ts";
import { breakBattleConcentration } from "./battle-reducer/damage-apply.ts";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import {
  invisibilityUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import type {
  BattleActiveEffect,
  BattleState,
  SupportedSpellInvocation,
} from "./index.ts";

type DirectConditionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "directCondition" }
>;

type DirectConditionRuntimeState = {
  readonly battle: BattleState;
  readonly compact: DirectConditionLifecycleState;
};

function initialState(
  input: {
    readonly slotLedgerLevel?: number;
    readonly hasNonSpellSource?: boolean;
  } = {},
): DirectConditionLifecycleState {
  return {
    actionAvailable: true,
    slotLedger: {
      slotLevel: input.slotLedgerLevel ?? 2,
      slotsRemaining: 1,
    },
    slotSpellCastThisTurn: false,
    targetCondition:
      input.hasNonSpellSource === true
        ? { tag: "nonSpellSource" }
        : { tag: "absent" },
  };
}

function initialRuntimeState(
  input: {
    readonly slotLedgerLevel?: number;
    readonly hasNonSpellSource?: boolean;
  } = {},
): DirectConditionRuntimeState {
  const slotLedgerLevel = input.slotLedgerLevel ?? 2;
  const battle = spellBattle({
    spellSlots: [
      {
        spellLevel: spellSlotLevelForBattle(slotLedgerLevel),
        count: 1,
      },
    ],
  });
  return {
    battle:
      input.hasNonSpellSource === true
        ? battleWithTargetNonSpellCondition(battle)
        : battle,
    compact: initialState(input),
  };
}

function spellSlotLevelForBattle(
  slotLevel: number,
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
  if (
    Number.isInteger(slotLevel) &&
    slotLevel >= 1 &&
    slotLevel <= 9
  ) {
    return slotLevel as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  }
  throw new Error(`Invalid battle Spell Slot level ${slotLevel}.`);
}

const QuintIntAsNumber = Schema.transform(
  Schema.BigIntFromSelf,
  Schema.Number,
  { strict: true, decode: (n) => Number(n), encode: (n) => BigInt(n) },
);

const intSchema = Schema.standardSchemaV1(QuintIntAsNumber);
const boolSchema = Schema.standardSchemaV1(Schema.Boolean);

const driverSchema = {
  init: {
    slotLedgerLevel: intSchema,
    hasNonSpellSource: boolSchema,
  },
  doCastDirectCondition: {
    slotLevel: intSchema,
  },
  doInvalidUpperSlotCast: {},
  doBeginLaterTurn: {},
  doAttackRollEarlyEnd: {},
  doDamageEarlyEnd: {},
  doSpellCastEarlyEnd: {},
  doConcentrationCleanup: {},
  doDurationTick: {},
  step: {},
} as const;

function createDirectConditionLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: ({ slotLedgerLevel, hasNonSpellSource }) => {
        state = initialRuntimeState({ slotLedgerLevel, hasNonSpellSource });
      },
      doCastDirectCondition: ({ slotLevel }) => {
        state = castDirectConditionInRuntimeState(state, slotLevel);
      },
      doInvalidUpperSlotCast: () => {
        state = castDirectConditionInRuntimeState(state, 10);
      },
      doBeginLaterTurn: () => {
        state = {
          ...state,
          compact: beginDirectConditionLaterTurn(state.compact),
        };
      },
      doAttackRollEarlyEnd: () => {
        state = endDirectConditionForTargetActionInRuntimeState(
          state,
          "attackRoll",
        );
      },
      doDamageEarlyEnd: () => {
        state = endDirectConditionForTargetActionInRuntimeState(
          state,
          "damage",
        );
      },
      doSpellCastEarlyEnd: () => {
        state = endDirectConditionForTargetActionInRuntimeState(
          state,
          "spellCast",
        );
      },
      doConcentrationCleanup: () => {
        state = {
          battle: breakBattleConcentration(state.battle, spellCasterId),
          compact: resolveDirectConditionConcentrationCleanup(state.compact),
        };
      },
      doDurationTick: () => {
        state = {
          battle: {
            ...state.battle,
            combatants: tickDurationEffects(state.battle.combatants).value,
          },
          compact: tickDirectConditionDuration(state.compact),
        };
      },
      step: () => {},
      getState: () => directConditionRuntimeProjection(state),
    };
  });
}

function castDirectConditionInRuntimeState(
  state: DirectConditionRuntimeState,
  slotLevel: number,
): DirectConditionRuntimeState {
  const compact = resolveDirectConditionCast(state.compact, slotLevel);
  if (compact === state.compact) {
    return state;
  }
  const concentrated = battleWithCasterConcentration(state.battle);
  return {
    compact,
    battle: applyDirectConditionSpellEffects(
      concentrated,
      spellCasterId,
      [spellTargetId],
      directConditionInvocation(slotLevel),
    ),
  };
}

function endDirectConditionForTargetActionInRuntimeState(
  state: DirectConditionRuntimeState,
  trigger: "attackRoll" | "damage" | "spellCast",
): DirectConditionRuntimeState {
  return {
    battle: battleStateAfterDirectConditionTargetActionEarlyEndForActor(
      state.battle,
      spellTargetId,
    ),
    compact: resolveDirectConditionEarlyEnd(state.compact, trigger),
  };
}

function directConditionRuntimeProjection(
  state: DirectConditionRuntimeState,
): DirectConditionLifecycleState {
  const projection = {
    ...state.compact,
    targetCondition: directConditionTargetProjection(state.battle),
  };
  const caster = requireCombatant(state.battle, spellCasterId);
  const expectedConcentration =
    directConditionTargetHasSpellSource(projection.targetCondition);
  expect(caster.concentration !== null).toBe(expectedConcentration);
  if (expectedConcentration) {
    expect(caster.concentration).toEqual({
      sourceSpellId: invisibilityUnitId,
      effectKind: "spellEffect",
    });
  }
  return projection;
}

function directConditionTargetProjection(
  battle: BattleState,
): DirectConditionLifecycleState["targetCondition"] {
  const target = requireCombatant(battle, spellTargetId);
  const effect = directConditionEffects(battle)[0];
  if (effect === undefined) {
    return hasCondition(target.conditions, "invisible")
      ? { tag: "nonSpellSource" }
      : { tag: "absent" };
  }
  const durationTicks =
    effect.expiresAt.kind === "concentration"
      ? Number(effect.expiresAt.durationTicks)
      : 0;
  return effect.conditionHadNonSpellSource
    ? { tag: "spellAndNonSpell", durationTicks }
    : { tag: "spellOnly", durationTicks };
}

function directConditionEffects(
  battle: BattleState,
): readonly Extract<
  BattleActiveEffect,
  { readonly kind: "targetActionEndedSpellCondition" }
>[] {
  return requireCombatant(battle, spellTargetId).activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "targetActionEndedSpellCondition" }
    > =>
      effect.kind === "targetActionEndedSpellCondition" &&
      effect.sourceSpellId === invisibilityUnitId &&
      effect.sourceCombatantId === spellCasterId,
  );
}

function battleWithCasterConcentration(battle: BattleState): BattleState {
  const caster = requireCombatant(battle, spellCasterId);
  return {
    ...battle,
    combatants: new Map(battle.combatants).set(spellCasterId, {
      ...caster,
      concentration: {
        sourceSpellId: invisibilityUnitId,
        effectKind: "spellEffect",
      },
    }),
  };
}

function battleWithTargetNonSpellCondition(battle: BattleState): BattleState {
  const target = requireCombatant(battle, spellTargetId);
  if (target.positiveHpUnconscious !== null) {
    throw new Error("Expected direct-condition MBT target above 0 HP.");
  }
  return {
    ...battle,
    combatants: new Map(battle.combatants).set(spellTargetId, {
      ...target,
      conditions: applyCondition(target.conditions, "invisible"),
    }),
  };
}

function battleWithDirectConditionDuration(
  battle: BattleState,
  durationTicks: number,
): BattleState {
  const target = requireCombatant(battle, spellTargetId);
  return {
    ...battle,
    combatants: new Map(battle.combatants).set(spellTargetId, {
      ...target,
      activeEffects: target.activeEffects.map((effect) =>
        effect.kind === "targetActionEndedSpellCondition" &&
        effect.sourceSpellId === invisibilityUnitId &&
        effect.sourceCombatantId === spellCasterId &&
        effect.expiresAt.kind === "concentration"
          ? {
              ...effect,
              expiresAt: {
                ...effect.expiresAt,
                durationTicks: elapsedTimeTicks(durationTicks),
              },
            }
          : effect,
      ),
    }),
  };
}

function directConditionInvocation(
  slotLevel: number,
): DirectConditionSpellInvocation {
  return {
    access: { tag: "prepared" },
    resource: {
      tag: "spellSlot",
      slotLevel: spellSlotLevel(spellSlotLevelForBattle(slotLevel)),
    },
    procedure: "directCondition",
    spell: spellRecord(invisibilityUnitId),
    actionCost: "magicAction",
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    activeEffect: {
      kind: "targetActionEndedSpellCondition",
      sourceSpellId: invisibilityUnitId,
      sourceCombatantId: spellCasterId,
      condition: "invisible",
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(10),
      },
    },
    rangeFeet: movementFeet(5),
  };
}

const directConditionLifecycleStateCheck = stateCheck(
  normalizeDirectConditionLifecycleQuintState,
  compareDirectConditionLifecycleState,
);

describe("Direct condition lifecycle MBT parity", () => {
  it("applies a spell-owned condition and expends the matching Spell Slot", () => {
    const state = castDirectConditionInRuntimeState(initialRuntimeState(), 2);

    expect(directConditionRuntimeProjection(state)).toEqual({
      actionAvailable: false,
      slotLedger: { slotLevel: 2, slotsRemaining: 0 },
      slotSpellCastThisTurn: true,
      targetCondition: { tag: "spellOnly", durationTicks: 10 },
    });
    expect(directConditionEffects(state.battle)).toHaveLength(1);
  });

  it("rejects impossible requested Spell Slot levels before branding", () => {
    const state = initialState({ slotLedgerLevel: 9 });

    expect(resolveDirectConditionCast(state, 10)).toEqual(state);
  });

  it("preserves an independent non-spell condition source after cleanup", () => {
    const cast = castDirectConditionInRuntimeState(
      initialRuntimeState({ hasNonSpellSource: true }),
      2,
    );

    expect(directConditionRuntimeProjection(cast).targetCondition).toEqual({
      tag: "spellAndNonSpell",
      durationTicks: 10,
    });
    expect(
      directConditionRuntimeProjection(
        endDirectConditionForTargetActionInRuntimeState(cast, "attackRoll"),
      ).targetCondition,
    ).toEqual({ tag: "nonSpellSource" });
    expect(
      directConditionRuntimeProjection({
        battle: breakBattleConcentration(cast.battle, spellCasterId),
        compact: resolveDirectConditionConcentrationCleanup(cast.compact),
      }).targetCondition,
    ).toEqual({ tag: "nonSpellSource" });
  });

  it("removes a spell-only condition on target damage, spell cast, or duration expiry", () => {
    const cast = castDirectConditionInRuntimeState(initialRuntimeState(), 2);

    expect(
      directConditionRuntimeProjection(
        endDirectConditionForTargetActionInRuntimeState(cast, "damage"),
      ),
    ).toMatchObject({
      targetCondition: { tag: "absent" },
    });
    expect(
      directConditionRuntimeProjection(
        endDirectConditionForTargetActionInRuntimeState(cast, "spellCast"),
      ),
    ).toMatchObject({
      targetCondition: { tag: "absent" },
    });

    const expiring = {
      ...cast,
      battle: battleWithDirectConditionDuration(cast.battle, 1),
      compact: {
        ...cast.compact,
        targetCondition: { tag: "spellOnly", durationTicks: 1 } as const,
      },
    };
    expect(
      directConditionRuntimeProjection({
        battle: {
          ...expiring.battle,
          combatants: tickDurationEffects(expiring.battle.combatants).value,
        },
        compact: tickDirectConditionDuration(expiring.compact),
      }),
    ).toMatchObject({
      targetCondition: { tag: "absent" },
    });
  });

  it("derives condition projection and caster Concentration from one target state", () => {
    const cast = directConditionRuntimeProjection(
      castDirectConditionInRuntimeState(initialRuntimeState(), 2),
    );

    expect(directConditionRemainsProjected(cast)).toBe(true);
    expect(directConditionCasterConcentrating(cast)).toBe(true);
    expect(
      directConditionCasterConcentrating(
        resolveDirectConditionConcentrationCleanup(cast),
      ),
    ).toBe(false);
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-direct-condition-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDirectConditionLifecycleDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: directConditionLifecycleStateCheck,
    });
  }, 120_000);
});

function normalizeDirectConditionLifecycleQuintState(
  raw: unknown,
): DirectConditionLifecycleState {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint direct-condition lifecycle state.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  const normalized = {
    actionAvailable: booleanFromQuint(
      state["qActionAvailable"],
      "qActionAvailable",
    ),
    slotLedger: {
      slotLevel: numberFromQuintInt(
        state["qSlotLedgerLevel"],
        "qSlotLedgerLevel",
      ),
      slotsRemaining: numberFromQuintInt(
        state["qSlotsRemaining"],
        "qSlotsRemaining",
      ),
    },
    slotSpellCastThisTurn: booleanFromQuint(
      state["qSlotSpellCastThisTurn"],
      "qSlotSpellCastThisTurn",
    ),
    targetCondition: directConditionTargetFromQuintState(state),
  };
  expectDerivedQuintFlag(
    state,
    "qTargetConditionProjected",
    directConditionRemainsProjected(normalized),
  );
  expectDerivedQuintFlag(
    state,
    "qCasterConcentrating",
    directConditionCasterConcentrating(normalized),
  );
  return normalized;
}

function directConditionTargetFromQuintState(
  state: Readonly<Record<string, unknown>>,
): DirectConditionLifecycleState["targetCondition"] {
  const hasNonSpellSource = booleanFromQuint(
    state["qTargetHasNonSpellSource"],
    "qTargetHasNonSpellSource",
  );
  const hasSpellSource = booleanFromQuint(
    state["qTargetHasSpellSource"],
    "qTargetHasSpellSource",
  );
  const durationTicks = numberFromQuintInt(
    state["qTargetSpellDurationTicks"],
    "qTargetSpellDurationTicks",
  );

  if (hasNonSpellSource && hasSpellSource) {
    return { tag: "spellAndNonSpell", durationTicks };
  }
  if (hasNonSpellSource) {
    return { tag: "nonSpellSource" };
  }
  if (hasSpellSource) {
    return { tag: "spellOnly", durationTicks };
  }
  return { tag: "absent" };
}

function compareDirectConditionLifecycleState(
  runtime: DirectConditionLifecycleState,
  quint: DirectConditionLifecycleState,
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

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanFromQuint(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint Boolean field ${field}.`);
}

function expectDerivedQuintFlag(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: boolean,
): void {
  const actual = booleanFromQuint(state[field], field);
  if (actual !== expected) {
    throw new Error(`Expected Quint ${field} to be ${String(expected)}.`);
  }
}
