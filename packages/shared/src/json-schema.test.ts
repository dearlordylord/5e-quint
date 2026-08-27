import { describe, expect, it } from "vitest";

import { stripNestedJsonSchemaIds } from "./json-schema.ts";

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
});
