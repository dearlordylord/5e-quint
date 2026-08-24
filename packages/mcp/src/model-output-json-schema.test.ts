import { describe, expect, test } from "vitest";

import { projectModelOutputJsonSchema } from "./model-output-json-schema.ts";

describe("model output JSON Schema projection", () => {
  test("projects references, literals, arrays, and scalar unions", () => {
    expect(
      projectModelOutputJsonSchema({
        type: "object",
        required: ["record"],
        additionalProperties: false,
        properties: {
          record: { $ref: "#/$defs/record~1value" },
          missing: { $ref: "#/$defs/missing" },
          values: { type: "array", items: { type: "number" } },
          nullable: { type: ["string", "null"] },
        },
        $defs: {
          "record/value": {
            type: "object",
            properties: {
              nil: { const: null },
              list: { const: [] },
              flag: { const: true },
              count: { const: 3 },
              text: { const: "value" },
              record: { const: {} },
              choice: { type: "string", enum: ["a", "b"] },
              untypedChoice: { enum: [1, 2] },
            },
          },
        },
      }),
    ).toEqual({
      type: "object",
      required: ["record"],
      additionalProperties: false,
      properties: {
        record: {
          type: "object",
          properties: {
            nil: { type: "null", const: null },
            list: { type: "array", const: [] },
            flag: { type: "boolean", const: true },
            count: { type: "number", const: 3 },
            text: { type: "string", const: "value" },
            record: { type: "object", const: {} },
            choice: { type: "string", enum: ["a", "b"] },
            untypedChoice: { enum: [1, 2] },
          },
        },
        missing: {},
        values: { type: "array", items: { type: "number" } },
        nullable: { type: ["string", "null"] },
      },
    });
  });

  test("bounds deep objects and arrays", () => {
    expect(
      projectModelOutputJsonSchema({
        type: "object",
        properties: {
          first: {
            type: "object",
            properties: {
              second: {
                type: "object",
                properties: {
                  third: {
                    type: "object",
                    properties: {
                      fourth: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ).toMatchObject({
      properties: {
        first: {
          properties: {
            second: {
              properties: {
                third: {
                  properties: { fourth: { type: "array" } },
                },
              },
            },
          },
        },
      },
    });
  });

  test("merges shallow object alternatives without inventing requirements", () => {
    expect(
      projectModelOutputJsonSchema({
        type: "object",
        properties: {
          level1: {
            type: "object",
            properties: {
              level2: {
                type: "object",
                properties: {
                  result: {
                    anyOf: [
                      {
                        type: "object",
                        required: ["tag", "left"],
                        additionalProperties: false,
                        properties: {
                          tag: { const: "left" },
                          left: { type: "string" },
                          ignored: true,
                        },
                      },
                      {
                        type: "object",
                        required: ["tag", "right"],
                        additionalProperties: false,
                        properties: {
                          tag: { const: "right" },
                          right: { type: "number" },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      }),
    ).toMatchObject({
      properties: {
        level1: {
          properties: {
            level2: {
              properties: {
                result: {
                  type: "object",
                  required: ["tag"],
                  additionalProperties: false,
                  properties: {
                    tag: {
                      anyOf: [
                        { type: "string", const: "left" },
                        { type: "string", const: "right" },
                      ],
                    },
                    left: { type: "string" },
                    right: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  test("keeps distinct non-object alternatives and removes duplicates", () => {
    expect(
      projectModelOutputJsonSchema({
        anyOf: [{ type: "string" }, { type: "number" }],
      }),
    ).toEqual({ anyOf: [{ type: "string" }, { type: "number" }] });
    expect(
      projectModelOutputJsonSchema({
        anyOf: [{ type: "string" }, { type: "string" }],
      }),
    ).toEqual({ type: "string" });
    expect(projectModelOutputJsonSchema({ anyOf: [] })).toEqual({ anyOf: [] });
  });
});
