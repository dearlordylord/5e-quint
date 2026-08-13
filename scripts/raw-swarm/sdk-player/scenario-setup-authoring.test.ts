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

function authoringScratch(): string {
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-setup-authoring-test-"));
  for (const file of scenarioSetupAuthorProtectedInputFiles) {
    writeFileSync(resolve(scratch, file), `${file} protected\n`);
  }
  writeFileSync(resolve(scratch, "setup.ts"), "starter setup\n");
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
            writeFileSync(resolve(scratch, "setup.ts"), "neutral setup\n");
            return;
          }
          expect(
            readFileSync(resolve(scratch, "NEUTRAL_SETUP.ts"), "utf8"),
          ).toBe("neutral setup\n");
          expect(readFileSync(resolve(scratch, "setup.ts"), "utf8")).toBe(
            "neutral setup\n",
          );
          writeFileSync(resolve(scratch, "setup.ts"), "controller setup\n");
        },
        typecheck: (phase) => {
          phases.push(phase);
          if (phase === "retained") {
            expect(existsSync(resolve(scratch, "NEUTRAL_SETUP.ts"))).toBe(
              false,
            );
            expect(readFileSync(resolve(scratch, "setup.ts"), "utf8")).toBe(
              "controller setup\n",
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
                writeFileSync(resolve(scratch, "setup.ts"), "neutral setup\n");
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
              writeFileSync(resolve(scratch, "setup.ts"), "neutral setup\n");
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

  test("rejects a retained setup that imports the removed baseline", async () => {
    const scratch = authoringScratch();
    try {
      await expect(
        authorScenarioSetupThroughOwners({
          scratch,
          runAuthor: (role) => {
            if (role === "neutral") {
              writeFileSync(resolve(scratch, "setup.ts"), "neutral setup\n");
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
      ).rejects.toThrow("Retained setup does not typecheck alone.");
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });
});
