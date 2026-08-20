import { Schema } from "effect";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));

/** A hash/length binding for one retained repository artifact. */
export const ArtifactAuthoritySchema = Schema.Struct({
  path: Schema.NonEmptyTrimmedString,
  byteLength: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  sha256: HashSchema,
});

export type ArtifactAuthority = Schema.Schema.Type<
  typeof ArtifactAuthoritySchema
>;
