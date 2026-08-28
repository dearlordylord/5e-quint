import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { ORACLE_CLI_USAGE, parseOracleCliCommand } from "./oracle-bootstrap.ts";

describe("Opaque Oracle command parser", () => {
  test("accepts the exhaustive command set", () => {
    expect(parseOracleCliCommand(["identity"])).toEqual(
      Either.right({ tag: "identity" }),
    );
    expect(parseOracleCliCommand(["stream"])).toEqual(
      Either.right({ tag: "stream" }),
    );
    expect(
      parseOracleCliCommand(["serve", "--port", "0", "--host", "127.0.0.1"]),
    ).toEqual(
      Either.right({
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
      expect(Either.isLeft(result), args.join(" ")).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left.tag).toBe("invalidArguments");
        expect(result.left.message).toBe(ORACLE_CLI_USAGE);
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
});
