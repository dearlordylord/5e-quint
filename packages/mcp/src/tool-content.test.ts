import { describe, expect, test } from "vitest";

import {
  errorContent,
  jsonContent,
  jsonContentPayload,
  jsonSerializablePayload,
} from "./tool-content.ts";

describe("MCP JSON tool content", () => {
  test.each([
    null,
    undefined,
    true,
    42,
    "spaces and\nnewlines remain content",
    [],
    {},
    {
      second: [null, undefined, { text: 'é\nquoted "text"' }],
      first: 1,
      omitted: undefined,
    },
  ])(
    "preserves JSON values and ordering without formatting whitespace (%j)",
    (payload) => {
      const normalized = jsonSerializablePayload(payload);
      const text = jsonContent(payload).content[0].text;
      expect(JSON.parse(text)).toEqual(normalized);
      expect(text).toBe(
        JSON.stringify(JSON.parse(JSON.stringify(normalized, null, 2))),
      );
    },
  );

  test("keeps the error flag and omits absent error details", () => {
    for (const details of [undefined, null]) {
      const response = errorContent("plain", details);
      expect(response.isError).toBe(true);
      expect(jsonContentPayload(response)).toEqual({ error: "plain" });
    }
    const response = errorContent("detailed", { ordered: [2, 1], empty: [] });
    expect(response.isError).toBe(true);
    expect(jsonContentPayload(response)).toEqual({
      error: "detailed",
      details: { ordered: [2, 1], empty: [] },
    });
  });

  test("maps JavaScript's non-serializable undefined root to JSON null", () => {
    expect(jsonSerializablePayload(undefined)).toBeNull();
    expect(jsonContent(undefined).content[0].text).toBe("null");
  });

  test("keeps error details optional without a second empty representation", () => {
    expect(JSON.parse(errorContent("plain").content[0].text)).toEqual({
      error: "plain",
    });
    expect(
      JSON.parse(errorContent("detailed", { code: "DETAIL" }).content[0].text),
    ).toEqual({
      error: "detailed",
      details: { code: "DETAIL" },
    });
  });

  test("decodes canonical JSON text and preserves malformed text", () => {
    expect(jsonContentPayload(jsonContent({ value: 1 }))).toEqual({
      value: 1,
    });
    expect(
      jsonContentPayload({
        content: [{ text: "not-json" }],
      }),
    ).toBe("not-json");
  });
});
