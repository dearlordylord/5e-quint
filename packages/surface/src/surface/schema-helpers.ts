import { Schema } from "effect";

// EXPLANATION: the surface models absence as an omitted property, not as
// `property: undefined`. Keep optional object fields exact across the schema.
export const exactOptional = <S extends Schema.Constraint>(schema: S) =>
  Schema.optionalKey(schema);

export const strictStruct = <Fields extends Schema.Struct.Fields>(
  fields: Fields,
) =>
  Schema.Struct(fields).pipe(
    Schema.annotate({
      parseOptions: { onExcessProperty: "error" },
    }),
  );

export const ForbiddenValueSchema = Schema.Never.pipe(
  Schema.annotate({
    identifier: "ForbiddenValue",
  }),
);

// EXPLANATION: shared shorthand for closed non-empty arrays in the handwritten
// surface codec. Keeps the spell/non-spell files from owning private wrappers.
export const nonEmpty = <S extends Schema.Constraint>(schema: S) =>
  Schema.NonEmptyArray(schema);
