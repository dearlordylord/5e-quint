import { describe, expect, it } from "vitest";
import { factorObjectUnionConstraints } from "./json-schema-object-unions.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";
const owner = {
  type: "string",
  minLength: 3,
  maxLength: 12,
  pattern: "^[a-z]+$",
};
const schema = {
  anyOf: Array.from({ length: 8 }, (_, index) => ({
    type: "object",
    properties: {
      kind: { const: `branch${index}` },
      owner,
      value: { type: "integer", minimum: index },
      [`optional${index}`]: { type: "boolean" },
    },
    required: ["kind", "owner", "value"],
    additionalProperties: false,
  })),
};
describe("object union constraint factoring", () => {
  it("preserves required fields, value correlation and branch-specific closed properties", () => {
    const factored = factorObjectUnionConstraints(schema);
    expect(JSON.stringify(factored).length).toBeLessThan(
      JSON.stringify(schema).length,
    );
    const before = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(schema, "source"),
    );
    const after = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(factored, "factored"),
    );
    expect(before({ kind: "branch0", owner: "actor", value: 0 }).valid).toBe(
      true,
    );
    expect(after({ kind: "branch0", owner: "actor", value: 0 }).valid).toBe(
      true,
    );
    const inputs = Array.from({ length: 8 }, (_, index) => [
      { kind: `branch${index}`, owner: "actor", value: index },
      {
        kind: `branch${index}`,
        owner: "actor",
        value: index,
        [`optional${index}`]: true,
      },
      {
        kind: `branch${index}`,
        owner: "actor",
        value: index,
        [`optional${(index + 1) % 8}`]: true,
      },
      { kind: `branch${index}`, owner: "actor", value: index - 1 },
      { kind: `branch${index}`, owner: "X", value: index },
      { kind: `branch${index}`, value: index },
      { kind: `branch${index}`, owner: "actor", value: "invalid" },
      { kind: `branch${index}`, owner: "actor", value: index, extra: true },
    ]).flat();
    for (const input of [null, [], 3, true, {}, ...inputs])
      expect(after(input).valid).toBe(before(input).valid);
  });
  it("preserves open branches, other constraints and literal instance data", () => {
    for (const source of [
      { ...schema, description: "Synthetic union" },
      {
        anyOf: schema.anyOf.map((branch) => ({
          ...branch,
          additionalProperties: true,
        })),
      },
      { oneOf: schema.anyOf },
      { const: schema },
      { examples: [schema] },
    ])
      expect(factorObjectUnionConstraints(source)).toEqual(source);
  });
});
