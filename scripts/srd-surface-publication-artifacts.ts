import { createRequire } from "node:module";

import { Either, Schema } from "effect";

import {
  type SurfacePublicationArtifacts,
  serializeSurfacePublicationArtifact,
  SRD_SURFACE_PUBLICATION_SCHEMA_ARTIFACT,
} from "../packages/surface/src/surface/publication-artifacts.ts";
import {
  type PublishedSrdSurface,
  PublishedSrdSurfaceSchema,
  RulesExcerptSchema,
} from "../packages/surface/src/surface/schema.ts";
import { srdSurface } from "../packages/surface/src/surface/surface-catalog.ts";

type SourceResolution = {
  readonly part: string;
  readonly status: string;
};

type RulesExcerptResult =
  | {
      readonly tag: "ok";
      readonly rulesExcerpt: string;
    }
  | {
      readonly tag: "invalid-locator" | "empty-excerpt";
      readonly resolutions: ReadonlyArray<SourceResolution>;
    };

type AuditModule = {
  readonly buildReferenceIndex: () => unknown;
  readonly rulesExcerptForSection: (
    section: string,
    index: unknown,
  ) => RulesExcerptResult;
};

export type SurfacePublicationBuildIssue = {
  readonly recordId: string;
  readonly section: string;
  readonly reason: "invalid-locator" | "empty-excerpt" | "invalid-excerpt";
  readonly resolutions: ReadonlyArray<SourceResolution>;
};

export type SurfacePublicationBuildResult =
  | {
      readonly tag: "ok";
      readonly artifacts: Readonly<{
        readonly aggregate: unknown;
        readonly schema: unknown;
      }>;
      readonly bytes: SurfacePublicationArtifacts;
    }
  | {
      readonly tag: "invalid";
      readonly issues: ReadonlyArray<SurfacePublicationBuildIssue>;
    };

const require = createRequire(import.meta.url);
const audit =
  require("./srd521-surface-authored-corpus-audit.cjs") as AuditModule;

export function buildSrdSurfacePublication(): SurfacePublicationBuildResult {
  const index = audit.buildReferenceIndex();
  const issues: SurfacePublicationBuildIssue[] = [];

  const publishRecord = <
    Record extends {
      readonly id: string;
      readonly provenance: { readonly section: string };
    },
  >(
    record: Record,
  ): (Record & { readonly rulesExcerpt: string }) | undefined => {
    const result = audit.rulesExcerptForSection(
      record.provenance.section,
      index,
    );
    if (result.tag !== "ok") {
      issues.push({
        recordId: record.id,
        section: record.provenance.section,
        reason: result.tag,
        resolutions: result.resolutions,
      });
      return undefined;
    }
    const rulesExcerpt = Schema.decodeUnknownEither(RulesExcerptSchema)(
      result.rulesExcerpt,
    );
    if (Either.isLeft(rulesExcerpt)) {
      issues.push({
        recordId: record.id,
        section: record.provenance.section,
        reason: "invalid-excerpt",
        resolutions: [],
      });
      return undefined;
    }
    return { ...record, rulesExcerpt: rulesExcerpt.right };
  };

  const firstUnit = publishRecord(srdSurface.units[0]);
  const remainingUnits = srdSurface.units.slice(1).flatMap((record) => {
    const published = publishRecord(record);
    return published === undefined ? [] : [published];
  });
  const firstStatBlock = publishRecord(srdSurface.statBlocks[0]);
  const remainingStatBlocks = srdSurface.statBlocks
    .slice(1)
    .flatMap((record) => {
      const published = publishRecord(record);
      return published === undefined ? [] : [published];
    });
  if (
    issues.length > 0 ||
    firstUnit === undefined ||
    firstStatBlock === undefined
  ) {
    return { tag: "invalid", issues };
  }

  const units = [firstUnit, ...remainingUnits] as const;
  const statBlocks = [firstStatBlock, ...remainingStatBlocks] as const;
  const published: PublishedSrdSurface = {
    kind: srdSurface.kind,
    units,
    statBlocks,
  };

  /*
   * The canonical schemas established every mechanics field, and excerpt
   * generation established the only publication-only field.
   */
  const aggregate = Schema.encodeSync(PublishedSrdSurfaceSchema)(published);
  const artifacts = {
    aggregate,
    schema: SRD_SURFACE_PUBLICATION_SCHEMA_ARTIFACT,
  };
  return {
    tag: "ok",
    artifacts,
    bytes: {
      aggregate: serializeSurfacePublicationArtifact(artifacts.aggregate),
      schema: serializeSurfacePublicationArtifact(artifacts.schema),
    },
  };
}
