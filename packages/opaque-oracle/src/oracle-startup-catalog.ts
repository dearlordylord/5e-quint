import { Result } from "effect";
import {
  buildStatBlockCatalog,
  defineSrdStatBlockCollection,
  type SrdStatBlockCollection,
  type StatBlockCatalog,
  type StatBlockCatalogBuildIssue,
} from "@dnd/surface/surface/stat-block-catalog-core";
import {
  buildUnitCatalog,
  defineSrdUnitCollection,
  type SrdUnitCollection,
  type UnitCatalog,
  type UnitCatalogBuildIssue,
} from "@dnd/surface/surface/unit-catalog-core";
import {
  type SurfaceRelationClosureIssues,
  type SurfaceRelationTraversalIssues,
  closeSrdSurface,
} from "@dnd/surface/surface/surface-relations";
import { decodeSrdSurfaceResult } from "@dnd/surface/surface/schema";
import type { SrdSurface } from "@dnd/surface/surface/types";
import { deriveCharacterCreationWorkflowRoots } from "@dnd/character-creation-runtime/workflow-horizon";
import type { OracleEvaluationServices } from "./oracle-evaluation.ts";

type OracleCatalogBuildIssue =
  | UnitCatalogBuildIssue
  | StatBlockCatalogBuildIssue;
type OracleCatalogBuildIssues = readonly [
  OracleCatalogBuildIssue,
  ...OracleCatalogBuildIssue[],
];

export type OracleStartupCatalogIssue =
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "canonicalCatalog";
      readonly issues: OracleCatalogBuildIssues;
    }
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "catalogInvariant";
      readonly catalogStage: "canonicalCatalog" | "projectedCatalog";
      readonly message: string;
    }
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "surfaceRelations";
      readonly issues: SurfaceRelationTraversalIssues;
    }
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "surfaceClosure";
      readonly issues: SurfaceRelationClosureIssues;
    }
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "surfaceDecode";
      readonly message: string;
    }
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "projectedCatalog";
      readonly issues: OracleCatalogBuildIssues;
    };

export type OracleStartupCatalogIssues = readonly [
  OracleStartupCatalogIssue,
  ...OracleStartupCatalogIssue[],
];

export type OracleStartupCatalog = {
  readonly projection: SrdSurface;
  readonly projectionBytes: Uint8Array;
  readonly services: OracleEvaluationServices;
};

/**
 * Encode the exact startup aggregate used by the application. The trailing LF
 * is part of the bytes, making the staged asset suitable for line-oriented
 * inspection while keeping one canonical digest input.
 */
