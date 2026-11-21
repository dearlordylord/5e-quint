import { describe, expect, it } from "vitest";
import { Result, Schema } from "effect";

import {
  jsonSchemaDocument,
  jsonSchemaPattern,
  stripNestedJsonSchemaIds,
} from "./json-schema.ts";

describe("encoded JSON Schema publication", () => {
  it("closes objects and keeps numeric fields numeric", () => {
    const schema = Schema.Struct({ value: Schema.Finite });
    expect(jsonSchemaDocument(schema).schema).toEqual({
      type: "object",
      properties: { value: { type: "number" } },
      required: ["value"],
      additionalProperties: false,
    });
  });

  it("publishes portable patterns and rejects flags the document cannot preserve", () => {
    for (const pattern of [/^synthetic$/, /^synthetic$/u]) {
      const schema = Schema.String.check(jsonSchemaPattern(pattern));
      expect(
        Result.isSuccess(Schema.decodeUnknownResult(schema)("synthetic")),
      ).toBe(true);
      expect(jsonSchemaDocument(schema).schema).toMatchObject({
        type: "string",
        pattern: "^synthetic$",
      });
    }
    expect(() => jsonSchemaPattern(/^synthetic$/i)).toThrow(/flags/);
  });

  it("retains explicit schema identifiers through reference allocation", () => {
    const schema = Schema.String.annotate({ identifier: "SyntheticText" });
    const document = jsonSchemaDocument(schema);
    expect(document.schema).toEqual({ $ref: "#/$defs/SyntheticText" });
    expect(document.definitions).toEqual({ SyntheticText: { type: "string" } });
  });
});

describe("JSON Schema id projection", () => {
  it("strips nested schema ids without changing data property names or examples", () => {
    const schema = {
      $id: "urn:root",
      type: "object",
      properties: {
        $id: { $id: "urn:property", type: "string" },
        value: { $id: "urn:value", type: "number" },
      },
      $defs: {
        $id: { $id: "urn:definition", type: "boolean" },
      },
      examples: [{ $id: "example-data", value: 1 }],
    };

    expect(stripNestedJsonSchemaIds(schema)).toEqual({
      $id: "urn:root",
      type: "object",
      properties: {
        $id: { type: "string" },
        value: { type: "number" },
      },
      $defs: {
        $id: { type: "boolean" },
      },
      examples: [{ $id: "example-data", value: 1 }],
    });
  });

  it("can remove the root id for consumers that assign their own identity", () => {
    const schema = {
      $id: "urn:source",
      type: "object",
      properties: { value: { type: "string" } },
    };

    expect(stripNestedJsonSchemaIds(schema, { preserveRootId: false })).toEqual(
      {
        type: "object",
        properties: { value: { type: "string" } },
      },
    );
  });

  it("follows schema-valued array, map, and value keywords only", () => {
    const schema = {
      allOf: [{ $id: "urn:array-member", type: "string" }, "boolean-schema"],
      properties: "not-a-schema-map",
      items: { $id: "urn:item", type: "number" },
      additionalProperties: false,
      anyOf: "not-an-array",
      examples: [{ $id: "example-data" }],
    };

    expect(stripNestedJsonSchemaIds(schema)).toEqual({
      allOf: [{ type: "string" }, "boolean-schema"],
      properties: "not-a-schema-map",
      items: { type: "number" },
      additionalProperties: false,
      anyOf: "not-an-array",
      examples: [{ $id: "example-data" }],
    });
  });

  it("preserves primitive and array roots while stripping nested ids", () => {
    expect(
      stripNestedJsonSchemaIds([{ $id: "urn:first" }, null, "data"]),
    ).toEqual([{}, null, "data"]);
    expect(stripNestedJsonSchemaIds(null)).toBeNull();
    expect(stripNestedJsonSchemaIds("schema-data")).toBe("schema-data");
  });
});
