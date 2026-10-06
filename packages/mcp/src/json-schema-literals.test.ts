import { describe, expect, it } from "vitest";
import { simplifyLiteralSchemaConstraints } from "./json-schema-literals.ts";
import type { McpOutputSchema } from "./schema-codec.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";

describe("literal schema constraints", () => {
  it("preserves accepted and rejected values, including contradictory constraints", () => {
    const schemas: readonly McpOutputSchema[] = [
      { type: "string", enum: ["attack"] },
      { type: "boolean", enum: [false] },
      { type: "null", enum: [null] },
      { type: "number", enum: [2.5] },
      { type: "integer", enum: [2] },
      { type: "integer", enum: [2.5] },
      { type: "number", enum: ["attack"] },
      { type: "string", enum: ["attack"], const: "move" },
      { type: "string", enum: ["attack", "move"] },
      { type: "object", enum: [{ kind: "attack" }] },
      { type: "array", enum: [["attack"]] },
    ];
    const values = [
      "attack",
      "move",
      "",
      false,
      true,
      null,
      2,
      2.5,
      0,
      {},
      { kind: "attack" },
      { kind: "move" },
      [],
      ["attack"],
      ["move"],
    ];
    const provider = createDraft2020JsonSchemaValidator();
    for (const schema of schemas) {
      const validateOriginal = provider.getValidator(
        requireJsonSchema(schema, "original literal"),
      );
      const simplified = simplifyLiteralSchemaConstraints(schema);
      const validateSimplified = provider.getValidator(
        requireJsonSchema(simplified, "simplified literal"),
      );
      for (const value of values)
        expect(
          validateSimplified(value).valid,
          JSON.stringify({ schema, value }),
        ).toBe(validateOriginal(value).valid);
    }
    expect(
      simplifyLiteralSchemaConstraints({ type: "string", enum: ["attack"] }),
    ).toEqual({ const: "attack" });
    expect(
      simplifyLiteralSchemaConstraints({ type: "integer", enum: [2.5] }),
    ).toEqual({ type: "integer", const: 2.5 });
  });

  it("preserves literal data, annotations, tuples, closed objects and reference scopes", () => {
    const data = { type: "string", enum: ["literal-data"] };
    const source = {
      $id: "urn:synthetic:literal-schema",
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["attack"],
          description: "Select the attack operation.",
        },
        data: { const: data, examples: [data] },
        tuple: {
          type: "array",
          prefixItems: [{ $ref: "#/$defs/decision" }],
          minItems: 1,
          maxItems: 1,
        },
      },
      required: ["kind", "data", "tuple"],
      additionalProperties: false,
      $defs: { decision: { type: "boolean", enum: [false] } },
    };
    const simplified = simplifyLiteralSchemaConstraints(source);
    expect(simplified).toEqual({
      ...source,
      properties: {
        ...source.properties,
        kind: { const: "attack", description: "Select the attack operation." },
      },
      $defs: { decision: { const: false } },
    });
    const originalValidator = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(source, "original tuple"),
    );
    const simplifiedValidator =
      createDraft2020JsonSchemaValidator().getValidator(
        requireJsonSchema(simplified, "simplified tuple"),
      );
    for (const value of [
      { kind: "attack", data, tuple: [false] },
      { kind: "attack", data, tuple: [true] },
      { kind: "attack", data, tuple: [] },
      { kind: "attack", data, tuple: [false, false] },
      { kind: "move", data, tuple: [false] },
      { kind: "attack", data, tuple: [false], extra: true },
    ])
      expect(simplifiedValidator(value).valid).toBe(
        originalValidator(value).valid,
      );
  });

  it("preserves empty enums and contradictory or nonprimitive type constraints", () => {
    for (const schema of [
      { type: "string", enum: [] },
      { type: "number", const: "attack" },
      { type: "integer", const: 2.5 },
      { type: "object", const: { kind: "attack" } },
      { type: "string", const: null },
    ])
      expect(simplifyLiteralSchemaConstraints(schema)).toEqual(schema);
  });

  it("retains schemas when a reference can address a removed enum location", () => {
    const source = {
      type: "object",
      properties: { rejected: { $ref: "#/$defs/decision/enum/0" } },
      additionalProperties: false,
      $defs: { decision: { type: "boolean", enum: [false] } },
    };
    const simplified = simplifyLiteralSchemaConstraints(source);
    expect(simplified).toBe(source);
    const original = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(source, "enum reference"),
    );
    const after = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(simplified, "preserved enum reference"),
    );
    expect(original({}).valid).toBe(true);
    expect(after({}).valid).toBe(true);
    expect(original({ rejected: false }).valid).toBe(false);
    expect(after({ rejected: false }).valid).toBe(false);
    for (const reference of [
      { $ref: "https://example.test/decision#/$defs/choice", enum: [false] },
      { $ref: "#/$defs/choice%2Fenum%2F0", enum: [false] },
      { $dynamicRef: "#decision", $dynamicAnchor: "decision", enum: [false] },
    ])
      expect(simplifyLiteralSchemaConstraints(reference)).toBe(reference);
    for (const keyword of [
      "contentSchema",
      "unevaluatedItems",
      "unevaluatedProperties",
    ]) {
      const nestedReference = {
        [keyword]: { $ref: "#/$defs/decision/enum/0" },
        $defs: { decision: { type: "boolean", enum: [false] } },
      };
      expect(simplifyLiteralSchemaConstraints(nestedReference)).toBe(
        nestedReference,
      );
    }
  });
});
