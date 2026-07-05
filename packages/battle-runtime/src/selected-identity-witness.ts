import { type SimpleActionMap, type SimpleDriver } from "@firfi/quint-connect";
import { Match } from "effect";
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanValue,
  decodeWitnessProtocolState,
  focusedMbtMaxSteps,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";

export type ProjectionFieldKind = "bool" | "int" | "str" | "variant";
export type ProjectionSchema = Readonly<Record<string, ProjectionFieldKind>>;
export type ProjectionOf<S extends ProjectionSchema> = Readonly<{
  [K in keyof S]: S[K] extends "bool"
    ? boolean
    : S[K] extends "int"
      ? number
      : S[K] extends "str" | "variant"
        ? string
        : never;
}>;

type ProjectionRecord = Readonly<Record<string, unknown>>;

export type SelectedIdentityProcedure<P extends ProjectionRecord> = {
  readonly actionName: `do${string}`;
  readonly projectionAfter: P;
  readonly discover: () => P | void | Promise<P | void>;
  readonly project?: (projection: P) => P;
  readonly preservesProjection?: true;
};

export type SelectedIdentityUnit<P extends ProjectionRecord> = {
  readonly unitId: string;
  readonly procedures: ReadonlyArray<SelectedIdentityProcedure<P>>;
};

type SelectedIdentityReplayWitnessBase<P extends ProjectionRecord> = {
  readonly describeLabel: string;
  readonly taskId: string;
  readonly initialProjection: P;
  readonly units: ReadonlyArray<SelectedIdentityUnit<P>>;
};

type SelectedIdentityQntReplayBase<P extends ProjectionRecord> =
  SelectedIdentityReplayWitnessBase<P> & {
    readonly specFile: string;
    readonly mbtParityTimeoutMs?: number;
    readonly quintStateField?: string;
    readonly quintStateFieldPrefix?: "q";
    readonly quintFieldNames?: Readonly<Record<string, string>>;
    readonly witnessProtocolField?: string;
    readonly witnessNoInvalidReason?: string;
    readonly witnessInvalidScenarioReasons?: Readonly<Record<string, string>>;
    readonly witnessDecodeHole?: (raw: unknown) => unknown;
    readonly quintVariantFieldTags?: Readonly<
      Record<string, Readonly<Record<string, string>>>
    >;
  };

export type SelectedIdentityReplayWitness<P extends ProjectionRecord> =
  SelectedIdentityReplayWitnessBase<P>;

export type FlatSelectedIdentityQntReplay<S extends ProjectionSchema> =
  SelectedIdentityQntReplayBase<ProjectionOf<S>> & {
    readonly projectionSchema: S;
    readonly normalizeQuintState?: undefined;
  };

export type CustomSelectedIdentityQntReplay<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
> = SelectedIdentityQntReplayBase<P> & {
  readonly projectionSchema: S;
  readonly normalizeQuintState: (raw: unknown) => P;
};

export type SelectedIdentityQntReplay<
  S extends ProjectionSchema,
  P extends ProjectionRecord = ProjectionOf<S>,
> = FlatSelectedIdentityQntReplay<S> | CustomSelectedIdentityQntReplay<S, P>;

const byKind = Match.type<ProjectionFieldKind>();

export function defineSelectedIdentityReplayWitness<P extends ProjectionRecord>(
  witness: SelectedIdentityReplayWitness<P>,
): void {
  defineSelectedIdentityReplayWitnessCore(witness);
}

