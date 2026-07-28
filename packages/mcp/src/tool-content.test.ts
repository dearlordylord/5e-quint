import { describe, expect, test } from "vitest";

import {
  errorContent,
  jsonContent,
  jsonContentPayload,
  jsonSerializablePayload,
} from "./tool-content.ts";

describe("MCP JSON tool content", () => {
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
