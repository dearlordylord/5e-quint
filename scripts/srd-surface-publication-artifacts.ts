import { createRequire } from "node:module";

import type { Schema as SchemaTypes } from "effect";

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
import { effectRuntimeForPackageOwners } from "#dnd-package-effect-runtime";

const { Result, Schema } = effectRuntimeForPackageOwners(["surface"]).effect;

const SourceResolutionSchema = Schema.Union([
  Schema.Struct({
    part: Schema.Literal(""),
    status: Schema.Literal("empty-section-part"),
  }),
  Schema.Struct({
    part: Schema.Trimmed.check(Schema.isNonEmpty()),
    status: Schema.Literals([
      "ok-line-range",
      "ok-line-range-alias",
      "bad-line-range",
      "ok-heading",
      "ok-heading-alias",
      "ok-prose-anchor",
      "ok-prose-anchor-alias",
      "missing-anchor",
      "missing-file",
      "ok-file",
      "ok-file-alias",
    ]),
  }),
]);
type SourceResolution = SchemaTypes.Schema.Type<typeof SourceResolutionSchema>;

const RulesExcerptResultSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("ok"),
    rulesExcerpt: RulesExcerptSchema,
  }),
  Schema.Struct({
    tag: Schema.Literals([
      "invalid-locator",
      "invalid-resolution",
      "empty-excerpt",
    ]),
    resolutions: Schema.Array(SourceResolutionSchema),
  }),
]);

export type SurfacePublicationExcerptSource = {
  readonly buildReferenceIndex: () => unknown;
  readonly rulesExcerptForSection: (section: string, index: unknown) => unknown;
};

export type SurfacePublicationBuildIssue =
  | {
      readonly kind: "audit-module-unavailable";
      readonly message: string;
    }
  | {
      readonly kind: "source-index-unreadable";
      readonly message: string;
    }
  | {
      readonly kind: "excerpt-resolution-failed";
      readonly recordId: string;
      readonly section: string;
      readonly message: string;
    }
  | {
      readonly kind: "excerpt-result-invalid";
      readonly recordId: string;
      readonly section: string;
      readonly message: string;
    }
  | {
      readonly kind: "record-excerpt-invalid";
      readonly recordId: string;
      readonly section: string;
      readonly reason:
        | "invalid-locator"
        | "invalid-resolution"
        | "empty-excerpt";
      readonly resolutions: ReadonlyArray<SourceResolution>;
    };

export type SurfacePublicationBuildResult =
  | {
      readonly tag: "ok";
      readonly bytes: SurfacePublicationArtifacts;
    }
  | {
      readonly tag: "invalid";
      readonly issues: readonly [
        SurfacePublicationBuildIssue,
        ...SurfacePublicationBuildIssue[],
      ];
    };

const require = createRequire(import.meta.url);

const messageForUnknown = (value: unknown): string =>
  value instanceof Error ? value.message : String(value);

const loadAuditModule = ():
  | { readonly tag: "ok"; readonly audit: SurfacePublicationExcerptSource }
  | { readonly tag: "invalid"; readonly message: string } => {
  let candidate: unknown;
  try {
    candidate = require("./srd521-surface-authored-corpus-audit.cjs");
  } catch (error) {
    return { tag: "invalid", message: messageForUnknown(error) };
  }
  if (typeof candidate !== "object" || candidate === null) {
    return { tag: "invalid", message: "Audit module did not export an object" };
  }
  const buildReferenceIndex = Reflect.get(candidate, "buildReferenceIndex");
  const rulesExcerptForSection = Reflect.get(
    candidate,
    "rulesExcerptForSection",
  );
  if (
    typeof buildReferenceIndex !== "function" ||
    typeof rulesExcerptForSection !== "function"
  ) {
    return {
      tag: "invalid",
      message: "Audit module does not export the required excerpt functions",
    };
  }
  return {
    tag: "ok",
    audit: {
      buildReferenceIndex: () => buildReferenceIndex(),
      rulesExcerptForSection: (section, index) =>
        rulesExcerptForSection(section, index),
    },
  };
};

