import { Either, Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { decodeWithSchema } from "./oracle-decode.ts";

describe("decodeWithSchema", () => {
  it("maps a forbidden async transformation to a root wrongType issue", () => {
    const asyncText = Schema.transformOrFail(Schema.String, Schema.String, {
      decode: (value) => Effect.promise(() => Promise.resolve(value)),
      encode: (value) => Effect.succeed(value),
    });
    const schema = Schema.Struct({ x: asyncText });

    const decoded = decodeWithSchema(schema, { x: "input" });

    expect(decoded).toEqual(Either.left([{ path: "", code: "wrongType" }]));
  });
});
