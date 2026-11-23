import { JsonSerializableObjectSchema } from "./tool-content.ts";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  mcpOutputJsonSchema,
  schemaJsonContent,
} from "./schema-codec.ts";

const InputSchema = Schema.Struct({
  name: Schema.String,
  count: Schema.Number,
});

describe("schema-codec boundary", () => {
  test("serializes opaque runtime records without publishing undefined fields", () => {
    const codec = Schema.Struct({ character: JsonSerializableObjectSchema });
    const content = schemaJsonContent(codec, {
      character: {
        characterId: "synthetic-character",
        bookOfShadowsPresence: undefined,
        session: { retained: true, absent: undefined },
      },
    });
    expect(content.structuredContent).toEqual({
      character: {
        characterId: "synthetic-character",
        session: { retained: true },
      },
    });
  });

  test("projects an object codec through the standard JSON Schema output", () => {
    expect(mcpObjectJsonSchema(InputSchema)).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        count: { anyOf: expect.arrayContaining([{ type: "number" }]) },
      },
      additionalProperties: false,
    });
  });

  test("maps malformed tool arguments to typed Result failure", () => {
    const decoded = decodeToolArgs(
      InputSchema,
      { count: "not-a-number" },
      "demo",
    );

    expect(Result.isFailure(decoded)).toBe(true);
    if (Result.isSuccess(decoded)) return;
    expect(decoded.failure.isError).toBe(true);
    expect(
      JSON.parse(decoded.failure.content[0]?.text ?? "null"),
    ).toMatchObject({
      error: "demo expects valid arguments.",
    });
  });

  test("preserves nonfinite diagnostics through the advertised JSON codec", async () => {
    const { createDraft2020JsonSchemaValidator, requireJsonSchema } =
      await import("../test-support/json-schema.ts");
    const schema = Schema.Struct({ costGp: Schema.Number });
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(mcpOutputJsonSchema(schema), "diagnostic output"),
    );
    for (const [value, encoded] of [
      [NaN, "NaN"],
      [Infinity, "Infinity"],
      [-Infinity, "-Infinity"],
      [12.5, 12.5],
    ] as const) {
      const content = schemaJsonContent(schema, { costGp: value });
      expect(content.structuredContent).toEqual({ costGp: encoded });
      expect(validate(content.structuredContent).valid).toBe(true);
      expect(
        decodeToolArgs(schema, content.structuredContent, "diagnostic"),
      ).toEqual(Result.succeed({ costGp: value }));
    }
  });

  test("encodes transformation-bearing values through the original schema", () => {
    const transformed = Schema.Struct({
      payload: Schema.fromJsonString(Schema.Struct({ answer: Schema.Number })),
    });
    const value = { payload: { answer: 42 } };
    const content = schemaJsonContent(transformed, value);

    expect(content.structuredContent).toEqual(
      Schema.encodeSync(transformed)(value),
    );
    expect(content.structuredContent).toEqual({ payload: '{"answer":42}' });
  });
});
