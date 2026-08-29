import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { PublicMcpOriginSchema } from "./public-origin.ts";

const decode = Schema.decodeUnknownResult(PublicMcpOriginSchema);

describe("public MCP origin", () => {
  it("accepts exactly one HTTPS origin", () => {
    const decoded = decode("https://oracle.example.test");
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isSuccess(decoded)) {
      expect(decoded.success.toString()).toBe("https://oracle.example.test/");
    }
  });

  it.each([
    "http://oracle.example.test",
    "https://user@oracle.example.test",
    "https://oracle.example.test/path",
    "https://oracle.example.test/?query=yes",
    "https://oracle.example.test/#fragment",
  ])("rejects non-origin URL %s", (value) => {
    expect(decode(value)).toMatchObject({ _tag: "Left" });
  });
});
