import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  evaluateAdmittedScenarioCharacters,
  evaluateScenarioCharacters,
  scenarioCharactersWithoutSheetsSource,
} from "./scenario-character-runtime.ts";
import { readAuthoredSource } from "./authored-source-admission.ts";

async function evaluateSource(source: string) {
  const directory = mkdtempSync(resolve(tmpdir(), "dnd-scenario-characters-"));
  const path = resolve(directory, "characters.ts");
  writeFileSync(path, source);
  try {
    return await evaluateScenarioCharacters(path);
  } finally {
    rmSync(directory, { recursive: true });
  }
}

describe("scenario character composition boundary", () => {
  test("evaluates the canonical stat-block-only source without model authoring", async () => {
    await expect(
      evaluateSource(scenarioCharactersWithoutSheetsSource()),
    ).resolves.toMatchObject({
      tag: "ready",
      characterSheets: [],
    });
  });

  test("retains a precise character-composition obstruction", async () => {
    await expect(
      evaluateSource(`export const composeScenarioCharacters = () => ({
  kind: "obstructed",
  obstruction: "The delegated build cannot be completed by the public SDK.",
  observation: { phase: "character-build" },
});
`),
    ).resolves.toEqual({
      tag: "obstructed",
      obstruction: "The delegated build cannot be completed by the public SDK.",
      observation: { phase: "character-build" },
    });
  });

  test("accumulates independently invalid Character Sheets", async () => {
    await expect(
      evaluateSource(`export const composeScenarioCharacters = () => ({
  kind: "ready",
  characterSheets: [{}, {}],
  observation: { attempted: 2 },
});
`),
    ).resolves.toEqual({
      tag: "invalid",
      message: "Character Sheet 1 is invalid. Character Sheet 2 is invalid.",
    });
  });

  test("rejects non-JSON observations and catches evaluation failures", async () => {
    await expect(
      evaluateSource(`export const composeScenarioCharacters = () => ({
  kind: "obstructed",
  obstruction: "Unavailable.",
  observation: new Map([["not", "json"]]),
});
`),
    ).resolves.toEqual({
      tag: "invalid",
      message: "Scenario character observation must be JSON data.",
    });

    await expect(
      evaluateSource(`export const composeScenarioCharacters = () => {
  throw new Error("controller failed");
};
`),
    ).resolves.toEqual({
      tag: "invalid",
      message: "Scenario character evaluation failed: controller failed",
    });
  });

  test("rejects a forbidden module edge before character source evaluation", async () => {
    const sentinel = "__dnd_character_admission_evaluation_sentinel__";
    Reflect.deleteProperty(globalThis, sentinel);
    await expect(
      evaluateSource(`import "node:fs";
Reflect.set(globalThis, ${JSON.stringify(sentinel)}, true);
export const composeScenarioCharacters = () => ({
  kind: "obstructed",
  obstruction: "This source must never evaluate.",
  observation: {},
});
`),
    ).resolves.toMatchObject({
      tag: "invalid",
      message: expect.stringContaining("forbidden sideEffectImport"),
    });
    expect(Reflect.get(globalThis, sentinel)).toBeUndefined();
  });

  test("evaluates the admitted character source bytes after the source path changes", async () => {
    const directory = mkdtempSync(resolve(tmpdir(), "dnd-character-snapshot-"));
    const sourcePath = resolve(directory, "characters.ts");
    try {
      writeFileSync(
        sourcePath,
        `export const composeScenarioCharacters = () => ({
  kind: "obstructed",
  obstruction: "ADMITTED",
  observation: {},
});
`,
      );
      const admitted = readAuthoredSource({
        role: "scenarioCharacter",
        sourcePath,
      });
      expect(admitted.tag).toBe("admitted");
      if (admitted.tag !== "admitted") return;
      writeFileSync(
        sourcePath,
        `export const composeScenarioCharacters = () => ({
  kind: "obstructed",
  obstruction: "REPLACED",
  observation: {},
});
`,
      );
      await expect(
        evaluateAdmittedScenarioCharacters(admitted),
      ).resolves.toMatchObject({ tag: "obstructed", obstruction: "ADMITTED" });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
