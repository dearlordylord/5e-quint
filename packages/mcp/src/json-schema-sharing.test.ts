import { describe, expect, it } from "vitest";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";
import {
  shareRepeatedSchemas,
  shareToolSchemaDefinitions,
} from "./json-schema-sharing.ts";

const position = {
  type: "object",
  properties: {
    coordinateId: { type: "string", minLength: 3 },
    x: { type: "integer", minimum: 0 },
    y: { type: "integer", minimum: 0 },
  },
  required: ["coordinateId", "x", "y"],
  additionalProperties: false,
} as const;
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    origin: position,
    target: position,
    route: { type: "array", items: position },
    selected: { $ref: "#/$defs/position~1selection" },
    waypoints: {
      type: "array",
      prefixItems: [{ $ref: "#/$defs/position~1selection" }, position],
      minItems: 2,
      maxItems: 2,
      items: false,
    },
    literal: { const: { $ref: "#/$defs/position~1selection" } },
  },
  $defs: { "position/selection": position },
  required: ["origin", "target", "route", "selected", "waypoints", "literal"],
  additionalProperties: false,
} as const;

describe("tool input schema definition sharing", () => {
  it("preserves validation through nested, escaped and repeated references", () => {
    const validator = createDraft2020JsonSchemaValidator();
    const before = validator.getValidator(
      requireJsonSchema(schema, "source schema"),
    );
    const after = validator.getValidator(
      requireJsonSchema(shareToolSchemaDefinitions(schema), "shared schema"),
    );
    const point = { coordinateId: "synthetic-position", x: 1, y: 2 };
    const input = {
      origin: point,
      target: point,
      route: [point],
      selected: point,
      waypoints: [point, point],
      literal: { $ref: "#/$defs/position~1selection" },
    };
    expect(before(input).valid).toBe(true);
    expect(after(input).valid).toBe(true);
    for (const invalid of [
      { ...input, origin: { ...point, x: -1 } },
      { ...input, target: { ...point, extra: 1 } },
      { ...input, route: [{ ...point, coordinateId: "x" }] },
      { ...input, selected: { ...point, y: 1.5 } },
      { ...input, waypoints: [{ ...point, x: -1 }, point] },
      { ...input, waypoints: [point, { ...point, y: 1.5 }] },
      { ...input, waypoints: [point] },
      { ...input, waypoints: [point, point, point] },
      { ...input, literal: { $ref: "#/$defs/d0" } },
    ]) {
      expect(before(invalid).valid).toBe(false);
      expect(after(invalid).valid).toBe(false);
    }
  });

  it("shares repeated primitive constraints without weakening them", () => {
    const identifier = {
      type: "string",
      minLength: 3,
      maxLength: 8,
      pattern: "^[a-z]+$",
    } as const;
    const source = {
      type: "object",
      properties: {
        actor: identifier,
        target: identifier,
        witness: identifier,
      },
      required: ["actor", "target", "witness"],
      additionalProperties: false,
    } as const;
    const shared = shareToolSchemaDefinitions(source);
    expect(JSON.stringify(shared).length).toBeLessThan(
      JSON.stringify(source).length,
    );
    const validator = createDraft2020JsonSchemaValidator();
    const before = validator.getValidator(
      requireJsonSchema(source, "identifiers"),
    );
    const after = validator.getValidator(
      requireJsonSchema(shared, "shared identifiers"),
    );
    const valid = { actor: "actor", target: "target", witness: "witness" };
    expect(before(valid).valid).toBe(true);
    expect(after(valid).valid).toBe(true);
    for (const field of ["actor", "target", "witness"]) {
      for (const value of ["ab", "excessivelength", "Bad", 3, null]) {
        const input = { ...valid, [field]: value };
        expect(before(input).valid).toBe(false);
        expect(after(input).valid).toBe(false);
      }
    }
  });

  it("reduces serialized bytes deterministically without changing the default sharing cache", () => {
    const outputSharing = shareRepeatedSchemas(schema);
    const inputSharing = shareToolSchemaDefinitions(schema);
    expect(JSON.stringify(inputSharing).length).toBeLessThan(
      JSON.stringify(schema).length,
    );
    expect(shareToolSchemaDefinitions(schema)).toEqual(inputSharing);
    expect(shareRepeatedSchemas(schema)).toBe(outputSharing);
  });
});
