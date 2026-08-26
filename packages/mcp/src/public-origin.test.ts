import { Either, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { PublicMcpOriginSchema } from "./public-origin.ts";

const decode = Schema.decodeUnknownEither(PublicMcpOriginSchema);

describe("public MCP origin", () => {
  it("accepts exactly one HTTPS origin", () => {
    const decoded = decode("https://oracle.example.test");
    expect(Either.isRight(decoded)).toBe(true);
    if (Either.isRight(decoded)) {
      expect(decoded.right.toString()).toBe("https://oracle.example.test/");
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
