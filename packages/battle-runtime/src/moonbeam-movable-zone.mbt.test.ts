// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  beginMoonbeamLaterTurn,
  resolveMoonbeamCast,
  resolveMoonbeamCylinderExit,
  resolveMoonbeamReposition,
  resolveMoonbeamSave,
  resetMoonbeamSavedThisTurn,
  resolveMoonbeamSpellCleanup,
  type MoonbeamMovableZoneState,
  type MoonbeamSaveTrigger,
  type MoonbeamTargetShapeShiftState,
} from "./battle-reducer/moonbeam-movable-zone.ts";
import {
  battleSpellEffectOccurrenceId,
  combatantId,
  spellShapeShiftedRuntimeState,
  trueFormRuntimeState,
  type SpellShapeShiftedFormActiveEffect,
} from "./index.ts";

const syntheticShapeCasterId = combatantId("synthetic-shape-caster");
const syntheticShapeTargetId = combatantId("synthetic-shape-target");
const syntheticSpellShapeShiftEffect: SpellShapeShiftedFormActiveEffect = {
  kind: "spellShapeShiftedForm",
  sourceCombatantId: syntheticShapeCasterId,
  sourceSpellId: "synthetic_shape_spell",
  sourceEffectId: battleSpellEffectOccurrenceId("synthetic-shape-effect"),
  replacementForm: {
    kind: "runtimeCreatureForm",
    creatureSize: "large",
  },
  expiresAt: { kind: "concentration", combatantId: syntheticShapeCasterId },
};

function syntheticSpellEffectTargetShapeShift(): Extract<
  MoonbeamTargetShapeShiftState,
  { readonly tag: "unsuppressed" }
> {
  return {
    tag: "unsuppressed",
    shapeShift: spellShapeShiftedRuntimeState({
      targetCombatantId: syntheticShapeTargetId,
      effect: syntheticSpellShapeShiftEffect,
    }),
  };
}

function initialState(slotLedgerLevel: number): MoonbeamMovableZoneState {
  return {
    actionAvailable: true,
    zone: { tag: "absent" },
    slotLedger: { slotLevel: slotLedgerLevel, slotsRemaining: 1 },
    slotSpellCastThisTurn: false,
    targetVitals: {
      kind: "monsterCreature",
      hitPoints: 20,
      hitPointMaximum: 20,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    },
    targetShapeShift: {
      tag: "unsuppressed",
      shapeShift: trueFormRuntimeState(),
    },
  };
}

const QuintIntAsNumber = Schema.transform(
  Schema.BigIntFromSelf,
  Schema.Number,
  { strict: true, decode: (n) => Number(n), encode: (n) => BigInt(n) },
);

const intSchema = Schema.standardSchemaV1(QuintIntAsNumber);
const boolSchema = Schema.standardSchemaV1(Schema.Boolean);
const unknownSchema = Schema.standardSchemaV1(Schema.Unknown);

const driverSchema = {
  init: {
    slotLedgerLevel: intSchema,
  },
  doCastMoonbeam: {
    slotLevel: intSchema,
  },
  doMoonbeamSave: {
    savingThrowSucceeded: boolSchema,
    rolledDamage: intSchema,
    trigger: unknownSchema,
  },
  doReposition: {
    moveFeet: intSchema,
  },
  doBeginLaterTurn: {},
  doResetSavedThisTurn: {},
  doCylinderExit: {},
  doSpellCleanup: {},
  doShapeShift: {},
  step: {},
} as const;

function createMoonbeamMovableZoneDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialState(2);
    return {
      init: ({ slotLedgerLevel }) => {
        state = initialState(slotLedgerLevel);
      },
      doCastMoonbeam: ({ slotLevel }) => {
        state = resolveMoonbeamCast(state, slotLevel);
      },
      doMoonbeamSave: ({ savingThrowSucceeded, rolledDamage, trigger }) => {
        state = resolveMoonbeamSave(
          state,
          moonbeamSaveTriggerFromQuint(trigger),
          {
            savingThrowSucceeded,
            rolledDamage,
            moveFeet: 0,
          },
        );
      },
      doReposition: ({ moveFeet }) => {
        state = resolveMoonbeamReposition(state, moveFeet);
      },
      doBeginLaterTurn: () => {
        state = beginMoonbeamLaterTurn(state);
      },
      doResetSavedThisTurn: () => {
        state = resetMoonbeamSavedThisTurn(state);
      },
      doCylinderExit: () => {
        state = resolveMoonbeamCylinderExit(state);
      },
      doSpellCleanup: () => {
        state = resolveMoonbeamSpellCleanup(state);
      },
      doShapeShift: () => {
        if (state.targetShapeShift.tag !== "suppressedTrueForm") {
          state = {
            ...state,
            targetShapeShift: syntheticSpellEffectTargetShapeShift(),
          };
        }
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const moonbeamMovableZoneStateCheck = stateCheck(
  normalizeMoonbeamMovableZoneQuintState,
  compareMoonbeamMovableZoneState,
);

describe("Moonbeam movable zone MBT parity", () => {
  it("rejects a cast whose requested slot level does not match the ledger", () => {
    const state = initialState(2);

    expect(resolveMoonbeamCast(state, 3)).toEqual(state);
  });

  it("derives active zone damage dice from the matching expended slot level", () => {
    expect(resolveMoonbeamCast(initialState(4), 4)).toMatchObject({
      zone: {
        tag: "active",
        damageDice: 4,
        repositionMaxMoveFeet: 60,
      },
      slotLedger: {
        slotLevel: 4,
        slotsRemaining: 0,
      },
    });
  });

  it("limits Moonbeam damage to once per creature per turn", () => {
    const cast = resolveMoonbeamCast(initialState(2), 2);
    const first = resolveMoonbeamSave(cast, "appearsInArea", {
      savingThrowSucceeded: false,
      rolledDamage: 10,
      moveFeet: 0,
    });

    expect(
      resolveMoonbeamSave(first, "endsTurnInArea", {
        savingThrowSucceeded: false,
        rolledDamage: 10,
        moveFeet: 0,
      }),
    ).toEqual(first);
    expect(
      resolveMoonbeamSave(
        resetMoonbeamSavedThisTurn(first),
        "endsTurnInArea",
        {
          savingThrowSucceeded: true,
          rolledDamage: 10,
          moveFeet: 0,
        },
      ).targetVitals.hitPoints,
    ).toBe(5);
  });

  it("reverts admitted shape-shift on failed save and clears suppression on exit", () => {
    const cast = {
      ...resolveMoonbeamCast(initialState(2), 2),
      targetShapeShift: syntheticSpellEffectTargetShapeShift(),
    };
    const failed = resolveMoonbeamSave(cast, "entersArea", {
      savingThrowSucceeded: false,
      rolledDamage: 8,
      moveFeet: 0,
    });

    expect(failed.targetShapeShift.tag).toBe("suppressedTrueForm");
    expect(resolveMoonbeamCylinderExit(failed).targetShapeShift).toEqual({
      tag: "unsuppressed",
      shapeShift: trueFormRuntimeState(),
    });
  });

  it("repositions an active later-turn Moonbeam and consumes the Magic Action", () => {
    const cast = resolveMoonbeamCast(initialState(2), 2);
    const laterTurn = beginMoonbeamLaterTurn(cast);

    expect(laterTurn).toMatchObject({
      actionAvailable: true,
      slotSpellCastThisTurn: false,
      zone: { tag: "active", savedThisTurn: false },
    });
    expect(resolveMoonbeamReposition(laterTurn, 60)).toMatchObject({
      actionAvailable: false,
    });
    expect(resolveMoonbeamReposition(laterTurn, 61)).toEqual(laterTurn);
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-moonbeam-movable-zone.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMoonbeamMovableZoneDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: moonbeamMovableZoneStateCheck,
    });
  }, 120_000);
});

