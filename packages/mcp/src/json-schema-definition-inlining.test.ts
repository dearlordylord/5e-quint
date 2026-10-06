import { describe, expect, it } from "vitest";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";
import { inlineCostlySchemaDefinitions } from "./json-schema-definition-inlining.ts";

const identifier = {
  type: "string",
  minLength: 3,
  pattern: "^[a-z]+$",
} as const;

describe("schema definition inlining", () => {
  it("reduces reference overhead while preserving tuple and literal constraints", () => {
    const source = {
      type: "object",
      properties: {
        tuple: { $ref: "#/$defs/tuple~1value" },
        literal: { const: { $ref: "#/$defs/identifier" } },
        flag: { $ref: "#/$defs/flag" },
        otherFlag: { $ref: "#/$defs/flag" },
      },
      required: ["tuple", "literal", "flag", "otherFlag"],
      additionalProperties: false,
      $defs: {
        "tuple/value": {
          type: "array",
          prefixItems: [
            { $ref: "#/$defs/identifier" },
            { type: "integer", minimum: 0 },
          ],
          minItems: 2,
          items: false,
        },
        identifier,
        flag: { type: "boolean" },
      },
    } as const;
    const transformed = inlineCostlySchemaDefinitions(source);
    expect(JSON.stringify(transformed).length).toBeLessThan(
      JSON.stringify(source).length,
    );
    expect(inlineCostlySchemaDefinitions(transformed)).toEqual(transformed);
    const validator = createDraft2020JsonSchemaValidator();
    const before = validator.getValidator(requireJsonSchema(source, "source"));
    const after = validator.getValidator(
      requireJsonSchema(transformed, "inlined"),
    );
    const valid = {
      tuple: ["actor", 1],
      literal: { $ref: "#/$defs/identifier" },
      flag: true,
      otherFlag: false,
    };
    expect(after(valid).valid).toBe(true);
    for (const input of [
      valid,
      { ...valid, tuple: ["ab", 1] },
      { ...valid, tuple: ["Actor", 1] },
      { ...valid, tuple: ["actor", -1] },
      { ...valid, tuple: ["actor"] },
      { ...valid, tuple: ["actor", 1, 2] },
      { ...valid, flag: 1 },
      { ...valid, literal: { $ref: "#/$defs/flag" } },
      { ...valid, extra: true },
    ])
      expect(after(input).valid).toBe(before(input).valid);
  });

  it("retains definitions used through suffixes, siblings and recursive references", () => {
    const source = {
      type: "object",
      properties: {
        suffix: { $ref: "#/$defs/container/properties/value" },
        sibling: { $ref: "#/$defs/bound", maxLength: 4 },
        recursive: { $ref: "#/$defs/recursive" },
      },
      $defs: {
        container: { type: "object", properties: { value: identifier } },
        bound: identifier,
        recursive: { type: "array", items: { $ref: "#/$defs/recursive" } },
      },
    } as const;
    expect(inlineCostlySchemaDefinitions(source)).toBe(source);
  });

  it("retains URI references whose target cannot be proved from a local pointer", () => {
    for (const reference of [
      "#/$defs/%66lag",
      "https://example.test/schema#/$defs/flag",
      "#/properties/flag",
    ]) {
      const source = {
        $id: "https://example.test/schema",
        properties: {
          flag: { $ref: "#/$defs/flag" },
          other: { $ref: reference },
        },
        $defs: { flag: { type: "boolean" } },
      };
      expect(inlineCostlySchemaDefinitions(source)).toBe(source);
    }
  });

  it("preserves schema resources and dynamic reference scopes", () => {
    for (const resource of [
      { $id: "https://example.test/child", type: "string" },
      { $anchor: "value", type: "string" },
      { $dynamicAnchor: "value", type: "string" },
      { $dynamicRef: "#value" },
      { $defs: { nested: identifier }, type: "string" },
    ]) {
      const source = {
        properties: { value: { $ref: "#/$defs/value" } },
        $defs: { value: resource },
      };
      expect(inlineCostlySchemaDefinitions(source)).toBe(source);
    }
  });
});
