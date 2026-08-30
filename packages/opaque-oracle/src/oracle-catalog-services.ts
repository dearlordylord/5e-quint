import { Result } from "effect";

import {
  buildStatBlockCatalog,
  defineSrdStatBlockCollection,
  type SrdStatBlockCollection,
  type StatBlockCatalogBuildIssue,
} from "@dnd/surface/surface/stat-block-catalog-core";
import {
  buildUnitCatalog,
  defineSrdUnitCollection,
  type SrdUnitCollection,
  type UnitCatalogBuildIssue,
} from "@dnd/surface/surface/unit-catalog-core";
import type { SrdSurface } from "@dnd/surface/surface/types";

import type { OracleEvaluationServices } from "./oracle-evaluation.ts";

export type OracleEvaluationServicesBuildIssue =
  | {
      readonly tag: "unitCatalog";
      readonly issues: readonly [
        UnitCatalogBuildIssue,
        ...UnitCatalogBuildIssue[],
      ];
    }
  | {
      readonly tag: "statBlockCatalog";
      readonly issues: readonly [
        StatBlockCatalogBuildIssue,
        ...StatBlockCatalogBuildIssue[],
      ];
    }
  | {
      readonly tag: "catalogInvariant";
      readonly catalog: "unit" | "statBlock";
      readonly message: string;
    };

export type OracleEvaluationServicesBuildIssues = readonly [
  OracleEvaluationServicesBuildIssue,
  ...OracleEvaluationServicesBuildIssue[],
];

const nonEmptyIssues = <Issue>(
  issues: readonly Issue[],
): readonly [Issue, ...Issue[]] | undefined => {
  const firstIssue = issues[0];
  return firstIssue === undefined
    ? undefined
    : [firstIssue, ...issues.slice(1)];
};

/**
 * Build the two immutable lookup services from one already decoded Surface
 * projection. The caller supplies collections so this module never chooses
 * authored catalog membership.
 */
export function buildOracleEvaluationServices(input: {
  readonly unitCollection: SrdUnitCollection;
  readonly statBlockCollection: SrdStatBlockCollection;
}): Result.Result<
  OracleEvaluationServices,
  OracleEvaluationServicesBuildIssues
> {
  const units = buildUnitCatalog({ collections: [input.unitCollection] });
  const statBlocks = buildStatBlockCatalog({
    collections: [input.statBlockCollection],
  });
  const issues: OracleEvaluationServicesBuildIssue[] = [];
  if (units.tag === "invalid") {
    const unitIssues = nonEmptyIssues(units.issues);
    issues.push(
      unitIssues === undefined
        ? {
            tag: "catalogInvariant",
            catalog: "unit",
            message: "An invalid Unit catalog had no diagnostic issue",
          }
        : { tag: "unitCatalog", issues: unitIssues },
    );
  }
  if (statBlocks.tag === "invalid") {
    const statBlockIssues = nonEmptyIssues(statBlocks.issues);
    issues.push(
      statBlockIssues === undefined
        ? {
            tag: "catalogInvariant",
            catalog: "statBlock",
            message: "An invalid Stat Block catalog had no diagnostic issue",
          }
        : { tag: "statBlockCatalog", issues: statBlockIssues },
    );
  }
  if (units.tag === "invalid" || statBlocks.tag === "invalid") {
    const [firstIssue, ...remainingIssues] = issues;
    if (firstIssue === undefined) {
      return Result.fail([
        {
          tag: "catalogInvariant",
          catalog: "unit",
          message: "Catalog failure did not retain its issue",
        },
      ]);
    }
    return Result.fail([firstIssue, ...remainingIssues]);
  }
  return Result.succeed({
    unitLibrary: Object.freeze(units.catalog),
    statBlockCatalog: Object.freeze(statBlocks.catalog),
  });
}

/** Build the services directly from the exact records in a decoded Surface. */
export function buildOracleEvaluationServicesFromSurface(
  surface: Pick<SrdSurface, "units" | "statBlocks">,
): Result.Result<
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
