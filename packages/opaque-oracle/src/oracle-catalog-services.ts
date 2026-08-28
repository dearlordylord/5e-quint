import { Either } from "effect";

import {
  buildStatBlockCatalog,
  defineSrdStatBlockCollection,
  type SrdStatBlockCollection,
  type StatBlockCatalogBuildIssue,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  defineSrdUnitCollection,
  type SrdUnitCollection,
  type UnitCatalogBuildIssue,
} from "@dnd/surface/surface/unit-catalog";
import type { SrdSurface } from "@dnd/surface/surface/types";

import type { OracleEvaluationServices } from "./oracle-evaluation.ts";

export type OracleEvaluationServicesBuildIssue =
  | {
      readonly tag: "unitCatalog";
      readonly issues: readonly UnitCatalogBuildIssue[];
    }
  | {
      readonly tag: "statBlockCatalog";
      readonly issues: readonly StatBlockCatalogBuildIssue[];
    };

export type OracleEvaluationServicesBuildIssues = readonly [
  OracleEvaluationServicesBuildIssue,
  ...OracleEvaluationServicesBuildIssue[],
];

/**
 * Build the two immutable lookup services from one already decoded Surface
 * projection. The caller supplies collections so this module never chooses
 * authored catalog membership.
 */
export function buildOracleEvaluationServices(input: {
  readonly unitCollection: SrdUnitCollection;
  readonly statBlockCollection: SrdStatBlockCollection;
}): Either.Either<
  OracleEvaluationServices,
  OracleEvaluationServicesBuildIssues
> {
  const units = buildUnitCatalog({ collections: [input.unitCollection] });
  const statBlocks = buildStatBlockCatalog({
    collections: [input.statBlockCollection],
  });
  const issues: OracleEvaluationServicesBuildIssue[] = [];
  if (units.tag === "invalid") {
    issues.push({ tag: "unitCatalog", issues: units.issues });
  }
  if (statBlocks.tag === "invalid") {
    issues.push({ tag: "statBlockCatalog", issues: statBlocks.issues });
  }
  if (units.tag === "invalid" || statBlocks.tag === "invalid") {
    const [firstIssue, ...remainingIssues] = issues;
    if (firstIssue === undefined) {
      throw new Error("Oracle catalog failure did not retain its issue.");
    }
    return Either.left([firstIssue, ...remainingIssues]);
  }
  return Either.right({
    unitLibrary: Object.freeze(units.catalog),
    statBlockCatalog: Object.freeze(statBlocks.catalog),
  });
}

/** Build the services directly from the exact records in a decoded Surface. */
export function buildOracleEvaluationServicesFromSurface(
  surface: Pick<SrdSurface, "units" | "statBlocks">,
): Either.Either<
  OracleEvaluationServices,
  OracleEvaluationServicesBuildIssues
> {
  return buildOracleEvaluationServices({
    unitCollection: defineSrdUnitCollection({ units: surface.units }),
    statBlockCollection: defineSrdStatBlockCollection({
      statBlocks: surface.statBlocks,
    }),
  });
}
