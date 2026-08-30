import { Result } from "effect";
import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import { ORACLE_CLI_USAGE, parseOracleCliCommand } from "./oracle-bootstrap.ts";

describe("Opaque Oracle command parser", () => {
  test("accepts the exhaustive command set", () => {
    expect(parseOracleCliCommand(["identity"])).toEqual(
      Result.succeed({ tag: "identity" }),
    );
    expect(parseOracleCliCommand(["stream"])).toEqual(
      Result.succeed({ tag: "stream" }),
    );
    expect(
      parseOracleCliCommand(["serve", "--port", "0", "--host", "127.0.0.1"]),
    ).toEqual(
      Result.succeed({
        tag: "serve",
        host: "127.0.0.1",
        port: 0,
      }),
    );
  });

  test("rejects unknown commands, extras, duplicate flags, and invalid ports", () => {
    const invalidArguments = [
      [],
      ["unknown"],
      ["identity", "extra"],
      ["stream", "extra"],
      ["serve"],
      ["serve", "--host", "127.0.0.1"],
      ["serve", "--host", "127.0.0.1", "--host", "127.0.0.1", "--port", "0"],
      ["serve", "--host", "127.0.0.1", "--port", "1", "--port", "2"],
      ["serve", "--host", "localhost", "--port", "0"],
      ["serve", "--host", "0.0.0.0", "--port", "0"],
      ["serve", "--host", "::1", "--port", "0"],
      ["serve", "--host", "127.0.0.1", "--port", "-1"],
      ["serve", "--host", "127.0.0.1", "--port", "65536"],
      ["serve", "--host", "127.0.0.1", "--port", "01"],
      ["serve", "--host", "127.0.0.1", "--port", "1.0"],
      ["serve", "--host", "127.0.0.1", "--port", "1e2"],
      ["serve", "--host", "127.0.0.1", "--port", "0", "extra"],
      ["serve", "--host", "127.0.0.1", "--other", "0"],
    ];

    for (const args of invalidArguments) {
      const result = parseOracleCliCommand(args);
      expect(Result.isFailure(result), args.join(" ")).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure.tag).toBe("invalidArguments");
        expect(result.failure.message).toBe(ORACLE_CLI_USAGE);
      }
    }
  });

  test("derives serve usage from the command definition", () => {
    expect(ORACLE_CLI_USAGE).toContain(
      "oracle serve --host 127.0.0.1 --port <0..65535>",
    );
    expect(ORACLE_CLI_USAGE).toContain(
      "the stream mode reads UTF-8 LF-framed batches",
    );
  });

  test("accepts either serve-flag order for every valid bind port", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 65_535 }), (port) => {
        const hostFirst = parseOracleCliCommand([
          "serve",
          "--host",
          "127.0.0.1",
          "--port",
          String(port),
        ]);
        const portFirst = parseOracleCliCommand([
          "serve",
          "--port",
          String(port),
          "--host",
          "127.0.0.1",
        ]);
        expect(Result.isSuccess(hostFirst)).toBe(true);
        if (Result.isFailure(hostFirst)) return;
        expect(hostFirst.success).toMatchObject({ tag: "serve", port });
        expect(portFirst).toEqual(hostFirst);
      }),
      { numRuns: 200 },
    );
  });
});
