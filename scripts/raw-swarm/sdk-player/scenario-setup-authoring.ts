import { constants, copyFileSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

export const scenarioSetupAuthorProtectedInputFiles = [
  "SCENARIO.md",
  "SCENARIO_REVIEW.json",
  "CHARACTERS.json",
  "STAT_BLOCKS.json",
  "PUBLIC_SDK.md",
  "SCENARIO_SETUP.md",
  "SCENARIO_SETUP_CONTROLLER.md",
] as const;

export type ScenarioSetupAuthorRole = "neutral" | "controller";

function protectedInputSources(scratch: string): readonly string[] {
  return scenarioSetupAuthorProtectedInputFiles.map((file) =>
    readFileSync(resolve(scratch, file), "utf8"),
  );
}

function assertProtectedInputsUnchanged(input: {
  readonly scratch: string;
  readonly expected: readonly string[];
  readonly role: ScenarioSetupAuthorRole;
}): void {
  const changed = protectedInputSources(input.scratch).findIndex(
    (source, index) => source !== input.expected[index],
  );
  if (changed >= 0) {
    throw new Error(
      `Scenario setup ${input.role} agent changed protected input ${scenarioSetupAuthorProtectedInputFiles[changed]}.`,
    );
  }
}

export async function authorScenarioSetupThroughOwners<Retained>(input: {
  readonly scratch: string;
  readonly runAuthor: (role: ScenarioSetupAuthorRole) => void;
  readonly typecheck: (phase: "neutral" | "retained") => void;
  readonly validateRetained: () => Retained | Promise<Retained>;
}): Promise<Retained> {
  const protectedInputs = protectedInputSources(input.scratch);
  const setupPath = resolve(input.scratch, "setup.ts");
  const neutralSetupPath = resolve(input.scratch, "NEUTRAL_SETUP.ts");

  input.runAuthor("neutral");
  assertProtectedInputsUnchanged({
    scratch: input.scratch,
    expected: protectedInputs,
    role: "neutral",
  });
  input.typecheck("neutral");

  copyFileSync(setupPath, neutralSetupPath, constants.COPYFILE_EXCL);
  const neutralSetupSource = readFileSync(neutralSetupPath, "utf8");
  try {
    input.runAuthor("controller");
    assertProtectedInputsUnchanged({
      scratch: input.scratch,
      expected: protectedInputs,
      role: "controller",
    });
    if (readFileSync(neutralSetupPath, "utf8") !== neutralSetupSource) {
      throw new Error(
        "Scenario setup controller changed the neutral review baseline.",
      );
    }
  } finally {
    rmSync(neutralSetupPath, { force: true });
  }

  input.typecheck("retained");
  return input.validateRetained();
}
