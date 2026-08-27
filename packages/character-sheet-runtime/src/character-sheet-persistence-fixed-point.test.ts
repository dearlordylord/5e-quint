import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { parseCharacterSheet } from "./index.ts";
import { unitLibrary } from "./test-support.test-support.ts";

const artifactPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/character-sheet-persistence-fixed-point.json",
);
const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
  readonly fixedPoint: { readonly commit: string };
  readonly cases: readonly {
    readonly id: string;
    readonly input: unknown;
    readonly expected:
      | { readonly outcome: "success"; readonly value: unknown }
      | { readonly outcome: "failure"; readonly issue: unknown };
  }[];
};

describe("character-sheet persistence fixed point", () => {
  test("replays the bounded old-parser matrix", () => {
    expect(artifact.fixedPoint.commit).toBe(
      "e8621156332b0b4bd65379043d0bc1bc32f3a0af",
    );

    for (const testCase of artifact.cases) {
      const parsed = parseCharacterSheet(testCase.input, unitLibrary);
      const actual = Result.isSuccess(parsed)
        ? { outcome: "success" as const, value: parsed.success }
        : { outcome: "failure" as const, issue: parsed.failure };
      expect(actual, testCase.id).toEqual(testCase.expected);
    }
  });
});
