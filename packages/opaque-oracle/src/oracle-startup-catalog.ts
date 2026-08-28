import { Either } from "effect";
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
  collectSurfaceAuthoredRelations,
} from "@dnd/surface/surface/surface-relations";
import { decodeSrdSurfaceEither } from "@dnd/surface/surface/schema";
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
): Either.Either<unknown, string> => {
  try {
    return Either.right(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    return Either.left(String(error));
  }
};

const buildFullCatalogs = (
  surface: SrdSurface,
): Either.Either<
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
      return Either.left([firstFailure, ...failures.slice(1)]);
    }
  }
  if (unitResult.tag === "invalid" || statBlockResult.tag === "invalid") {
    return Either.left([catalogInvariantIssue("canonicalCatalog")]);
  }
  return Either.right({
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
): Either.Either<OracleStartupCatalog, OracleStartupCatalogIssues> {
  const fullCatalogs = buildFullCatalogs(canonicalSurface);
  if (Either.isLeft(fullCatalogs)) return Either.left(fullCatalogs.left);

  const roots = deriveCharacterCreationWorkflowRoots({
    unitLibrary: fullCatalogs.right.unitCatalog,
  });
  const rootUnitIds = roots.unitIds;
  const rootStatBlockIds = canonicalSurface.statBlocks.map(
    (record) => record.id,
  );
  const relations = collectSurfaceAuthoredRelations(canonicalSurface);
  if (Either.isLeft(relations)) {
    return Either.left([relationIssue("surfaceRelations", relations.left)]);
  }

  const projection = closeSrdSurface({
    surface: canonicalSurface,
    rootUnitIds,
    rootStatBlockIds,
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
  if (Either.isLeft(projection)) {
    return Either.left([closureIssue(projection.left)]);
  }

  const projectionBytes = encodeOracleStartupSurface(projection.right);
  const parsedProjection = parseProjectionBytes(projectionBytes);
  if (Either.isLeft(parsedProjection)) {
    return Either.left([decodeIssue(parsedProjection.left)]);
  }
  const decodedProjection = decodeSrdSurfaceEither(parsedProjection.right);
  if (Either.isLeft(decodedProjection)) {
    return Either.left([decodeIssue(String(decodedProjection.left))]);
  }

  const unitCollection = defineSrdUnitCollection({
    units: decodedProjection.right.units,
  });
  const statBlockCollection = defineSrdStatBlockCollection({
    statBlocks: decodedProjection.right.statBlocks,
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
      return Either.left([firstFailure, ...failures.slice(1)]);
    }
  }
  if (unitResult.tag === "invalid" || statBlockResult.tag === "invalid") {
    return Either.left([catalogInvariantIssue("projectedCatalog")]);
  }

  return Either.right({
    projection: decodedProjection.right,
    projectionBytes,
    services: {
      unitLibrary: unitResult.catalog,
      statBlockCatalog: statBlockResult.catalog,
    },
  });
}
