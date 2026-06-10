import * as path from "node:path";

import {
  defineDriver,
  run,
  stateCheck,
  transformITFValue,
} from "@firfi/quint-connect";
import {
  ITFBigInt,
  ITFList,
  ITFMap,
  ITFSet,
  ITFTuple,
  ITFVariant,
} from "@firfi/quint-connect/effect";
import { Match, Schema } from "effect";

import {
  BATTLE_INVALID_REASON_CODES,
  resolveBattleInterrupt,
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleInvalidReasonCode,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

export { defineDriver, run, stateCheck };
export {
  ITFBigInt,
  ITFList,
  ITFMap,
  ITFSet,
  ITFTuple,
  ITFVariant,
  transformITFValue,
};

/*
 * Research note for the parity-driver kit seam:
 * - quint-connect simple.run already applies transformITFValue before
 *   stateCheck deserializers, so kit readers operate on transformed JS values.
 * - quint-connect/effect re-exports the ITF schemas; the kit re-exports them
 *   for deterministic reader tests and for future drivers that need raw ITF
 *   fixtures.
 * - StandardSchema pick plumbing is not upstream-specialized for this repo's
 *   recurring int/bool/string-literal picks, so this kit owns those schemas.
 * - BattleResolutionResult recording is battle-runtime-specific, so this kit
 *   folds the production union into the witness protocol in one place.
 */

export const MBT_DEFAULT_TRACE_COUNT = 1;
export const MBT_TEST_TIMEOUT_MS = 120_000;

export const MBT_WITNESS_LAST_RESULTS = [
  "init",
  "needsHoles",
  "resolved",
  "invalid",
] as const;
export type MbtWitnessLastResult = (typeof MBT_WITNESS_LAST_RESULTS)[number];

export type MbtWitnessLastInvalidReason<NoInvalidReason extends string> =
  | NoInvalidReason
  | BattleInvalidReasonCode;

export type MbtWitnessProtocolState<
  Hole = BattleHole,
  NoInvalidReason extends string = string,
> = {
  readonly holes: readonly Hole[];
  readonly lastResult: MbtWitnessLastResult;
  readonly lastInvalidReason: MbtWitnessLastInvalidReason<NoInvalidReason>;
};

export type BattleResolutionRecorderSnapshot<
  NoInvalidReason extends string = string,
> = MbtWitnessProtocolState<BattleHole, NoInvalidReason> & {
  readonly state: BattleState;
};

const QuintIntAsNumber = Schema.transform(
  Schema.BigIntFromSelf,
  Schema.Number,
  { strict: true, decode: (n) => Number(n), encode: (n) => BigInt(n) },
);

export const mbtPickSchemas = {
  int: Schema.standardSchemaV1(QuintIntAsNumber),
  bool: Schema.standardSchemaV1(Schema.Boolean),
  unknown: Schema.standardSchemaV1(Schema.Unknown),
  stringLiteral: <const Values extends readonly [string, ...string[]]>(
    ...values: Values
  ) => Schema.standardSchemaV1(Schema.Literal(...values)),
} as const;

export function mbtTraceCount(): number {
  return numberFromEnv("MBT_TRACES", MBT_DEFAULT_TRACE_COUNT);
}

export function focusedMbtMaxSteps(domainMaxSteps: number): number {
  const requestedSteps = numberFromEnv("MBT_STEPS", domainMaxSteps);
  return Math.min(requestedSteps, domainMaxSteps);
}

export function mbtSpecPath(
  importMetaDirname: string,
  specFileName: string,
): string {
  return path.resolve(importMetaDirname, "..", specFileName);
}

export function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }

  return raw;
}

export function quintField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): unknown {
  if (Object.hasOwn(state, field)) {
    return state[field];
  }

  throw new Error(`Expected Quint state field ${field}.`);
}

export function quintRecordField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = quintField(state, field);
  if (isRecord(value)) {
    return value;
  }

  throw new Error(`Expected Quint record field ${field}.`);
}

export function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "bigint") {
    return Number(raw);
  }

  throw new Error(`Expected Quint integer field ${field}.`);
}

export function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = quintField(state, field);
  if (typeof value === "boolean") {
    return value;
  }

  throw new Error(`Expected Quint boolean field ${field}.`);
}

export function stringLiteralField<const Values extends readonly string[]>(
  state: Readonly<Record<string, unknown>>,
  field: string,
  values: Values,
): Values[number] {
  return stringLiteralValue(quintField(state, field), field, values);
}

export function stringLiteralValue<const Values extends readonly string[]>(
  raw: unknown,
  field: string,
  values: Values,
): Values[number] {
  if (typeof raw === "string" && values.includes(raw)) {
    return raw;
  }

  throw new Error(`Expected Quint string-literal field ${field}.`);
}

export function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }

  throw new Error(`Expected Quint set field ${field}.`);
}

export function quintList(raw: unknown, field: string): readonly unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  throw new Error(`Expected Quint list field ${field}.`);
}

export type QuintVariantWithValue = {
  readonly tag: string;
  readonly value: unknown;
};

export function quintVariantTag(raw: unknown, field = "variant"): string {
  if (isRecord(raw) && typeof raw["tag"] === "string") {
    return raw["tag"];
  }

  if (typeof raw === "string") {
    return raw;
  }

  throw new Error(`Expected Quint variant tag field ${field}.`);
}

