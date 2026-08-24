import fc from "fast-check";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  mcpObjectJsonSchema,
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
