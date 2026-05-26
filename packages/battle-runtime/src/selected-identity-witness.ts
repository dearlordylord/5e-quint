import {
  run,
  stateCheck,
  type SimpleActionMap,
  type SimpleDriver,
} from "@firfi/quint-connect";
import { Match } from "effect";
import { describe, expect, it } from "vitest";

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

export type SelectedIdentityProcedure<P> = {
  readonly actionName: `do${string}`;
  readonly projectionAfter: P;
  readonly discover: () => P | void | Promise<P | void>;
};

export type SelectedIdentityUnit<P> = {
  readonly unitId: string;
  readonly procedures: ReadonlyArray<SelectedIdentityProcedure<P>>;
};

export type SelectedIdentityWitness<S extends ProjectionSchema> = {
  readonly describeLabel: string;
  readonly taskId: string;
  readonly specFile: string;
  readonly projectionSchema: S;
  readonly initialProjection: ProjectionOf<S>;
  readonly units: ReadonlyArray<SelectedIdentityUnit<ProjectionOf<S>>>;
};

const byKind = Match.type<ProjectionFieldKind>();

export function defineSelectedIdentityWitness<S extends ProjectionSchema>(
  witness: SelectedIdentityWitness<S>,
): void {
  type P = ProjectionOf<S>;

  const createDriver = (): SimpleDriver<P, SimpleActionMap> => {
    let projection: P = witness.initialProjection;
    const actions: Record<
      string,
      { readonly picks: Record<string, never>; readonly handler: () => void | Promise<void> }
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
            const computed = await procedure.discover();
            projection =
              computed === undefined ? procedure.projectionAfter : computed;
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
    (raw: unknown): P => normalizeQuintState(raw, witness.projectionSchema),
    (spec: P, impl: P): boolean => {
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

    it("replays MBT parity", async () => {
      await run({
        spec: witness.specFile,
        init: "init",
        step: "step",
        driver: createDriver,
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: Number(process.env["MBT_TRACES"] ?? 1),
        maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
        stateCheck: witnessStateCheck,
      });
    }, 120_000);
  });
}

function normalizeQuintState<S extends ProjectionSchema>(
  raw: unknown,
  schema: S,
): ProjectionOf<S> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  const state = raw as Record<string, unknown>;
  const result: Record<string, boolean | number | string> = {};
  for (const [field, kind] of Object.entries(schema)) {
    const qKey = quintFieldName(field);
    result[field] = parseQuintField(state[qKey], kind, qKey);
  }
  return result as ProjectionOf<S>;
}

function quintFieldName(field: string): string {
  return `q${field.charAt(0).toUpperCase()}${field.slice(1)}`;
}

function parseQuintField(
  value: unknown,
  kind: ProjectionFieldKind,
  qKey: string,
): boolean | number | string {
  return byKind.pipe(
    Match.when("bool", () => parseBool(value, qKey)),
    Match.when("int", () => parseInt(value, qKey)),
    Match.when("str", () => parseStr(value, qKey)),
    Match.exhaustive,
  )(kind);
}

function parseBool(value: unknown, qKey: string): boolean {
  if (typeof value === "boolean") return value;
  throw new Error(`Expected boolean Quint field ${qKey}, got ${String(value)}.`);
}

function parseInt(value: unknown, qKey: string): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`Expected integer Quint field ${qKey}, got ${String(value)}.`);
}

function parseStr(value: unknown, qKey: string): string {
  if (typeof value === "string") return value;
  throw new Error(`Expected string Quint field ${qKey}, got ${String(value)}.`);
}