export function buildSrdSurfacePublication(
  options: {
    readonly excerptSource?: SurfacePublicationExcerptSource;
  } = {},
): SurfacePublicationBuildResult {
  const loaded =
    options.excerptSource === undefined
      ? loadAuditModule()
      : { tag: "ok" as const, audit: options.excerptSource };
  if (loaded.tag === "invalid") {
    return {
      tag: "invalid",
      issues: [{ kind: "audit-module-unavailable", message: loaded.message }],
    };
  }
  let index: unknown;
  try {
    index = loaded.audit.buildReferenceIndex();
  } catch (error) {
    return {
      tag: "invalid",
      issues: [
        {
          kind: "source-index-unreadable",
          message: messageForUnknown(error),
        },
      ],
    };
  }
  const issues: SurfacePublicationBuildIssue[] = [];

  const publishRecord = <
    Record extends {
      readonly id: string;
      readonly provenance: { readonly section: string };
    },
  >(
    record: Record,
  ): (Record & { readonly rulesExcerpt: string }) | undefined => {
    let candidate: unknown;
    try {
      candidate = loaded.audit.rulesExcerptForSection(
        record.provenance.section,
        index,
      );
    } catch (error) {
      issues.push({
        kind: "excerpt-resolution-failed",
        recordId: record.id,
        section: record.provenance.section,
        message: messageForUnknown(error),
      });
      return undefined;
    }
    const decodedResult = Schema.decodeUnknownResult(RulesExcerptResultSchema, {
      onExcessProperty: "error",
    })(candidate);
    if (Result.isFailure(decodedResult)) {
      issues.push({
        kind: "excerpt-result-invalid",
        recordId: record.id,
        section: record.provenance.section,
        message: decodedResult.failure.message,
      });
      return undefined;
    }
    const result = decodedResult.success;
    if (result.tag !== "ok") {
      issues.push({
        kind: "record-excerpt-invalid",
        recordId: record.id,
        section: record.provenance.section,
        reason: result.tag,
        resolutions: result.resolutions,
      });
      return undefined;
    }
    return { ...record, rulesExcerpt: result.rulesExcerpt };
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
  if (firstUnit === undefined && issues.length === 0) {
    issues.push({
      kind: "excerpt-result-invalid",
      recordId: srdSurface.units[0].id,
      section: srdSurface.units[0].provenance.section,
      message: "Publishing the first Unit failed without a diagnostic",
    });
  }
  if (firstStatBlock === undefined && issues.length === 0) {
    issues.push({
      kind: "excerpt-result-invalid",
      recordId: srdSurface.statBlocks[0].id,
      section: srdSurface.statBlocks[0].provenance.section,
      message: "Publishing the first Stat Block failed without a diagnostic",
    });
  }
  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    return { tag: "invalid", issues: [firstIssue, ...issues.slice(1)] };
  }

  // No excerpt can be absent here: publishRecord records an issue on every
  // invalid path, and the issue branch above returns before publication.
  if (firstUnit === undefined || firstStatBlock === undefined) {
    throw new Error("Surface publication lost a record without a diagnostic");
  }
  const units = [firstUnit, ...remainingUnits] as const;
  const statBlocks = [firstStatBlock, ...remainingStatBlocks] as const;
  const published: PublishedSrdSurface = {
    kind: srdSurface.kind,
    units,
    statBlocks,
  };

  const aggregate = Schema.encodeSync(PublishedSrdSurfaceSchema)(published);
  const artifacts = {
    aggregate,
    schema: SRD_SURFACE_PUBLICATION_SCHEMA_ARTIFACT,
  };
  return {
    tag: "ok",
    bytes: {
      aggregate: serializeSurfacePublicationArtifact(artifacts.aggregate),
      schema: serializeSurfacePublicationArtifact(artifacts.schema),
    },
  };
}

export function describeSurfacePublicationBuildIssue(
  issue: SurfacePublicationBuildIssue,
): string {
  if (
    issue.kind === "audit-module-unavailable" ||
    issue.kind === "source-index-unreadable"
  ) {
    return `${issue.kind}: ${issue.message}`;
  }
  if (
    issue.kind === "excerpt-resolution-failed" ||
    issue.kind === "excerpt-result-invalid"
  ) {
    return `${issue.kind}: ${issue.recordId}: ${issue.section}: ${issue.message}`;
  }
  return `${issue.kind}: ${issue.recordId}: ${issue.reason}: ${issue.section}`;
}
