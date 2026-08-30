import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  schemaJsonContent,
} from "./schema-codec.ts";

const InputSchema = Schema.Struct({
  name: Schema.String,
  count: Schema.Number,
});

describe("schema-codec Effect 4 boundary", () => {
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
    expect(decoded.failure.content[0]?.text).toContain(
      '"error": "demo expects valid arguments."',
    );
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
