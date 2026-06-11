// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, spellSlotLevel } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
  stringLiteralValue,
  type MbtWitnessLastResult,
} from "./battle-runtime-mbt-driver-kit.ts";
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
  readonly lastResult: DirectConditionLifecycleMbtLastResult;
};
type DirectConditionLifecycleMbtLastResult = Extract<
  MbtWitnessLastResult,
  "init" | "resolved"
>;
type DirectConditionLifecycleMbtProjection = DirectConditionLifecycleState & {
  readonly lastResult: DirectConditionLifecycleMbtLastResult;
};
type DirectConditionLifecycleMbtHole = "DirectConditionLifecycle";

const DIRECT_CONDITION_NO_INVALID_REASON = "";
const DIRECT_CONDITION_MBT_LAST_RESULTS = ["init", "resolved"] as const;

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
    lastResult: "init",
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

const driverSchema = {
  init: {
    slotLedgerLevel: mbtPickSchemas.int,
    hasNonSpellSource: mbtPickSchemas.bool,
  },
  doCastDirectCondition: {
    slotLevel: mbtPickSchemas.int,
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
        state = resolveDirectConditionMbtStep(
          castDirectConditionInRuntimeState(state, slotLevel),
        );
      },
      doInvalidUpperSlotCast: () => {
        state = resolveDirectConditionMbtStep(
          castDirectConditionInRuntimeState(state, 10),
        );
      },
      doBeginLaterTurn: () => {
        state = resolveDirectConditionMbtStep({
          ...state,
          compact: beginDirectConditionLaterTurn(state.compact),
        });
      },
      doAttackRollEarlyEnd: () => {
        state = resolveDirectConditionMbtStep(
          endDirectConditionForTargetActionInRuntimeState(
            state,
            "attackRoll",
          ),
        );
      },
      doDamageEarlyEnd: () => {
        state = resolveDirectConditionMbtStep(
          endDirectConditionForTargetActionInRuntimeState(
            state,
            "damage",
          ),
        );
      },
      doSpellCastEarlyEnd: () => {
        state = resolveDirectConditionMbtStep(
          endDirectConditionForTargetActionInRuntimeState(
            state,
            "spellCast",
          ),
        );
      },
      doConcentrationCleanup: () => {
        state = resolveDirectConditionMbtStep({
          battle: breakBattleConcentration(state.battle, spellCasterId),
          compact: resolveDirectConditionConcentrationCleanup(state.compact),
          lastResult: state.lastResult,
        });
      },
      doDurationTick: () => {
        state = resolveDirectConditionMbtStep({
          battle: {
            ...state.battle,
            combatants: tickDurationEffects(state.battle.combatants).value,
          },
          compact: tickDirectConditionDuration(state.compact),
          lastResult: state.lastResult,
        });
      },
      step: () => {},
      getState: () => directConditionMbtProjection(state),
    };
  });
}

function resolveDirectConditionMbtStep(
  state: DirectConditionRuntimeState,
): DirectConditionRuntimeState {
  return { ...state, lastResult: "resolved" };
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
    ...state,
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
    ...state,
    battle: battleStateAfterDirectConditionTargetActionEarlyEndForActor(
      state.battle,
      spellTargetId,
    ),
    compact: resolveDirectConditionEarlyEnd(state.compact, trigger),
  };
}

function directConditionRuntimeProjection(
  state: Pick<DirectConditionRuntimeState, "battle" | "compact">,
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

function directConditionMbtProjection(
  state: DirectConditionRuntimeState,
): DirectConditionLifecycleMbtProjection {
  return {
    ...directConditionRuntimeProjection(state),
    lastResult: state.lastResult,
  };
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
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-direct-condition-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDirectConditionLifecycleDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(6),
      stateCheck: directConditionLifecycleStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});

function normalizeDirectConditionLifecycleQuintState(
  raw: unknown,
): DirectConditionLifecycleMbtProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const lifecycle = quintRecordField(state, "lifecycle");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: DIRECT_CONDITION_NO_INVALID_REASON,
    decodeHole: directConditionLifecycleHoleName,
  });
  if (protocol.holes.length !== 0) {
    throw new Error("Expected Direct Condition lifecycle witness holes to be empty.");
  }
  const normalized = {
    actionAvailable: booleanField(lifecycle, "actionAvailable"),
    slotLedger: {
      slotLevel: numberFromQuintInt(
        quintField(
          quintRecordField(lifecycle, "slotLedger"),
          "slotLevel",
        ),
        "qState.lifecycle.slotLedger.slotLevel",
      ),
      slotsRemaining: numberFromQuintInt(
        quintField(
          quintRecordField(lifecycle, "slotLedger"),
          "slotsRemaining",
        ),
        "qState.lifecycle.slotLedger.slotsRemaining",
      ),
    },
    slotSpellCastThisTurn: booleanField(lifecycle, "slotSpellCastThisTurn"),
    targetCondition: directConditionTargetFromQuintValue(
      quintField(lifecycle, "targetCondition"),
    ),
    lastResult: stringLiteralValue(
      protocol.lastResult,
      "qState.protocol.result",
      DIRECT_CONDITION_MBT_LAST_RESULTS,
    ),
  };
  return normalized;
}

function directConditionLifecycleHoleName(
  raw: unknown,
): DirectConditionLifecycleMbtHole {
  return stringLiteralValue(
    raw,
    "qState.protocol.holes",
    ["DirectConditionLifecycle"] as const,
  );
}

function directConditionTargetFromQuintValue(
  raw: unknown,
): DirectConditionLifecycleState["targetCondition"] {
  const tag = quintVariantTag(raw, "qState.lifecycle.targetCondition");
  if (tag === "DirectConditionAbsent") {
    return { tag: "absent" };
  }
  if (tag === "DirectConditionNonSpellSource") {
    return { tag: "nonSpellSource" };
  }
  if (tag === "DirectConditionSpellOnly") {
    return {
      tag: "spellOnly",
      durationTicks: directConditionDurationFromQuintVariant(
        raw,
        "DirectConditionSpellOnly",
      ),
    };
  }
  if (tag === "DirectConditionSpellAndNonSpell") {
    return {
      tag: "spellAndNonSpell",
      durationTicks: directConditionDurationFromQuintVariant(
        raw,
        "DirectConditionSpellAndNonSpell",
      ),
    };
  }
  throw new Error(`Unexpected Direct Condition target variant ${tag}.`);
}

function directConditionDurationFromQuintVariant(
  raw: unknown,
  expectedTag: string,
): number {
  const payload = quintRecordField(
    {
      payload: quintVariantValue(
        raw,
        expectedTag,
        "qState.lifecycle.targetCondition",
      ),
    },
    "payload",
  );
  return numberFromQuintInt(
    quintField(payload, "durationTicks"),
    "qState.lifecycle.targetCondition.durationTicks",
  );
}

function compareDirectConditionLifecycleState(
  runtime: DirectConditionLifecycleMbtProjection,
  quint: DirectConditionLifecycleMbtProjection,
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