export function quintVariantValue(
  raw: unknown,
  expectedTag: string,
  field = "variant",
): unknown {
  if (
    isRecord(raw) &&
    raw["tag"] === expectedTag &&
    Object.hasOwn(raw, "value")
  ) {
    return raw["value"];
  }

  throw new Error(`Expected Quint ${expectedTag} variant value field ${field}.`);
}

export function mbtWitnessLastInvalidReasons<
  const NoInvalidReason extends string,
>(
  noInvalidReason: NoInvalidReason,
): readonly [NoInvalidReason, ...typeof BATTLE_INVALID_REASON_CODES] {
  return [noInvalidReason, ...BATTLE_INVALID_REASON_CODES];
}

export function decodeWitnessProtocolState<
  Hole,
  const NoInvalidReason extends string,
>(input: {
  readonly state: Readonly<Record<string, unknown>>;
  readonly noInvalidReason: NoInvalidReason;
  readonly holesField?: string;
  readonly decodeHole: (raw: unknown) => Hole;
  readonly compareHoles?: (left: Hole, right: Hole) => number;
}): MbtWitnessProtocolState<Hole, NoInvalidReason> {
  const holesField = input.holesField ?? "qHoles";
  return {
    holes: quintSet(quintField(input.state, holesField), holesField)
      .map(input.decodeHole)
      .sort(input.compareHoles),
    lastResult: stringLiteralField(
      input.state,
      "qLastResult",
      MBT_WITNESS_LAST_RESULTS,
    ),
    lastInvalidReason: stringLiteralField(
      input.state,
      "qLastInvalidReason",
      mbtWitnessLastInvalidReasons(input.noInvalidReason),
    ),
  };
}

export function createBattleSubjectResolutionRecorder<
  const NoInvalidReason extends string,
>(input: {
  readonly initialState: BattleState;
  readonly subject: BattleSubject;
  readonly noInvalidReason: NoInvalidReason;
}): {
  readonly submit: (fills: readonly BattleFill[]) => void;
  readonly record: (result: BattleResolutionResult) => void;
  readonly reset: (state: BattleState) => void;
  readonly snapshot: () => BattleResolutionRecorderSnapshot<NoInvalidReason>;
} {
  let snapshot = initialBattleResolutionRecorderSnapshot(
    input.initialState,
    input.noInvalidReason,
  );

  return {
    submit: (fills) => {
      snapshot = recordBattleResolutionResult(
        snapshot,
        resolveBattleSubject({
          state: snapshot.state,
          subject: input.subject,
          fills,
        }),
        input.noInvalidReason,
      );
    },
    record: (result) => {
      snapshot = recordBattleResolutionResult(
        snapshot,
        result,
        input.noInvalidReason,
      );
    },
    reset: (state) => {
      snapshot = initialBattleResolutionRecorderSnapshot(
        state,
        input.noInvalidReason,
      );
    },
    snapshot: () => snapshot,
  };
}

export function createBattleInterruptResolutionRecorder<
  const NoInvalidReason extends string,
>(input: {
  readonly initialState: BattleState;
  readonly noInvalidReason: NoInvalidReason;
}): {
  readonly submit: (
    fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>,
  ) => void;
  readonly record: (result: BattleResolutionResult) => void;
  readonly reset: (state: BattleState) => void;
  readonly snapshot: () => BattleResolutionRecorderSnapshot<NoInvalidReason>;
} {
  let snapshot = initialBattleResolutionRecorderSnapshot(
    input.initialState,
    input.noInvalidReason,
  );

  return {
    submit: (fill) => {
      snapshot = recordBattleResolutionResult(
        snapshot,
        resolveBattleInterrupt({
          state: snapshot.state,
          fill,
        }),
        input.noInvalidReason,
      );
    },
    record: (result) => {
      snapshot = recordBattleResolutionResult(
        snapshot,
        result,
        input.noInvalidReason,
      );
    },
    reset: (state) => {
      snapshot = initialBattleResolutionRecorderSnapshot(
        state,
        input.noInvalidReason,
      );
    },
    snapshot: () => snapshot,
  };
}

export function initialBattleResolutionRecorderSnapshot<
  const NoInvalidReason extends string,
>(
  state: BattleState,
  noInvalidReason: NoInvalidReason,
): BattleResolutionRecorderSnapshot<NoInvalidReason> {
  return {
    state,
    holes: [],
    lastResult: "init",
    lastInvalidReason: noInvalidReason,
  };
}

export function recordBattleResolutionResult<
  const NoInvalidReason extends string,
>(
  snapshot: BattleResolutionRecorderSnapshot<NoInvalidReason>,
  result: BattleResolutionResult,
  noInvalidReason: NoInvalidReason,
): BattleResolutionRecorderSnapshot<NoInvalidReason> {
  return Match.value(result).pipe(
    Match.when({ tag: "resolved" }, (resolved) => ({
      state: resolved.state,
      holes: [],
      lastResult: "resolved" as const,
      lastInvalidReason: noInvalidReason,
    })),
    Match.when({ tag: "needsHoles" }, (needsHoles) => ({
      state: needsHoles.state,
      holes: needsHoles.holes,
      lastResult: "needsHoles" as const,
      lastInvalidReason: noInvalidReason,
    })),
    Match.when({ tag: "invalid" }, (invalid) => ({
      state: snapshot.state,
      holes: snapshot.holes,
      lastResult: "invalid" as const,
      lastInvalidReason: invalid.reason,
    })),
    Match.exhaustive,
  );
}

function numberFromEnv(name: "MBT_STEPS" | "MBT_TRACES", fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  throw new Error(`Expected positive integer ${name}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
