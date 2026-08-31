import { Result, Effect, Schema, SchemaGetter } from "effect";
import { describe, expect, it } from "vitest";

import { decodeWithSchema } from "./oracle-decode.ts";

describe("decodeWithSchema", () => {
  it("maps a forbidden async transformation to a root wrongType issue", () => {
    const asyncText = Schema.String.pipe(
      Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.transformOrFail((value: string) =>
          Effect.promise(() => Promise.resolve(value)),
        ),
        encode: SchemaGetter.transformOrFail((value: string) =>
          Effect.succeed(value),
        ),
      }),
    );
    const schema = Schema.Struct({ x: asyncText });

    const decoded = decodeWithSchema(schema, { x: "input" });

    expect(decoded).toEqual(Result.fail([{ path: "", code: "wrongType" }]));
  });

  it("does not add the forbidden fallback when a sibling issue is present", () => {
    const asyncText = Schema.String.pipe(
      Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.transformOrFail((value: string) =>
          Effect.promise(() => Promise.resolve(value)),
        ),
        encode: SchemaGetter.transformOrFail((value: string) =>
          Effect.succeed(value),
        ),
      }),
    );
    const schema = Schema.Struct({ x: asyncText, y: Schema.Number });

    const decoded = decodeWithSchema(schema, { x: "input", y: "invalid" });

    expect(decoded).toEqual(Result.fail([{ path: "/y", code: "wrongType" }]));
  });
});
