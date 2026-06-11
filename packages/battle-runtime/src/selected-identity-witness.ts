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
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";

export type ProjectionFieldKind = "bool" | "int" | "str";
export type ProjectionSchema = Readonly<Record<string, ProjectionFieldKind>>;
export type ProjectionOf<S extends ProjectionSchema> = Readonly<{
  [K in keyof S]: S[K] extends "bool"
    ? boolean
    : S[K] extends "int"
      ? number
      : S[K] extends "str"
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

type SelectedIdentityWitnessBase<P extends ProjectionRecord> = {
  readonly describeLabel: string;
  readonly taskId: string;
  readonly specFile: string;
  readonly initialProjection: P;
  readonly units: ReadonlyArray<SelectedIdentityUnit<P>>;
  readonly mbtParityTimeoutMs?: number;
  readonly quintStateField?: string;
  readonly quintStateFieldPrefix?: "q";
  readonly quintFieldNames?: Readonly<Record<string, string>>;
  readonly witnessProtocolField?: string;
  readonly witnessNoInvalidReason?: string;
  readonly witnessInvalidScenarioReasons?: Readonly<Record<string, string>>;
};

export type FlatSelectedIdentityWitness<S extends ProjectionSchema> =
  SelectedIdentityWitnessBase<ProjectionOf<S>> & {
    readonly projectionSchema: S;
    readonly normalizeQuintState?: undefined;
  };

export type CustomSelectedIdentityWitness<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
> = SelectedIdentityWitnessBase<P> & {
  readonly projectionSchema: S;
  readonly normalizeQuintState: (raw: unknown) => P;
};

export type SelectedIdentityWitness<
  S extends ProjectionSchema,
  P extends ProjectionRecord = ProjectionOf<S>,
> = FlatSelectedIdentityWitness<S> | CustomSelectedIdentityWitness<S, P>;

const byKind = Match.type<ProjectionFieldKind>();

export function defineSelectedIdentityWitness<S extends ProjectionSchema>(
  witness: FlatSelectedIdentityWitness<S>,
): void;
export function defineSelectedIdentityWitness<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(witness: CustomSelectedIdentityWitness<S, P>): void;
export function defineSelectedIdentityWitness<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(
  witness: SelectedIdentityWitnessBase<P> & {
    readonly projectionSchema: S;
    readonly normalizeQuintState?: ((raw: unknown) => P) | undefined;
  },
): void {
  const runtimeSchema =
    witness.normalizeQuintState === undefined
      ? projectionRuntimeSchema(witness)
      : undefined;

  type WitnessProjection = (typeof witness)["initialProjection"];

  const createDriver = (): SimpleDriver<WitnessProjection, SimpleActionMap> => {
    let projection: WitnessProjection = witness.initialProjection;
    const actions: Record<
      string,
      {
        readonly picks: Record<string, never>;
        readonly handler: () => void | Promise<void>;
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
  };

  const witnessStateCheck = stateCheck(
    (raw: unknown): WitnessProjection => {
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
      return normalized as WitnessProjection;
    },
    (spec: WitnessProjection, impl: WitnessProjection): boolean => {
      expect(impl).toEqual(spec);
      return true;
    },
  );

  describe(witness.describeLabel, () => {
    it("replays selected Unit identities deterministically", async () => {
      for (const unit of witness.units) {
        const replayed = new Set<string>();
        for (const procedure of unit.procedures) {
          const driver = createDriver();
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

    it(
      "replays MBT parity",
      async () => {
        await run({
          spec: witness.specFile,
          init: "init",
          step: "step",
          driver: createDriver,
          backend: "typescript",
          seed: process.env["QUINT_SEED"],
          nTraces: mbtTraceCount(),
          maxSteps: focusedMbtMaxSteps(1),
          stateCheck: witnessStateCheck,
        });
      },
      witness.mbtParityTimeoutMs ?? MBT_TEST_TIMEOUT_MS,
    );
  });
}

type RuntimeProjectionField = {
  readonly kind: ProjectionFieldKind;
  readonly allowedStrings: ReadonlySet<string>;
};
type RuntimeProjectionSchema = Readonly<Record<string, RuntimeProjectionField>>;

function projectionRuntimeSchema<
  S extends ProjectionSchema,
  P extends ProjectionRecord,
>(
  witness: Pick<
    SelectedIdentityWitnessBase<P> & { readonly projectionSchema: S },
    "projectionSchema" | "initialProjection" | "units"
  >,
): RuntimeProjectionSchema {
  const stringValues = new Map<string, Set<string>>();
  const recordStringValues = (projection: unknown): void => {
    if (projection === null || typeof projection !== "object") {
      return;
    }
    for (const [field, value] of Object.entries(projection)) {
      if (witness.projectionSchema[field] === "str") {
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
        kind,
        allowedStrings: stringValues.get(field) ?? new Set<string>(),
      },
    ]),
  );
}

function normalizeQuintState(
  raw: unknown,
  schema: RuntimeProjectionSchema,
  witness: Pick<
    SelectedIdentityWitnessBase<ProjectionRecord>,
    | "quintStateField"
    | "quintStateFieldPrefix"
    | "quintFieldNames"
    | "witnessProtocolField"
    | "witnessNoInvalidReason"
    | "witnessInvalidScenarioReasons"
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
          decodeHole: selectedIdentityUnexpectedHole,
        });
  if (protocol !== undefined && protocol.holes.length !== 0) {
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
  const scenarioResultField = witness.quintFieldNames?.["lastResult"];
  const scenarioResult = result["lastResult"];
  if (
    protocol !== undefined &&
    scenarioResultField !== undefined &&
    typeof scenarioResult === "string"
  ) {
    const invalidScenarioReasons = witness.witnessInvalidScenarioReasons;
    assertWitnessProtocolConsistentWithScenario({
      label: "selected identity",
      scenarioResult,
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
