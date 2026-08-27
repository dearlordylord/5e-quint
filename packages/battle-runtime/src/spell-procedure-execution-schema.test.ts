import { Context, Effect, Schema, SchemaGetter } from "effect";
import { spellProcedureExecutionSchema } from "./battle-reducer/spell-procedure-profiles/execution-profile.ts";
import { describe, expect, test } from "vitest";

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

describe("spell procedure execution schema constraint", () => {
  test("preserves transformed encoded and decoded views", () => {
    const schema = spellProcedureExecutionSchema(Schema.NumberFromString);

    const decoded: Schema.Schema.Type<typeof schema> =
      Schema.decodeSync(schema)("42");
    const encoded: Schema.Codec.Encoded<typeof schema> =
      Schema.encodeSync(schema)(decoded);

    expect(decoded).toBe(42);
    expect(encoded).toBe("42");

    // @ts-expect-error NumberFromString decodes to a number, not a string.
    const invalidDecoded: Schema.Schema.Type<typeof schema> = "42";
    // @ts-expect-error NumberFromString encodes from a number to a string.
    const invalidEncoded: Schema.Codec.Encoded<typeof schema> = 42;
    expect(invalidDecoded).toBe("42");
    expect(invalidEncoded).toBe(42);
  });

  test("rejects an any schema at compile time", () => {
    // @ts-expect-error The execution boundary must not erase its decoded type to any.
    spellProcedureExecutionSchema(Schema.Any);
  });

  test("rejects codecs that require decoding services at compile time", () => {
    // @ts-expect-error Execution schemas are property-only and cannot require services.
    spellProcedureExecutionSchema(contextfulSchema);
  });
});
