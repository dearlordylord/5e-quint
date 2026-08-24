import fc from "fast-check";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  mcpObjectJsonSchema,
  mcpObjectJsonSchemaWithCopiedObjects,
  mcpModelOutputJsonSchema,
  mcpOutputJsonSchema,
  omitRedundantImpossibleProperties,
} from "./schema-codec.ts";

const schemaPropertyName = fc.stringMatching(/^[a-z][a-z0-9]{0,7}$/);
const schemaProperties = fc.uniqueArray(
  fc.record({
    name: schemaPropertyName,
    impossible: fc.boolean(),
    required: fc.boolean(),
  }),
  { selector: ({ name }) => name, maxLength: 12 },
);

describe("MCP output JSON Schema identity", () => {
  test("reuses one generated schema per Effect Schema codec", () => {
    const codec = Schema.Struct({ value: Schema.String });

    expect(mcpOutputJsonSchema(codec)).toBe(mcpOutputJsonSchema(codec));
  });

  test("derives stable content identities that distinguish schema shapes", () => {
    const first = mcpOutputJsonSchema(Schema.Struct({ value: Schema.String }));
    const equivalent = mcpOutputJsonSchema(
      Schema.Struct({ value: Schema.String }),
    );
    const different = mcpOutputJsonSchema(
      Schema.Struct({ value: Schema.Number }),
    );

    expect(first.$id).toMatch(
      /^urn:dnd:mcp:output-schema:sha256:[a-f0-9]{64}$/,
    );
    expect(equivalent.$id).toBe(first.$id);
    expect(different.$id).not.toBe(first.$id);
  });

  test("extracts an object branch and rejects schemas with no object input", () => {
    expect(
      mcpObjectJsonSchema(
        Schema.Union(Schema.String, Schema.Struct({ value: Schema.String })),
      ),
    ).toMatchObject({
      type: "object",
      properties: { value: expect.anything() },
    });
    expect(() => mcpObjectJsonSchema(Schema.String)).toThrow(
      "Effect JSON schema must generate an MCP object input schema.",
    );
  });

  test("advertises copied result objects without expanding their canonical schema", () => {
    const Copied = Schema.Struct({
      kind: Schema.Literal("first", "second"),
      nested: Schema.Struct({ value: Schema.String }),
    }).annotations({ identifier: "Copied" });
    const RetainedLeaf = Schema.String.annotations({
      identifier: "RetainedLeaf",
    });
    const Retained = Schema.Struct({ leaf: RetainedLeaf }).annotations({
      identifier: "Retained",
    });
    const CanonicalArgs = Schema.Struct({
      copied: Copied,
      direct: Retained,
    });

    const advertised = mcpObjectJsonSchemaWithCopiedObjects(CanonicalArgs, {
      copied: "Copy this object from discovery.",
    });

    expect(advertised).toMatchObject({
      properties: {
        copied: {
          type: "object",
          description: "Copy this object from discovery.",
        },
        direct: { $ref: "#/$defs/Retained" },
      },
      $defs: {
        Retained: expect.anything(),
        RetainedLeaf: { type: "string" },
      },
    });
    expect(JSON.stringify(advertised)).not.toContain("nested");
    expect(JSON.stringify(advertised)).not.toContain("Copied");
  });

  test("rejects a copied-object projection that names no generated property", () => {
    expect(() =>
      mcpObjectJsonSchemaWithCopiedObjects(
        Schema.Struct({ present: Schema.String }),
        { absent: "Not a real argument." },
      ),
    ).toThrowError(
      "Copied MCP object properties are absent from the generated schema: absent",
    );
  });

  test("removes only redundant impossible properties from closed objects", () => {
    fc.assert(
      fc.property(schemaProperties, (generatedProperties) => {
        const properties = Object.fromEntries(
          generatedProperties.map(({ name, impossible }) => [
            name,
            impossible
              ? { not: {}, title: "never" }
              : { type: "string", description: name },
          ]),
        );
        const required = generatedProperties
          .filter(({ required }) => required)
          .map(({ name }) => name);
        const schema = {
          type: "object",
          properties,
          required,
          additionalProperties: false,
        } as const;

        const normalized = omitRedundantImpossibleProperties(schema);
        const normalizedProperties = normalized.properties;
        if (
          typeof normalizedProperties !== "object" ||
          normalizedProperties === null ||
          Array.isArray(normalizedProperties)
        ) {
          throw new Error("normalized object schema must retain properties");
        }
        const expectedPropertyNames = generatedProperties
          .filter(({ impossible, required }) => !impossible || required)
          .map(({ name }) => name)
          .sort();

        expect(Object.keys(normalizedProperties).sort()).toEqual(
          expectedPropertyNames,
        );
        expect(omitRedundantImpossibleProperties(normalized)).toEqual(
          normalized,
        );
      }),
    );
  });
});

describe("MCP model output JSON Schema", () => {
  test("retains the root result contract without expanding nested definitions", () => {
    const Nested = Schema.Struct({ hidden: Schema.String }).annotations({
      identifier: "NestedResult",
    });
    const codec = Schema.Struct({
      result: Nested,
      outcomes: Schema.Array(Nested),
      note: Schema.NullOr(Schema.String),
    });

    const advertised = mcpModelOutputJsonSchema(codec);

    expect(advertised).toMatchObject({
      type: "object",
      properties: {
        result: { type: "object" },
        outcomes: { type: "array" },
        note: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      required: ["result", "outcomes", "note"],
      additionalProperties: false,
    });
    expect(JSON.stringify(advertised)).not.toContain("$defs");
  });

  test("retains distinct root and nested object branches within the bound", () => {
    const codec = Schema.Union(
      Schema.Struct({ value: Schema.Struct({ first: Schema.String }) }),
      Schema.Struct({ value: Schema.Struct({ second: Schema.Number }) }),
      Schema.Struct({ error: Schema.String }),
    );

    expect(mcpModelOutputJsonSchema(codec)).toMatchObject({
      anyOf: [
        {
          type: "object",
          properties: {
            value: {
              type: "object",
              properties: { first: { type: "string" } },
            },
          },
          required: ["value"],
        },
        {
          type: "object",
          properties: {
            value: {
              type: "object",
              properties: { second: { type: "number" } },
            },
          },
          required: ["value"],
        },
        {
          type: "object",
          properties: { error: { type: "string" } },
          required: ["error"],
        },
      ],
    });
  });
});