function defineSelectedIdentityReplayWitnessCore<P extends ProjectionRecord>(
  witness: SelectedIdentityReplayWitness<P>,
): void {
  describe(witness.describeLabel, () => {
    it("replays selected Unit identities deterministically", async () => {
      for (const unit of witness.units) {
        const replayed = new Set<string>();
        for (const procedure of unit.procedures) {
          const driver = createSelectedIdentityDriver(witness);
          const driverAction = driver.actions[procedure.actionName];
          if (driverAction === undefined) {
            throw new Error(
              `Missing selected identity driver action ${procedure.actionName} for unit ${unit.unitId}.`,
            );
          }
          await driverAction.handler({});
          replayed.add(procedure.actionName);
          const runtime = driver.getState?.();
          if (runtime === undefined) {
            throw new Error("Selected identity driver must expose getState.");
          }
          expect(runtime, `${unit.unitId}:${procedure.actionName}`).toEqual(
            procedure.projectionAfter,
          );
        }
        expect(replayed).toEqual(
          new Set(unit.procedures.map((procedure) => procedure.actionName)),
        );
      }
    });
  });
}

export function defineSelectedIdentityQntReplay<S extends ProjectionSchema>(
  witness: FlatSelectedIdentityQntReplay<S>,
): void;
export function defineSelectedIdentityQntReplay<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(witness: CustomSelectedIdentityQntReplay<S, P>): void;
export function defineSelectedIdentityQntReplay<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(
  witness: SelectedIdentityQntReplayBase<P> & {
    readonly projectionSchema: S;
    readonly normalizeQuintState?: ((raw: unknown) => P) | undefined;
  },
): void {
  defineSelectedIdentityQntReplayCore(witness);
}

function defineSelectedIdentityQntReplayCore<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(
  witness: SelectedIdentityQntReplayBase<P> & {
    readonly projectionSchema: S;
    readonly normalizeQuintState?: ((raw: unknown) => P) | undefined;
  },
): void {
  describe(`${witness.describeLabel} QNT parity`, () => {
    it(
      "replays deterministic QNT parity",
      async () => {
        await run({
          spec: witness.specFile,
          init: "init",
          step: "step",
          driver: () => createSelectedIdentityDriver(witness),
          backend: "typescript",
          seed: process.env["QUINT_SEED"],
          nTraces: mbtTraceCount(),
          maxSteps: focusedMbtMaxSteps(1),
          stateCheck: selectedIdentityStateCheck(witness),
        });
      },
      witness.mbtParityTimeoutMs ?? MBT_TEST_TIMEOUT_MS,
    );
  });
}

export function defineSelectedIdentityReplayAndQntReplay<
  S extends ProjectionSchema,
>(witness: FlatSelectedIdentityQntReplay<S>): void;
export function defineSelectedIdentityReplayAndQntReplay<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(witness: CustomSelectedIdentityQntReplay<S, P>): void;
export function defineSelectedIdentityReplayAndQntReplay<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(
  witness: SelectedIdentityQntReplayBase<P> & {
    readonly projectionSchema: S;
    readonly normalizeQuintState?: ((raw: unknown) => P) | undefined;
  },
): void {
  defineSelectedIdentityReplayWitnessCore(witness);
  defineSelectedIdentityQntReplayCore(witness);
}

function createSelectedIdentityDriver<P extends ProjectionRecord>(
  witness: SelectedIdentityReplayWitnessBase<P>,
): SimpleDriver<P, SimpleActionMap> {
  let projection = witness.initialProjection;
  const actions: Record<
    string,
    {
      readonly picks: Record<string, never>;
      readonly handler: (picks?: Record<string, never>) => void | Promise<void>;
    }
  > = {
    init: {
      picks: {},
      handler: () => {
        projection = witness.initialProjection;
      },
    },
    step: { picks: {}, handler: () => {} },
  };
  for (const unit of witness.units) {
    for (const procedure of unit.procedures) {
      actions[procedure.actionName] = {
        picks: {},
        handler: async () => {
          if (procedure.project !== undefined) {
            projection = procedure.project(projection);
            return;
          }
          const computed = await procedure.discover();
          if (computed !== undefined) {
            projection = computed;
            return;
          }
          if (procedure.preservesProjection !== true) {
            projection = procedure.projectionAfter;
          }
        },
      };
    }
  }
  return {
    actions,
    getState: () => projection,
  };
}

