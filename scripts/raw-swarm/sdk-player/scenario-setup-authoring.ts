import { constants, copyFileSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import {
  readAuthoredSource,
  withAuthoredSourceSnapshot,
  type AdmittedAuthoredSource,
  type AuthoredSourceIssue,
} from "./authored-source-admission.ts";

export const scenarioSetupAuthorProtectedInputFiles = [
  "SCENARIO.md",
  "SCENARIO_REVIEW.json",
  "CHARACTERS.json",
  "STAT_BLOCKS.json",
  "CAPABILITY_CONTEXT.md",
  "SCENARIO_SETUP.md",
  "SCENARIO_SETUP_CONTROLLER.md",
] as const;

export type ScenarioSetupAuthorRole = "neutral" | "controller";

export type ScenarioSetupAuthoringResult<Retained> =
  | { readonly tag: "retained"; readonly retained: Retained }
  | {
      readonly tag: "sourceRejected";
      readonly phase: "neutral" | "retained";
      readonly issues: readonly [AuthoredSourceIssue, ...AuthoredSourceIssue[]];
    };

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
  readonly runAuthor: (role: ScenarioSetupAuthorRole) => void | Promise<void>;
  readonly typecheck: (
    phase: "neutral" | "retained",
    source: AdmittedAuthoredSource<"scenarioSetup">,
  ) => void;
  readonly validateRetained: (
    source: AdmittedAuthoredSource<"scenarioSetup">,
  ) => Retained | Promise<Retained>;
}): Promise<ScenarioSetupAuthoringResult<Retained>> {
  const protectedInputs = protectedInputSources(input.scratch);
  const setupPath = resolve(input.scratch, "setup.ts");
  const neutralSetupPath = resolve(input.scratch, "NEUTRAL_SETUP.ts");

  await input.runAuthor("neutral");
  assertProtectedInputsUnchanged({
    scratch: input.scratch,
    expected: protectedInputs,
    role: "neutral",
  });
  const neutralSource = readAuthoredSource({
    role: "scenarioSetup",
    sourcePath: setupPath,
  });
  if (neutralSource.tag === "rejected") {
    return {
      tag: "sourceRejected",
      phase: "neutral",
      issues: neutralSource.issues,
    };
  }
  withAuthoredSourceSnapshot(neutralSource, (snapshot) =>
    input.typecheck("neutral", snapshot),
  );

  copyFileSync(setupPath, neutralSetupPath, constants.COPYFILE_EXCL);
  const neutralSetupSource = readFileSync(neutralSetupPath, "utf8");
  try {
    await input.runAuthor("controller");
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

  const retainedSource = readAuthoredSource({
    role: "scenarioSetup",
    sourcePath: setupPath,
  });
  if (retainedSource.tag === "rejected") {
    return {
      tag: "sourceRejected",
      phase: "retained",
      issues: retainedSource.issues,
    };
  }
  withAuthoredSourceSnapshot(retainedSource, (snapshot) =>
    input.typecheck("retained", snapshot),
  );
  return {
    tag: "retained",
    retained: await input.validateRetained(retainedSource),
  };
}
