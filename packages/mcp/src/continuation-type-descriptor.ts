import { Schema } from "effect";

const Index = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
);
const BaseDescriptor = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("literal"),
    value: Schema.Union([
      Schema.String,
      Schema.Number,
      Schema.Boolean,
      Schema.Null,
    ]),
  }),
  Schema.Struct({
    kind: Schema.Literals([
      "undefined",
      "never",
      "string",
      "number",
      "bigint",
      "none",
    ]),
  }),
  Schema.Struct({ kind: Schema.Literal("union"), types: Schema.Array(Index) }),
  Schema.Struct({
    kind: Schema.Literals(["array", "set", "some"]),
    value: Index,
  }),
  Schema.Struct({ kind: Schema.Literal("map"), key: Index, value: Index }),
  Schema.Struct({
    kind: Schema.Literal("tuple"),
    elements: Schema.Array(Index),
    flags: Schema.Array(Index),
  }),
  Schema.Struct({
    kind: Schema.Literal("object"),
    fields: Schema.Record(
      Schema.String,
      Schema.Struct({ type: Index, optional: Schema.Boolean }),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("template"),
    texts: Schema.Array(Schema.String),
    types: Schema.Array(Index),
  }),
  Schema.Struct({ kind: Schema.Literal("schema"), refinement: Index }),
]);
const Descriptor = Schema.Union([
  BaseDescriptor,
  Schema.Struct({
    kind: Schema.Literal("refined"),
    type: BaseDescriptor,
    refinement: Index,
  }),
]);
export type ContinuationTypeDescriptor = typeof Descriptor.Type;

export const parseContinuationDescriptors = Schema.decodeUnknownSync(
  Schema.Array(Descriptor),
  { onExcessProperty: "error" },
);

export function schemaPredicate(
  schema: Schema.Top,
): (value: unknown) => boolean {
  return Schema.is(schema);
}
