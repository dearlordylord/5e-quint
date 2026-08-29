import { Either, Match } from "effect";
import { describe, expect, test } from "vitest";

import { unitId } from "@dnd/shared/game-facts";

import {
  admitFeatureMasteryUnitProcedure,
  projectFeatureMasteryUnitProcedure,
} from "./feature-mastery-procedure-admission.ts";
import { decodeUnitRecordEither } from "./schema.ts";
import { srdSurface } from "./surface-catalog.ts";
import type { SrdUnitRecord } from "./types.ts";

type SrdFeatureMasteryProcedureUnit = Extract<
  SrdUnitRecord,
  {
    readonly kind: "class_feature" | "feat" | "mastery" | "species_trait";
  }
>;

const procedureUnits = srdSurface.units.filter(
  (unit): unit is SrdFeatureMasteryProcedureUnit =>
    Match.value(unit.kind).pipe(
      Match.when("class_feature", () => true),
      Match.when("feat", () => true),
      Match.when("mastery", () => true),
      Match.when("species_trait", () => true),
      Match.orElse(() => false),
    ),
);

describe("feature and mastery Unit procedure admission", () => {
  test("projects the exact 158-root canonical denominator once per root", () => {
    expect(
      procedureUnits.filter((unit) => unit.kind === "class_feature"),
    ).toHaveLength(118);
    expect(procedureUnits.filter((unit) => unit.kind === "feat")).toHaveLength(
      13,
    );
    expect(
      procedureUnits.filter((unit) => unit.kind === "species_trait"),
    ).toHaveLength(22);
    expect(
      procedureUnits.filter((unit) => unit.kind === "mastery"),
    ).toHaveLength(5);
    expect(procedureUnits).toHaveLength(158);

    const results = procedureUnits.map(admitFeatureMasteryUnitProcedure);
    expect(results).toHaveLength(procedureUnits.length);
    expect(results.every((result) => result.tag === "admitted")).toBe(true);
    expect(
      results.map((result) =>
        result.tag === "admitted" ? result.projection.unitKind : "rejected",
      ),
    ).toEqual(procedureUnits.map((unit) => unit.kind));
  });

  test("ignores renamed authored identity while preserving mechanics", () => {
    const source = procedureUnits.find(
      (unit) =>
        unit.kind === "class_feature" &&
        unit.mechanics.family === "reaction_roll_or_damage_reduction",
    );
    expect(source).toBeDefined();
    if (source === undefined) return;

    const renamed = {
      ...source,
      id: unitId("synthetic_renamed_reaction_procedure"),
      name: "Synthetic Renamed Reaction Procedure",
    };

    expect(projectFeatureMasteryUnitProcedure(renamed)).toEqual(
      projectFeatureMasteryUnitProcedure(source),
    );
  });

  test("rejects an unrelated Unit role with a typed result", () => {
    const sibling = srdSurface.units.find((unit) => unit.kind === "class");
    expect(sibling).toBeDefined();
    if (sibling === undefined) return;

    expect(admitFeatureMasteryUnitProcedure(sibling)).toEqual({
      tag: "rejected",
      issues: [
        {
          code: "unsupportedUnitRole",
          unitKind: "class",
          message:
            "Unit role class does not own a feature or mastery procedure.",
        },
      ],
    });
  });

  test("retains composite parts in order under one whole procedure", () => {
    const source = procedureUnits.find(
      (unit) =>
        unit.kind === "class_feature" && unit.mechanics.family === "composite",
    );
    expect(source).toBeDefined();
    if (
      source === undefined ||
      source.kind !== "class_feature" ||
      source.mechanics.family !== "composite"
    ) {
      return;
    }

    const projection = projectFeatureMasteryUnitProcedure(source);
    expect(projection.unitKind).toBe("class_feature");
    if (
      projection.unitKind !== "class_feature" ||
      projection.procedure.family !== "composite"
    ) {
      return;
    }

    expect(projection.procedure.parts).toEqual(source.mechanics.parts);
    expect(projection.procedure.parts).toHaveLength(
      source.mechanics.parts.length,
    );
  });

  test("rejects a composite sibling family instead of dropping the part", () => {
    const composite = procedureUnits.find(
      (unit) =>
        unit.kind === "class_feature" && unit.mechanics.family === "composite",
    );
    const sibling = procedureUnits.find(
      (unit) =>
        unit.kind === "class_feature" &&
        unit.mechanics.family === "class_feature_acquisition_choice",
    );
    expect(composite).toBeDefined();
    expect(sibling).toBeDefined();
    if (
      composite === undefined ||
      composite.kind !== "class_feature" ||
      sibling === undefined ||
      sibling.kind !== "class_feature"
    ) {
      return;
    }

    const decoded = decodeUnitRecordEither({
      ...composite,
      mechanics: {
        family: "composite",
        parts: [sibling.mechanics],
      },
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });
});