function normalizeMoonbeamMovableZoneQuintState(
  raw: unknown,
): MoonbeamMovableZoneState {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Moonbeam movable-zone state.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    actionAvailable: booleanFromQuint(
      state["qActionAvailable"],
      "qActionAvailable",
    ),
    zone: zoneFromQuintState(state),
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
    targetVitals: {
      kind: "monsterCreature",
      hitPoints: numberFromQuintInt(
        state["qTargetHitPoints"],
        "qTargetHitPoints",
      ),
      hitPointMaximum: numberFromQuintInt(
        state["qTargetHitPointMaximum"],
        "qTargetHitPointMaximum",
      ),
      temporaryHitPoints: numberFromQuintInt(
        state["qTargetTemporaryHitPoints"],
        "qTargetTemporaryHitPoints",
      ),
      dead: booleanFromQuint(state["qTargetDead"], "qTargetDead"),
      unconscious: booleanFromQuint(
        state["qTargetUnconscious"],
        "qTargetUnconscious",
      ),
    },
    targetShapeShift: targetShapeShiftStateFromQuint(
      state["qTargetShapeShift"],
    ),
  };
}

function zoneFromQuintState(
  state: Readonly<Record<string, unknown>>,
): MoonbeamMovableZoneState["zone"] {
  const zoneActive = booleanFromQuint(state["qZoneActive"], "qZoneActive");
  return zoneActive
    ? {
        tag: "active",
        damageDice: numberFromQuintInt(
          state["qZoneDamageDice"],
          "qZoneDamageDice",
        ),
        durationTicks: numberFromQuintInt(
          state["qZoneDurationTicks"],
          "qZoneDurationTicks",
        ),
        repositionMaxMoveFeet: numberFromQuintInt(
          state["qZoneRepositionMaxMoveFeet"],
          "qZoneRepositionMaxMoveFeet",
        ),
        savedThisTurn: booleanFromQuint(
          state["qZoneSavedThisTurn"],
          "qZoneSavedThisTurn",
        ),
      }
    : { tag: "absent" };
}

function compareMoonbeamMovableZoneState(
  runtime: MoonbeamMovableZoneState,
  quint: MoonbeamMovableZoneState,
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

function moonbeamSaveTriggerFromQuint(raw: unknown): MoonbeamSaveTrigger {
  const tag = quintVariantTag(raw);
  if (tag === "MoonbeamAppearsInArea") return "appearsInArea";
  if (tag === "MoonbeamAreaMovesIntoSpace") return "areaMovesIntoSpace";
  if (tag === "MoonbeamEntersArea") return "entersArea";
  if (tag === "MoonbeamEndsTurnInArea") return "endsTurnInArea";
  throw new Error(`Unknown Quint Moonbeam save trigger: ${tag}`);
}

function targetShapeShiftStateFromQuint(
  raw: unknown,
): MoonbeamTargetShapeShiftState {
  const tag = quintVariantTag(raw);
  if (tag === "MoonbeamTargetSuppressedTrueForm") {
    return { tag: "suppressedTrueForm" };
  }
  if (tag === "MoonbeamTargetUnsuppressed") {
    const value = quintVariantValue(raw);
    if (
      value === null ||
      typeof value !== "object" ||
      !("shapeShift" in value)
    ) {
      throw new Error("Expected Quint Moonbeam unsuppressed shape-shift value.");
    }
    const shapeShiftTag = quintVariantTag(value.shapeShift);
    if (shapeShiftTag === "TrueForm") {
      return { tag: "unsuppressed", shapeShift: trueFormRuntimeState() };
    }
    if (shapeShiftTag === "SpellEffectShapeShifted") {
      return syntheticSpellEffectTargetShapeShift();
    }
    throw new Error(`Unknown Quint shared shape-shift state: ${shapeShiftTag}`);
  }
  throw new Error(`Unknown Quint Moonbeam shape-shift state: ${tag}`);
}

function quintVariantTag(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw !== null && typeof raw === "object" && "tag" in raw) {
    const tag = raw.tag;
    if (typeof tag === "string") return tag;
  }
  throw new Error(`Expected Quint variant tag, got ${String(raw)}.`);
}

function quintVariantValue(raw: unknown): unknown {
  if (raw !== null && typeof raw === "object" && "value" in raw) {
    return raw.value;
  }
  throw new Error(`Expected Quint variant value, got ${String(raw)}.`);
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
