import { Schema } from "effect";

// EXPLANATION: the surface models absence as an omitted property, not as
// `property: undefined`. Keep optional object fields exact across the schema.
export const exactOptional = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Schema.optionalWith(schema, { exact: true });

// EXPLANATION: shared shorthand for closed non-empty arrays in the handwritten
// surface codec. Keeps the spell/non-spell files from owning private wrappers.
export const nonEmpty = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Schema.NonEmptyArray(schema);
