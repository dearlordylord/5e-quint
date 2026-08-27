// Compile-only schema contract probe. This file is intentionally not named
// *.test.ts; run it through typecheck:spell-procedure-execution-schema.
import { Context, Effect, Schema, SchemaGetter } from "effect";
import { spellProcedureExecutionSchema } from "./battle-reducer/spell-procedure-profiles/execution-profile.ts";

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;
type Assert<Value extends true> = Value;

interface ProbeService {
  readonly value: number;
}

const ProbeService = Context.Service<ProbeService>(
  "battle-runtime spell procedure schema probe",
);

const contextfulSchema = Schema.String.pipe(
  Schema.decode({
    decode: SchemaGetter.checkEffect<string, ProbeService>(() =>
      Effect.map(Effect.service(ProbeService), () => undefined),
    ),
    encode: SchemaGetter.passthrough(),
  }),
);

type ContextfulDecodingServices = Schema.Codec.DecodingServices<
  typeof contextfulSchema
>;
type _ContextfulServiceIsRetained = Assert<
  Equal<ContextfulDecodingServices, ProbeService>
>;
const contextfulServiceTypeCheck: _ContextfulServiceIsRetained = true;
void contextfulServiceTypeCheck;

const transformedSchema = spellProcedureExecutionSchema(
  Schema.NumberFromString,
);
void transformedSchema;
type TransformedDecoded = Schema.Schema.Type<typeof transformedSchema>;
type TransformedEncoded = Schema.Codec.Encoded<typeof transformedSchema>;
const decodedValue: TransformedDecoded = 42;
const encodedValue: TransformedEncoded = "42";
void decodedValue;
void encodedValue;

// @ts-expect-error NumberFromString decodes to a number, not a string.
const invalidDecoded: TransformedDecoded = "42";
// @ts-expect-error NumberFromString encodes from a number to a string.
const invalidEncoded: TransformedEncoded = 42;
void invalidDecoded;
void invalidEncoded;

// @ts-expect-error The execution boundary must not erase its decoded type to any.
spellProcedureExecutionSchema(Schema.Any);
// @ts-expect-error Execution schemas are property-only and cannot require services.
spellProcedureExecutionSchema(contextfulSchema);