function selectedIdentityStateCheck<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(
  witness: SelectedIdentityQntReplayBase<P> & {
    readonly projectionSchema: S;
    readonly normalizeQuintState?: ((raw: unknown) => P) | undefined;
  },
) {
  const runtimeSchema =
    witness.normalizeQuintState === undefined
      ? projectionRuntimeSchema(witness)
      : undefined;

  return stateCheck(
    (raw: unknown): P => {
      if (witness.normalizeQuintState !== undefined) {
        return witness.normalizeQuintState(raw);
      }
      if (runtimeSchema === undefined) {
        throw new Error("Expected selected identity flat projection schema.");
      }
      const normalized = normalizeQuintState(raw, runtimeSchema, witness);
      // The runtime schema is derived from the same projection schema that
      // defines the flat witness type, so every decoded field has the mapped
      // bool/int/string type required by ProjectionOf<S>.
      return normalized as P;
    },
    (spec: P, impl: P): boolean => {
      expect(impl).toEqual(spec);
      return true;
    },
  );
}

type RuntimeProjectionField = {
  readonly kind: ProjectionFieldKind;
  readonly allowedStrings: ReadonlySet<string>;
  readonly variantTagValues: Readonly<Record<string, string>>;
};
type RuntimeProjectionSchema = Readonly<Record<string, RuntimeProjectionField>>;

function projectionRuntimeSchema<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(
  witness: Pick<
    SelectedIdentityQntReplayBase<P> & { readonly projectionSchema: S },
    "projectionSchema" | "initialProjection" | "units" | "quintVariantFieldTags"
  >,
): RuntimeProjectionSchema {
  const stringValues = new Map<string, Set<string>>();
  const recordStringValues = (projection: unknown): void => {
    if (projection === null || typeof projection !== "object") {
      return;
    }
    for (const [field, value] of Object.entries(projection)) {
      if (
        witness.projectionSchema[field] === "str" ||
        witness.projectionSchema[field] === "variant"
      ) {
        if (typeof value !== "string") {
          throw new Error(
            `Expected selected identity projection field ${field} to declare a string value.`,
          );
        }
        const values = stringValues.get(field) ?? new Set<string>();
        values.add(value);
        stringValues.set(field, values);
      }
    }
  };

  recordStringValues(witness.initialProjection);
  for (const unit of witness.units) {
    for (const procedure of unit.procedures) {
      recordStringValues(procedure.projectionAfter);
    }
  }

  return Object.fromEntries(
    Object.entries(witness.projectionSchema).map(([field, kind]) => [
      field,
      {
        // Object.entries widens ProjectionFieldKind values to string; this
        // value comes directly from witness.projectionSchema and was typed as
        // ProjectionFieldKind before enumeration.
        kind: kind as ProjectionFieldKind,
        allowedStrings: stringValues.get(field) ?? new Set<string>(),
        variantTagValues: witness.quintVariantFieldTags?.[field] ?? {},
      },
    ]),
  );
}

