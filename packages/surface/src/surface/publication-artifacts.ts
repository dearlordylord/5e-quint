import { SrdSurfaceJsonSchema } from "./schema.ts";

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

export const SRD_SURFACE_PUBLICATION_SCHEMA_ARTIFACT = SrdSurfaceJsonSchema;

export const SURFACE_SCHEMA_BOUND_MEASURES = ["definitions", "bytes"] as const;
export type SurfaceSchemaBoundMeasure =
  (typeof SURFACE_SCHEMA_BOUND_MEASURES)[number];

export const SRD_SURFACE_SCHEMA_BOUNDS = {
  definitions: 10_000,
  bytes: 5_000_000,
} as const satisfies Readonly<Record<SurfaceSchemaBoundMeasure, number>>;

export const SRD_SURFACE_SCHEMA_SIZE = {
  definitions: Object.keys(SRD_SURFACE_PUBLICATION_SCHEMA_ARTIFACT.$defs ?? {})
    .length,
  bytes: serializeSurfacePublicationArtifact(
    SRD_SURFACE_PUBLICATION_SCHEMA_ARTIFACT,
  ).byteLength,
} as const satisfies Readonly<Record<SurfaceSchemaBoundMeasure, number>>;

export function serializeSurfacePublicationArtifact(value: unknown): Buffer {
  // The generated schema is intentionally compact: Effect's encoded union
  // graph is large enough that pretty-print indentation exceeds Node's string
  // size limit without changing the language-neutral contract.
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}
