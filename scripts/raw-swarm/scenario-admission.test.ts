import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { admittedScenarioIdentity } from "./scenario-admission.ts";
import { decodeScenarioId } from "./transcript.ts";

describe("scenario admission boundary", () => {
  test("returns a typed failure for malformed or unreadable reviews", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "dnd-admission-"));
    const prosePath = resolve(directory, "example.md");
    const reviewPath = resolve(directory, "example.scenario-review.json");
    writeFileSync(prosePath, "Battle setup.\n");
    writeFileSync(reviewPath, "not JSON\n");
    const decodedScenarioId = decodeScenarioId("example");
    if (Either.isLeft(decodedScenarioId))
      throw new Error(decodedScenarioId.left);

    try {
      expect(
        Either.isLeft(
          admittedScenarioIdentity({
            scenarioId: decodedScenarioId.right,
            scenarioPath: prosePath,
            reviewPath,
          }),
        ),
      ).toBe(true);
      expect(
        Either.isLeft(
          admittedScenarioIdentity({
            scenarioId: decodedScenarioId.right,
            scenarioPath: prosePath,
            reviewPath: resolve(directory, "missing.json"),
          }),
        ),
      ).toBe(true);
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