function normalizeQuintState(
  raw: unknown,
  schema: RuntimeProjectionSchema,
  witness: Pick<
    SelectedIdentityQntReplayBase<ProjectionRecord>,
    | "quintStateField"
    | "quintStateFieldPrefix"
    | "quintFieldNames"
    | "witnessProtocolField"
    | "witnessNoInvalidReason"
    | "witnessInvalidScenarioReasons"
    | "witnessDecodeHole"
    | "quintVariantFieldTags"
  >,
): Readonly<Record<string, boolean | number | string>> {
  const root = quintStateRecord(raw);
  const state =
    witness.quintStateField === undefined
      ? root
      : quintRecordField(root, witness.quintStateField);
  const protocol =
    witness.witnessProtocolField === undefined
      ? undefined
      : decodeWitnessProtocolState({
          state,
          protocolField: witness.witnessProtocolField,
          noInvalidReason: witness.witnessNoInvalidReason ?? "",
          decodeHole:
            witness.witnessDecodeHole ?? selectedIdentityUnexpectedHole,
        });
  if (
    protocol !== undefined &&
    witness.witnessDecodeHole === undefined &&
    protocol.holes.length !== 0
  ) {
    throw new Error("Expected selected identity witness holes to be empty.");
  }
  const result: Record<string, boolean | number | string> = {};
  for (const [field, spec] of Object.entries(schema)) {
    const configuredField = witness.quintFieldNames?.[field];
    if (
      field === "lastResult" &&
      protocol !== undefined &&
      configuredField === undefined
    ) {
      result[field] = parseStr(
        protocol.lastResult,
        spec.allowedStrings,
        `${witness.quintStateField ?? "root"}.${witness.witnessProtocolField}.result`,
      );
      continue;
    }
    if (
      field === "lastInvalidReason" &&
      protocol !== undefined &&
      configuredField === undefined
    ) {
      result[field] = parseStr(
        protocol.lastInvalidReason,
        spec.allowedStrings,
        `${witness.quintStateField ?? "root"}.${witness.witnessProtocolField}.result`,
      );
      continue;
    }
    const qKey =
      configuredField ??
      quintFieldName(
        field,
        witness.quintStateField,
        witness.quintStateFieldPrefix,
      );
    result[field] = parseQuintField(quintField(state, qKey), spec, qKey);
  }
  const scenarioOutcomeField = witness.quintFieldNames?.["lastResult"];
  const scenarioOutcome = result["lastResult"];
  if (
    protocol !== undefined &&
    scenarioOutcomeField !== undefined &&
    typeof scenarioOutcome === "string"
  ) {
    const invalidScenarioReasons = witness.witnessInvalidScenarioReasons;
    assertWitnessProtocolConsistentWithScenario({
      label: "selected identity",
      scenarioOutcome,
      protocol,
      ...(invalidScenarioReasons === undefined
        ? {}
        : { invalidScenarioReasons }),
    });
  }
  return result;
}

function quintFieldName(
  field: string,
  stateField: string | undefined,
  stateFieldPrefix: "q" | undefined,
): string {
  if (stateField === undefined || stateFieldPrefix === "q") {
    return `q${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  }

  return field;
}

function selectedIdentityUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Selected identity witness protocol does not expect holes; received ${String(raw)}.`,
  );
}

function parseQuintField(
  value: unknown,
  spec: RuntimeProjectionField,
  qKey: string,
): boolean | number | string {
  return byKind.pipe(
    Match.when("bool", () => parseBool(value, qKey)),
    Match.when("int", () => parseInt(value, qKey)),
    Match.when("str", () => parseStr(value, spec.allowedStrings, qKey)),
    Match.when("variant", () => parseVariant(value, spec, qKey)),
    Match.exhaustive,
  )(spec.kind);
}

function parseBool(value: unknown, qKey: string): boolean {
  return booleanValue(value, qKey);
}

function parseInt(value: unknown, qKey: string): number {
  return numberFromQuintInt(value, qKey);
}

function parseStr(
  value: unknown,
  allowedValues: ReadonlySet<string>,
  qKey: string,
): string {
  if (typeof value !== "string") {
    throw new Error(
      `Expected string Quint field ${qKey}, got ${String(value)}.`,
    );
  }
  if (!allowedValues.has(value)) {
    throw new Error(
      `Unexpected Quint field ${qKey} value ${value}; expected one of ${[...allowedValues].join(", ")}.`,
    );
  }
  return value;
}

function parseVariant(
  value: unknown,
  spec: RuntimeProjectionField,
  qKey: string,
): string {
  const tag = quintVariantTag(value, qKey);
  const projectedValue = spec.variantTagValues[tag];
  if (projectedValue === undefined) {
    throw new Error(
      `Unexpected Quint variant field ${qKey} tag ${tag}; expected one of ${Object.keys(spec.variantTagValues).join(", ")}.`,
    );
  }
  return parseStr(projectedValue, spec.allowedStrings, qKey);
}
