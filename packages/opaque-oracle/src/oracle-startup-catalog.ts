import { Either } from "effect";
import {
  buildStatBlockCatalog,
  defineSrdStatBlockCollection,
  type SrdStatBlockCollection,
  type StatBlockCatalog,
  type StatBlockCatalogBuildIssue,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  defineSrdUnitCollection,
  type SrdUnitCollection,
  type UnitCatalog,
  type UnitCatalogBuildIssue,
} from "@dnd/surface/surface/unit-catalog";
import {
  closeSrdSurface,
  srdSurface,
  collectSurfaceAuthoredRelations,
  type SurfaceRelationClosureIssue,
  type SurfaceRelationTraversalIssue,
} from "@dnd/surface/surface/surface-catalog";
import { decodeSrdSurfaceEither } from "@dnd/surface/surface/schema";
import type { SrdSurface } from "@dnd/surface/surface/types";
import {
  deriveCharacterCreationWorkflowRoots,
  type CharacterCreationWorkflowRoots,
} from "@dnd/character-creation-runtime";
import type { OracleEvaluationServices } from "./oracle-evaluation.ts";

export type OracleStartupCatalogIssue =
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "canonicalCatalog";
      readonly issues: readonly (
        | UnitCatalogBuildIssue
        | StatBlockCatalogBuildIssue
      )[];
    }
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "surfaceRelations";
      readonly issues: readonly SurfaceRelationTraversalIssue[];
    }
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "surfaceClosure";
      readonly issues: readonly SurfaceRelationClosureIssue[];
    }
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "surfaceDecode";
      readonly message: string;
    }
  | {
      readonly tag: "oracleStartupCatalogIssue";
      readonly stage: "projectedCatalog";
      readonly issues: readonly (
        | UnitCatalogBuildIssue
        | StatBlockCatalogBuildIssue
      )[];
    };

export type OracleStartupCatalogIssues = readonly [
  OracleStartupCatalogIssue,
  ...OracleStartupCatalogIssue[],
];

export type OracleStartupCatalog = {
  readonly projection: SrdSurface;
  readonly projectionBytes: Uint8Array;
  readonly roots: CharacterCreationWorkflowRoots;
  readonly services: OracleEvaluationServices;
  readonly unitCollection: SrdUnitCollection;
  readonly statBlockCollection: SrdStatBlockCollection;
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
  issues: readonly (UnitCatalogBuildIssue | StatBlockCatalogBuildIssue)[],
): OracleStartupCatalogIssue => ({
  tag: "oracleStartupCatalogIssue",
  stage,
  issues,
});

const relationIssue = (
  stage: "surfaceRelations",
  issues: readonly SurfaceRelationTraversalIssue[],
): Extract<
  OracleStartupCatalogIssue,
  { readonly stage: "surfaceRelations" }
> => ({
  tag: "oracleStartupCatalogIssue",
  stage,
  issues,
});

const closureIssue = (
  issues: readonly SurfaceRelationClosureIssue[],
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
  if (unitResult.tag === "invalid") {
    failures.push(catalogIssue("canonicalCatalog", unitResult.issues));
  }
  if (statBlockResult.tag === "invalid") {
    failures.push(catalogIssue("canonicalCatalog", statBlockResult.issues));
  }
  if (failures.length > 0) {
    const firstFailure = failures[0];
    if (firstFailure !== undefined) {
      return Either.left([firstFailure, ...failures.slice(1)]);
    }
  }
  if (unitResult.tag === "invalid" || statBlockResult.tag === "invalid") {
    return Either.left([catalogIssue("canonicalCatalog", [])]);
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
  canonicalSurface: SrdSurface = srdSurface,
): Either.Either<OracleStartupCatalog, OracleStartupCatalogIssues> {
  const fullCatalogs = buildFullCatalogs(canonicalSurface);
  if (Either.isLeft(fullCatalogs)) return Either.left(fullCatalogs.left);

  const roots = deriveCharacterCreationWorkflowRoots({
    unitLibrary: fullCatalogs.right.unitCatalog,
  });
  const rootUnitIds = roots.unitIds.map(String);
  const rootStatBlockIds = canonicalSurface.statBlocks.map((record) =>
    String(record.id),
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
          rootUnitIds.includes(relation.targetRecordId)),
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
  if (unitResult.tag === "invalid") {
    failures.push(catalogIssue("projectedCatalog", unitResult.issues));
  }
  if (statBlockResult.tag === "invalid") {
    failures.push(catalogIssue("projectedCatalog", statBlockResult.issues));
  }
  if (failures.length > 0) {
    const firstFailure = failures[0];
    if (firstFailure !== undefined) {
      return Either.left([firstFailure, ...failures.slice(1)]);
    }
  }
  if (unitResult.tag === "invalid" || statBlockResult.tag === "invalid") {
    return Either.left([catalogIssue("projectedCatalog", [])]);
  }

  return Either.right({
    projection: decodedProjection.right,
    projectionBytes,
    roots,
    services: {
      unitLibrary: unitResult.catalog,
      statBlockCatalog: statBlockResult.catalog,
    },
    unitCollection,
    statBlockCollection,
  });
}
