import fc from "fast-check";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { MODEL_OUTPUT_SCHEMA_MAX_DEPTH } from "./model-output-json-schema.ts";
import {
  canonicalMcpOutputSchema,
  decodeToolArgs,
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
  test("decodes the same encoded representation advertised for transformed inputs", () => {
    const codec = Schema.Struct({ count: Schema.NumberFromString });

    expect(mcpObjectJsonSchema(codec)).toMatchObject({
      properties: { count: { type: "string" } },
    });
    expect(decodeToolArgs(codec, { count: "12" }, "transform_test")).toEqual(
      Result.succeed({ count: 12 }),
    );
    expect(
      Result.isFailure(decodeToolArgs(codec, { count: 12 }, "transform_test")),
    ).toBe(true);
  });

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

  test("preserves data properties named $id while assigning the MCP identity", () => {
    const codec = Schema.Struct({
      $id: Schema.String,
      value: Schema.String,
    }).annotate({ jsonSchema: { $id: "urn:source-schema" } });

    const advertised = mcpOutputJsonSchema(codec);

    expect(advertised.$id).toMatch(
      /^urn:dnd:mcp:output-schema:sha256:[a-f0-9]{64}$/,
    );
    expect(advertised.$id).not.toBe("urn:source-schema");
    expect(advertised).toMatchObject({
      properties: { $id: { type: "string" }, value: { type: "string" } },
      required: ["$id", "value"],
    });
  });

  test("extracts an object branch and rejects schemas with no object input", () => {
    expect(
      mcpObjectJsonSchema(
        Schema.Union([Schema.String, Schema.Struct({ value: Schema.String })]),
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
      kind: Schema.Literals(["first", "second"]),
      nested: Schema.Struct({ value: Schema.String }),
    }).annotate({ identifier: "Copied" });
    const RetainedLeaf = Schema.String.annotate({
      identifier: "RetainedLeaf",
    });
    const Retained = Schema.Struct({ leaf: RetainedLeaf }).annotate({
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
    const Nested = Schema.Struct({ hidden: Schema.String }).annotate({
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
    const codec = Schema.Union([
      Schema.Struct({ value: Schema.Struct({ first: Schema.String }) }),
      Schema.Struct({ value: Schema.Struct({ second: Schema.Finite }) }),
      Schema.Struct({ error: Schema.String }),
    ]);

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

  test("keys bounded projections by their depth without widening the default", () => {
    const codec = Schema.Struct({
      envelope: Schema.Struct({
        frontier: Schema.Struct({
          acts: Schema.Array(
            Schema.Struct({
              subject: Schema.String,
              initialHoles: Schema.Array(Schema.String),
            }),
          ),
        }),
      }),
    });

    const defaultProjection = mcpModelOutputJsonSchema(codec);
    const battleProjection = mcpModelOutputJsonSchema(codec, {
      maxDepth: MODEL_OUTPUT_SCHEMA_MAX_DEPTH,
    });

    expect(defaultProjection).toMatchObject({
      properties: {
        envelope: {
          properties: {
            frontier: {
              properties: {
                acts: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
    });
    expect(battleProjection).toMatchObject({
      properties: {
        envelope: {
          properties: {
            frontier: {
              properties: {
                acts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      subject: { type: "string" },
                      initialHoles: { type: "array" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(defaultProjection).not.toHaveProperty(
      "properties.envelope.properties.frontier.properties.acts.items.properties",
    );
    expect(canonicalMcpOutputSchema(defaultProjection)).toMatchObject({
      properties: {
        envelope: {
          properties: {
            frontier: {
              properties: {
                acts: {
                  items: {
                    properties: {
                      initialHoles: { items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(battleProjection).not.toBe(defaultProjection);
    expect(mcpModelOutputJsonSchema(codec)).toBe(defaultProjection);
    expect(
      mcpModelOutputJsonSchema(codec, {
        maxDepth: MODEL_OUTPUT_SCHEMA_MAX_DEPTH,
      }),
    ).toBe(battleProjection);
  });
});

describe("shared anonymous MCP codec graphs", () => {
  test("extracts repeated composites before expanding a deep binary schema graph", () => {
    const leaf = Schema.Struct({ value: Schema.String });
    let tree: Schema.Codec<unknown, unknown, never> = leaf;
    for (let depth = 0; depth < 18; depth += 1) {
      tree = Schema.Struct({ left: tree, right: tree });
    }
    const advertised = mcpOutputJsonSchema(tree);
    expect(JSON.stringify(advertised).length).toBeLessThan(12_000);
    expect(advertised.$defs).toBeDefined();
    expect(mcpOutputJsonSchema(tree)).toBe(advertised);
  });

  test("shared references preserve full validation constraints and declared identifier requests", async () => {
    const { createDraft2020JsonSchemaValidator, requireJsonSchema } =
      await import("../test-support/json-schema.ts");
    const branch = Schema.Struct({
      value: Schema.String.check(Schema.isMinLength(2)),
    });
    const named = Schema.Struct({ count: Schema.Int }).annotate({
      identifier: "DeclaredLeaf",
    });
    const codec = Schema.Struct({ left: branch, right: branch, named });
    const advertised = mcpOutputJsonSchema(codec);
    const baseline = Schema.toStandardJSONSchemaV1(codec)[
      "~standard"
    ].jsonSchema.input({ target: "draft-2020-12" });
    const ajv = createDraft2020JsonSchemaValidator();
    const validate = ajv.getValidator(
      requireJsonSchema(advertised, "shared codec"),
    );
    const original = ajv.getValidator(
      requireJsonSchema(baseline, "original codec"),
    );
    for (const value of [
      { left: { value: "yes" }, right: { value: "ok" }, named: { count: 2 } },
      { left: { value: "x" }, right: { value: "ok" }, named: { count: 2 } },
      {
        left: { value: "yes", extra: true },
        right: { value: "ok" },
        named: { count: 2 },
      },
      { left: { value: "yes" }, right: { value: "ok" }, named: { count: 2.5 } },
    ])
      expect(validate(value).valid).toBe(original(value).valid);
    expect(advertised.$defs).toHaveProperty("DeclaredLeaf");
  });
  test("disambiguates a declared name that collides with an anonymous alias", async () => {
    const { createDraft2020JsonSchemaValidator, requireJsonSchema } =
      await import("../test-support/json-schema.ts");
    const shared = Schema.Struct({ value: Schema.String });
    const named = Schema.Struct({ count: Schema.Int }).annotate({
      identifier: "McpShared",
    });
    const advertised = mcpOutputJsonSchema(
      Schema.Struct({ left: shared, right: shared, named }),
    );
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(advertised, "colliding definitions"),
    );
    expect(
      validate({
        left: { value: "a" },
        right: { value: "b" },
        named: { count: 1 },
      }).valid,
    ).toBe(true);
    expect(
      validate({
        left: { count: 1 },
        right: { value: "b" },
        named: { value: "wrong" },
      }).valid,
    ).toBe(false);
  });
});
