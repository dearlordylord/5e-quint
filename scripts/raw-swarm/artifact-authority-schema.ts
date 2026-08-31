import { Schema } from "effect";

export const ArtifactSha256Schema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
  Schema.brand("ArtifactSha256"),
);
export type ArtifactSha256 = Schema.Schema.Type<typeof ArtifactSha256Schema>;

export const ArtifactByteLengthSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("ArtifactByteLength"),
);
export type ArtifactByteLength = Schema.Schema.Type<
  typeof ArtifactByteLengthSchema
>;

/** A hash/length binding for one retained repository artifact. */
export const ArtifactAuthoritySchema = Schema.Struct({
  path: Schema.Trimmed.check(Schema.isNonEmpty()),
  byteLength: ArtifactByteLengthSchema,
  sha256: ArtifactSha256Schema,
});

export type ArtifactAuthority = Schema.Schema.Type<
  typeof ArtifactAuthoritySchema
>;
