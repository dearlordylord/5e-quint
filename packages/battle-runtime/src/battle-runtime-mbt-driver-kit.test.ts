import { describe, expect, it } from "vitest";

import {
  booleanField,
  createBattleInterruptResolutionRecorder,
  decodeWitnessProtocolState,
  focusedMbtMaxSteps,
  initialBattleResolutionRecorderSnapshot,
  mbtPickSchemas,
  mbtTraceCount,
  mbtWitnessLastInvalidReasons,
  numberFromQuintInt,
  quintList,
  quintRecordField,
  quintSet,
  quintStateRecord,
  quintVariantTag,
  quintVariantValue,
  recordBattleResolutionResult,
  stringLiteralField,
  transformITFValue,
} from "./battle-runtime-mbt-driver-kit.ts";
import type {
  BattleHole,
  BattleResolutionResult,
  BattleSnapshot,
  BattleState,
  BattleSubject,
} from "./index.ts";

describe("battle-runtime MBT driver kit", () => {
  it("reads transformed Quint state fields with precise field failures", () => {
    const state = quintStateRecord({
      int: 3n,
      bool: true,
      choice: "target",
      nested: { value: 1 },
      set: new Set(["b", "a"]),
      list: [1, 2],
      tagged: { tag: "SomeTag", value: 12 },
    });

    expect(numberFromQuintInt(state["int"], "int")).toBe(3);
    expect(booleanField(state, "bool")).toBe(true);
    expect(stringLiteralField(state, "choice", ["actor", "target"])).toBe(
      "target",
    );
    expect(quintRecordField(state, "nested")).toEqual({ value: 1 });
    expect(quintSet(state["set"], "set")).toEqual(["b", "a"]);
    expect(quintList(state["list"], "list")).toEqual([1, 2]);
    expect(quintVariantTag(state["tagged"], "tagged")).toBe("SomeTag");
    expect(quintVariantValue(state["tagged"], "SomeTag", "tagged")).toBe(12);
    expect(() => booleanField(state, "missing")).toThrow(
      "Expected Quint state field missing.",
    );
  });

  it("adapts quint-connect ITF transformation exports", () => {
    expect(transformITFValue({ "#bigint": "7" })).toBe(7n);
    expect(transformITFValue({ "#set": [1, 2] })).toEqual(new Set([1, 2]));
    expect(transformITFValue({ tag: "Tagged", value: { "#bigint": "5" } }))
      .toEqual({ tag: "Tagged", value: 5n });
  });

  it("decodes witness protocol fields with the witness sentinel", () => {
    const emptyStringProtocol = decodeWitnessProtocolState({
      state: quintStateRecord({
        qHoles: new Set([{ tag: "Second" }, { tag: "First" }]),
        qLastResult: "needsHoles",
        qLastInvalidReason: "",
      }),
      noInvalidReason: "",
      decodeHole: (raw): string => quintVariantTag(raw),
      compareHoles: (left, right) => left.localeCompare(right),
    });
    const noneProtocol = decodeWitnessProtocolState({
      state: quintStateRecord({
        qHoles: new Set(["Movement"]),
        qLastResult: "resolved",
        qLastInvalidReason: "none",
      }),
      noInvalidReason: "none",
      decodeHole: (raw): string => stringLiteral(raw, ["Movement"]),
    });

    expect(emptyStringProtocol).toEqual({
      holes: ["First", "Second"],
      lastResult: "needsHoles",
      lastInvalidReason: "",
    });
    expect(noneProtocol).toEqual({
      holes: ["Movement"],
      lastResult: "resolved",
      lastInvalidReason: "none",
    });
    expect(mbtWitnessLastInvalidReasons("none")).toEqual([
      "none",
      "staleSubject",
      "wrongActor",
      "missingCombatant",
      "invalidFill",
      "unsupportedSubject",
      "unsupportedActOption",
    ]);
  });

  it("decodes typed witness protocol records with variant results", () => {
    const needsHolesProtocol = decodeWitnessProtocolState({
      state: quintStateRecord({
        protocol: {
          holes: new Set([{ tag: "Second" }, { tag: "First" }]),
          result: "WNeedsHoles",
        },
      }),
      protocolField: "protocol",
      noInvalidReason: "",
      decodeHole: (raw): string => quintVariantTag(raw),
      compareHoles: (left, right) => left.localeCompare(right),
    });
    const invalidProtocol = decodeWitnessProtocolState({
      state: quintStateRecord({
        protocol: {
          holes: new Set(["Movement"]),
          result: { tag: "WInvalid", value: "WWrongActor" },
        },
      }),
      protocolField: "protocol",
      noInvalidReason: "none",
      decodeHole: (raw): string => stringLiteral(raw, ["Movement"]),
    });

    expect(needsHolesProtocol).toEqual({
      holes: ["First", "Second"],
      lastResult: "needsHoles",
      lastInvalidReason: "",
    });
    expect(invalidProtocol).toEqual({
      holes: ["Movement"],
      lastResult: "invalid",
      lastInvalidReason: "wrongActor",
    });
  });

  it("folds production resolution results into the configured witness protocol", () => {
    const initialState = battleState("initial");
    const resolvedState = battleState("resolved");
    const needsHolesState = battleState("needs-holes");
    // This test only verifies that the recorder preserves hole object identity;
    // no Death Saving Throw hole fields are inspected.
    const hole = { kind: "deathSavingThrow" } as BattleHole;

    const initial = initialBattleResolutionRecorderSnapshot(
      initialState,
      "none",
    );
    const resolved = recordBattleResolutionResult(
      initial,
      resolvedResult(resolvedState),
      "none",
    );
    const needsHoles = recordBattleResolutionResult(
      resolved,
      needsHolesResult(needsHolesState, [hole]),
      "none",
    );
    const invalid = recordBattleResolutionResult(
      needsHoles,
      invalidResult("wrongActor"),
      "none",
    );

    expect(resolved).toMatchObject({
      state: resolvedState,
      holes: [],
      lastResult: "resolved",
      lastInvalidReason: "none",
    });
    expect(needsHoles).toMatchObject({
      state: needsHolesState,
      holes: [hole],
      lastResult: "needsHoles",
      lastInvalidReason: "none",
    });
    expect(invalid).toMatchObject({
      state: needsHolesState,
      holes: [hole],
      lastResult: "invalid",
      lastInvalidReason: "wrongActor",
    });
  });

  it("provides an interrupt recorder with the same witness protocol contract", () => {
    const initialState = battleState("initial");
    const resetState = battleState("reset");
    const resolvedState = battleState("resolved");
    const recorder = createBattleInterruptResolutionRecorder({
      initialState,
      noInvalidReason: "none",
    });

    expect(recorder.snapshot()).toMatchObject({
      state: initialState,
      holes: [],
      lastResult: "init",
      lastInvalidReason: "none",
    });

    recorder.record(resolvedResult(resolvedState));
    expect(recorder.snapshot()).toMatchObject({
      state: resolvedState,
      holes: [],
      lastResult: "resolved",
      lastInvalidReason: "none",
    });

    recorder.reset(resetState);
    expect(recorder.snapshot()).toMatchObject({
      state: resetState,
      holes: [],
      lastResult: "init",
      lastInvalidReason: "none",
    });
  });

  it("owns shared pick schemas and run conventions", async () => {
    await expect(standardValidate(mbtPickSchemas.int, 9n)).resolves.toBe(9);
    await expect(standardValidate(mbtPickSchemas.bool, true)).resolves.toBe(
      true,
    );
    await expect(
      standardValidate(mbtPickSchemas.stringLiteral("left", "right"), "right"),
    ).resolves.toBe("right");

    withEnv("MBT_TRACES", undefined, () => {
      expect(mbtTraceCount()).toBe(1);
    });
    withEnv("MBT_TRACES", "3", () => {
      expect(mbtTraceCount()).toBe(3);
    });
    withEnv("MBT_STEPS", undefined, () => {
      expect(focusedMbtMaxSteps(4)).toBe(4);
    });
    withEnv("MBT_STEPS", "99", () => {
      expect(focusedMbtMaxSteps(4)).toBe(4);
    });
    withEnv("MBT_STEPS", "2", () => {
      expect(focusedMbtMaxSteps(4)).toBe(2);
    });
  });
});

