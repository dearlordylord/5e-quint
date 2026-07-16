import { Schema } from "effect";

import { SrdSurfaceJsonSchema, SrdSurfaceSchema } from "./schema.ts";
import { srdSurface } from "./surface-catalog.ts";

export const SURFACE_PUBLICATION_MEMBERS = ["aggregate", "schema"] as const;
export type SurfacePublicationMember =
  (typeof SURFACE_PUBLICATION_MEMBERS)[number];
export type SurfacePublicationArtifacts = Readonly<
  Record<SurfacePublicationMember, Uint8Array>
>;

export const SRD_SURFACE_PUBLICATION_FILE_NAMES = {
  aggregate: "srd-surface.json",
  schema: "srd-surface.schema.json",
} as const satisfies Readonly<Record<SurfacePublicationMember, string>>;

export const SRD_SURFACE_PUBLICATION_ARTIFACTS = {
  aggregate: Schema.encodeSync(SrdSurfaceSchema)(srdSurface),
  schema: SrdSurfaceJsonSchema,
} as const satisfies Readonly<Record<SurfacePublicationMember, unknown>>;

export const SRD_SURFACE_PUBLICATION_ARTIFACT_BYTES: SurfacePublicationArtifacts =
  {
    aggregate: serializeSurfacePublicationArtifact(
      SRD_SURFACE_PUBLICATION_ARTIFACTS.aggregate,
    ),
    schema: serializeSurfacePublicationArtifact(
      SRD_SURFACE_PUBLICATION_ARTIFACTS.schema,
    ),
  };

export const SURFACE_SCHEMA_BOUND_MEASURES = ["definitions", "bytes"] as const;
export type SurfaceSchemaBoundMeasure =
  (typeof SURFACE_SCHEMA_BOUND_MEASURES)[number];

export const SRD_SURFACE_SCHEMA_BOUNDS = {
  definitions: 10_000,
  bytes: 5_000_000,
} as const satisfies Readonly<Record<SurfaceSchemaBoundMeasure, number>>;

export const SRD_SURFACE_SCHEMA_SIZE = {
  definitions: Object.keys(SrdSurfaceJsonSchema.$defs ?? {}).length,
  bytes: SRD_SURFACE_PUBLICATION_ARTIFACT_BYTES.schema.byteLength,
} as const satisfies Readonly<Record<SurfaceSchemaBoundMeasure, number>>;

export function serializeSurfacePublicationArtifact(value: unknown): Buffer {
  // The generated schema is intentionally compact: Effect's encoded union
  // graph is large enough that pretty-print indentation exceeds Node's string
  // size limit without changing the language-neutral contract.
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}
