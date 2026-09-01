import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  authorScenarioSetupThroughOwners,
  scenarioSetupAuthorProtectedInputFiles,
} from "./scenario-setup-authoring.ts";

const STARTER_SETUP_SOURCE = "export {};\n";
const NEUTRAL_SETUP_SOURCE = `export const setupScenario = () => ({
  kind: "obstructed",
  obstruction: "Neutral setup remains obstructed.",
  observation: {},
});
`;
const CONTROLLER_SETUP_SOURCE = `export const setupScenario = () => ({
  kind: "obstructed",
  obstruction: "Controller setup remains obstructed.",
  observation: {},
});
`;

function authoringScratch(): string {
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-setup-authoring-test-"));
  for (const file of scenarioSetupAuthorProtectedInputFiles) {
    writeFileSync(resolve(scratch, file), `${file} protected\n`);
  }
  writeFileSync(resolve(scratch, "setup.ts"), STARTER_SETUP_SOURCE);
  return scratch;
}

describe("scenario setup two-owner authoring", () => {
  test("delivers the exact neutral source and validates the retained source alone", async () => {
    const scratch = authoringScratch();
    const phases: string[] = [];
    try {
      await authorScenarioSetupThroughOwners({
        scratch,
        runAuthor: (role) => {
          if (role === "neutral") {
            writeFileSync(resolve(scratch, "setup.ts"), NEUTRAL_SETUP_SOURCE);
            return;
          }
          expect(
            readFileSync(resolve(scratch, "NEUTRAL_SETUP.ts"), "utf8"),
          ).toBe(NEUTRAL_SETUP_SOURCE);
          expect(readFileSync(resolve(scratch, "setup.ts"), "utf8")).toBe(
            NEUTRAL_SETUP_SOURCE,
          );
          writeFileSync(resolve(scratch, "setup.ts"), CONTROLLER_SETUP_SOURCE);
        },
        typecheck: (phase) => {
          phases.push(phase);
          if (phase === "retained") {
            expect(existsSync(resolve(scratch, "NEUTRAL_SETUP.ts"))).toBe(
              false,
            );
            expect(readFileSync(resolve(scratch, "setup.ts"), "utf8")).toBe(
              CONTROLLER_SETUP_SOURCE,
            );
          }
        },
        validateRetained: () => {
          phases.push("evaluate");
          expect(existsSync(resolve(scratch, "NEUTRAL_SETUP.ts"))).toBe(false);
          return "evaluated";
        },
      });
      expect(phases).toEqual(["neutral", "retained", "evaluate"]);
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });

  test("rejects protected-input mutation by either author", async () => {
    for (const mutatingRole of ["neutral", "controller"] as const) {
      const scratch = authoringScratch();
      try {
        await expect(
          authorScenarioSetupThroughOwners({
            scratch,
            runAuthor: (role) => {
              if (role === "neutral") {
                writeFileSync(
                  resolve(scratch, "setup.ts"),
                  NEUTRAL_SETUP_SOURCE,
                );
              }
              if (role === mutatingRole) {
                writeFileSync(
                  resolve(scratch, "SCENARIO.md"),
                  `${role} changed scenario\n`,
                );
              }
            },
            typecheck: () => undefined,
            validateRetained: () => undefined,
          }),
        ).rejects.toThrow(
          `Scenario setup ${mutatingRole} agent changed protected input SCENARIO.md.`,
        );
      } finally {
        rmSync(scratch, { recursive: true });
      }
    }
  });

  test("rejects controller mutation of the neutral baseline", async () => {
    const scratch = authoringScratch();
    try {
      await expect(
        authorScenarioSetupThroughOwners({
          scratch,
          runAuthor: (role) => {
            if (role === "neutral") {
              writeFileSync(resolve(scratch, "setup.ts"), NEUTRAL_SETUP_SOURCE);
            } else {
              writeFileSync(
                resolve(scratch, "NEUTRAL_SETUP.ts"),
                "rewritten baseline\n",
              );
            }
          },
          typecheck: () => undefined,
          validateRetained: () => undefined,
        }),
      ).rejects.toThrow(
        "Scenario setup controller changed the neutral review baseline.",
      );
      expect(existsSync(resolve(scratch, "NEUTRAL_SETUP.ts"))).toBe(false);
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });

  test("rejects a retained setup that imports the removed baseline before typechecking", async () => {
    const scratch = authoringScratch();
    try {
      await expect(
        authorScenarioSetupThroughOwners({
          scratch,
          runAuthor: (role) => {
            if (role === "neutral") {
              writeFileSync(resolve(scratch, "setup.ts"), NEUTRAL_SETUP_SOURCE);
            } else {
              writeFileSync(
                resolve(scratch, "setup.ts"),
                'import "./NEUTRAL_SETUP.ts";\n',
              );
            }
          },
          typecheck: (phase) => {
            if (phase === "retained") {
              expect(existsSync(resolve(scratch, "NEUTRAL_SETUP.ts"))).toBe(
                false,
              );
              if (
                readFileSync(resolve(scratch, "setup.ts"), "utf8").includes(
                  "NEUTRAL_SETUP.ts",
                )
              ) {
                throw new Error("Retained setup does not typecheck alone.");
              }
            }
          },
          validateRetained: () => undefined,
        }),
      ).rejects.toThrow("forbidden sideEffectImport");
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });

  test("rejects a forbidden neutral module edge before author typechecking", async () => {
    const scratch = authoringScratch();
    let typecheckReached = false;
    try {
      await expect(
        authorScenarioSetupThroughOwners({
          scratch,
          runAuthor: () => {
            writeFileSync(resolve(scratch, "setup.ts"), 'import "node:fs";\n');
          },
          typecheck: () => {
            typecheckReached = true;
          },
          validateRetained: () => undefined,
        }),
      ).rejects.toThrow("forbidden sideEffectImport");
      expect(typecheckReached).toBe(false);
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });
});