function battleState(id: string): BattleState {
  // Recorder folding only carries state references forward; it never reads
  // BattleState fields in these deterministic tests.
  return { id } as unknown as BattleState;
}

function snapshot(): BattleSnapshot {
  // Snapshot values are required by the production result type but are only
  // carried through untouched by the recorder test helpers.
  return {} as BattleSnapshot;
}

function resolvedResult(state: BattleState): BattleResolutionResult {
  return { tag: "resolved", state, snapshot: snapshot() };
}

function needsHolesResult(
  state: BattleState,
  holes: readonly BattleHole[],
): BattleResolutionResult {
  return {
    tag: "needsHoles",
    state,
    // The subject is preserved only as part of the result shape in these tests;
    // recorder folding never inspects BattleSubject fields.
    subject: {} as BattleSubject,
    holes,
    snapshot: snapshot(),
  };
}

function invalidResult(
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
): BattleResolutionResult {
  return { tag: "invalid", reason, message: "invalid", snapshot: snapshot() };
}

function stringLiteral<const Values extends readonly string[]>(
  raw: unknown,
  values: Values,
): Values[number] {
  if (typeof raw === "string" && values.includes(raw)) {
    return raw;
  }
  throw new Error("Expected string literal test fixture.");
}

async function standardValidate<T>(
  schema: {
    readonly "~standard": {
      readonly validate: (value: unknown) =>
        | { readonly value: T }
        | { readonly issues: readonly unknown[] }
        | Promise<{ readonly value: T } | { readonly issues: readonly unknown[] }>;
    };
  },
  value: unknown,
): Promise<T> {
  const result = await schema["~standard"].validate(value);
  if ("issues" in result) {
    throw new Error("Expected StandardSchema validation to succeed.");
  }
  return result.value;
}

function withEnv(name: string, value: string | undefined, test: () => void): void {
  const original = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    test();
  } finally {
    if (original === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = original;
    }
  }
}