export function encodeOracleStartupSurface(surface: SrdSurface): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(surface)}\n`);
}

const catalogIssue = (
  stage: "canonicalCatalog" | "projectedCatalog",
  issues: OracleCatalogBuildIssues,
): OracleStartupCatalogIssue => ({
  tag: "oracleStartupCatalogIssue",
  stage,
  issues,
});

const catalogInvariantIssue = (
  catalogStage: "canonicalCatalog" | "projectedCatalog",
): OracleStartupCatalogIssue => ({
  tag: "oracleStartupCatalogIssue",
  stage: "catalogInvariant",
  catalogStage,
  message: "An invalid catalog result did not contain a diagnostic issue",
});

const nonEmptyIssues = <Issue>(
  issues: readonly Issue[],
): readonly [Issue, ...Issue[]] | undefined => {
  const firstIssue = issues[0];
  return firstIssue === undefined
    ? undefined
    : [firstIssue, ...issues.slice(1)];
};

const catalogFailure = (
  stage: "canonicalCatalog" | "projectedCatalog",
  result:
    | { readonly tag: "ok"; readonly catalog: unknown }
    | {
        readonly tag: "invalid";
        readonly issues: readonly OracleCatalogBuildIssue[];
      },
): OracleStartupCatalogIssue | undefined => {
  if (result.tag === "ok") return undefined;
  const issues = nonEmptyIssues(result.issues);
  return issues === undefined
    ? catalogInvariantIssue(stage)
    : catalogIssue(stage, issues);
};

const relationIssue = (
  stage: "surfaceRelations",
  issues: SurfaceRelationTraversalIssues,
): Extract<
  OracleStartupCatalogIssue,
  { readonly stage: "surfaceRelations" }
> => ({
  tag: "oracleStartupCatalogIssue",
  stage,
  issues,
});

const closureIssue = (
  issues: SurfaceRelationClosureIssues,
): Extract<
  OracleStartupCatalogIssue,
  { readonly stage: "surfaceClosure" }
> => ({
  tag: "oracleStartupCatalogIssue",
  stage: "surfaceClosure",
  issues,
});

const decodeIssue = (message: string): OracleStartupCatalogIssue => ({
  tag: "oracleStartupCatalogIssue",
  stage: "surfaceDecode",
  message,
});

const fullUnitCollection = (surface: SrdSurface): SrdUnitCollection =>
  defineSrdUnitCollection({ units: surface.units });

const fullStatBlockCollection = (surface: SrdSurface): SrdStatBlockCollection =>
  defineSrdStatBlockCollection({
    statBlocks: surface.statBlocks,
  });

const parseProjectionBytes = (
  bytes: Uint8Array,
): Result.Result<unknown, string> => {
  try {
    return Result.succeed(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    return Result.fail(String(error));
  }
};

const buildFullCatalogs = (
  surface: SrdSurface,
): Result.Result<
  {
    readonly unitCatalog: UnitCatalog;
    readonly statBlockCatalog: StatBlockCatalog;
  },
  readonly [OracleStartupCatalogIssue, ...OracleStartupCatalogIssue[]]
> => {
  const unitCollection = fullUnitCollection(surface);
  const statBlockCollection = fullStatBlockCollection(surface);
  const unitResult = buildUnitCatalog({ collections: [unitCollection] });
  const statBlockResult = buildStatBlockCatalog({
    collections: [statBlockCollection],
  });
  const failures: OracleStartupCatalogIssue[] = [];
  const unitFailure = catalogFailure("canonicalCatalog", unitResult);
  if (unitFailure !== undefined) failures.push(unitFailure);
  const statBlockFailure = catalogFailure("canonicalCatalog", statBlockResult);
  if (statBlockFailure !== undefined) failures.push(statBlockFailure);
  if (failures.length > 0) {
    const firstFailure = failures[0];
    if (firstFailure !== undefined) {
      return Result.fail([firstFailure, ...failures.slice(1)]);
    }
  }
  if (unitResult.tag === "invalid" || statBlockResult.tag === "invalid") {
    return Result.fail([catalogInvariantIssue("canonicalCatalog")]);
  }
  return Result.succeed({
    unitCatalog: unitResult.catalog,
    statBlockCatalog: statBlockResult.catalog,
  });
};

/**
 * Build the one level-one/two startup projection and the exact catalog
 * services consumed by evaluation. All stat blocks are retained because the
 * Case roster and known-form inputs admit any canonical stat-block id; this is
 * a contract boundary, not an invented level assignment.
 */
export function buildOracleStartupCatalog(
  canonicalSurface: SrdSurface,
): Result.Result<OracleStartupCatalog, OracleStartupCatalogIssues> {
  const fullCatalogs = buildFullCatalogs(canonicalSurface);
  if (Result.isFailure(fullCatalogs)) return Result.fail(fullCatalogs.failure);

  const roots = deriveCharacterCreationWorkflowRoots({
    unitLibrary: fullCatalogs.success.unitCatalog,
  });
  const projection = startupSurfaceProjection(canonicalSurface, roots.unitIds);
  if (Result.isFailure(projection)) return Result.fail(projection.failure);

  const projectionBytes = encodeOracleStartupSurface(projection.success);
  const decodedProjection = decodeStartupProjection(projectionBytes);
  if (Result.isFailure(decodedProjection)) {
    return Result.fail([decodeIssue(decodedProjection.failure)]);
  }

  const projectedCatalogs = buildProjectedCatalogs(decodedProjection.success);
  if (Result.isFailure(projectedCatalogs)) {
    return Result.fail(projectedCatalogs.failure);
  }

  return Result.succeed({
    projection: decodedProjection.success,
    projectionBytes,
    services: projectedCatalogs.success,
  });
}

function startupSurfaceProjection(
  canonicalSurface: SrdSurface,
  rootUnitIds: readonly SrdSurface["units"][number]["id"][],
): Result.Result<SrdSurface, OracleStartupCatalogIssues> {
  const projection = closeSrdSurface({
    surface: canonicalSurface,
    rootUnitIds,
    rootStatBlockIds: canonicalSurface.statBlocks.map((record) => record.id),
    relationSelection: {
      // Every mechanics dependency is part of the complete retained graph.
      // A pure reference is included when the workflow or catalog builder
      // needs its target to remain selectable/lookup-able.
      includeDependency: () => true,
      includeReference: (relation) =>
        relation.relation === "subclass-choice" ||
        (relation.targetKind === "unit" &&
          rootUnitIds.some((rootId) => rootId === relation.targetRecordId)),
    },
  });
  return Result.isFailure(projection)
    ? Result.fail(startupSurfaceProjectionIssues(projection.failure))
    : Result.succeed(projection.success);
}

function startupSurfaceProjectionIssues(
  issues: SurfaceRelationClosureIssues,
): OracleStartupCatalogIssues {
  const traversalIssues: SurfaceRelationTraversalIssues[number][] = [];
  for (const issue of issues) {
    if (issue.tag === "surfaceRelationTraversalIssue") {
      traversalIssues.push(issue);
    }
  }
  if (traversalIssues.length === issues.length) {
    const nonEmptyTraversalIssues = nonEmptyIssues(traversalIssues);
    if (nonEmptyTraversalIssues !== undefined) {
      return [relationIssue("surfaceRelations", nonEmptyTraversalIssues)];
    }
  }
  return [closureIssue(issues)];
}

function decodeStartupProjection(
  bytes: Uint8Array,
): Result.Result<SrdSurface, string> {
  const parsedProjection = parseProjectionBytes(bytes);
  if (Result.isFailure(parsedProjection))
    return Result.fail(parsedProjection.failure);
  const decodedProjection = decodeSrdSurfaceResult(parsedProjection.success);
  return Result.isFailure(decodedProjection)
    ? Result.fail(String(decodedProjection.failure))
    : Result.succeed(decodedProjection.success);
}

function buildProjectedCatalogs(
  projection: SrdSurface,
): Result.Result<OracleEvaluationServices, OracleStartupCatalogIssues> {
  const unitCollection = defineSrdUnitCollection({ units: projection.units });
  const statBlockCollection = defineSrdStatBlockCollection({
    statBlocks: projection.statBlocks,
  });
  const unitResult = buildUnitCatalog({ collections: [unitCollection] });
  const statBlockResult = buildStatBlockCatalog({
    collections: [statBlockCollection],
  });
  const failures: OracleStartupCatalogIssue[] = [];
  const unitFailure = catalogFailure("projectedCatalog", unitResult);
  if (unitFailure !== undefined) failures.push(unitFailure);
  const statBlockFailure = catalogFailure("projectedCatalog", statBlockResult);
  if (statBlockFailure !== undefined) failures.push(statBlockFailure);
  if (failures.length > 0) {
    const firstFailure = failures[0];
    if (firstFailure !== undefined) {
      return Result.fail([firstFailure, ...failures.slice(1)]);
    }
  }
  if (unitResult.tag === "invalid" || statBlockResult.tag === "invalid") {
    return Result.fail([catalogInvariantIssue("projectedCatalog")]);
  }
  return Result.succeed({
    unitLibrary: unitResult.catalog,
    statBlockCatalog: statBlockResult.catalog,
  });
}
