import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { buildSync } from "esbuild";

import { repoRoot } from "../transcript.ts";
import { attemptSource } from "./attempt-source.ts";
import type { JsonValue } from "./continuation-contract.ts";

export type ConsumerDistributionInput = {
  readonly destination: string;
  readonly trustedDestination: string;
  readonly scenarioPath: string;
};

export type ScenarioSetupDistributionInput = {
  readonly destination: string;
  readonly scenarioPath: string;
  readonly scenarioReviewPath: string;
  readonly statBlocks: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly characterObservation: JsonValue;
};

export type ScenarioCharacterDistributionInput = {
  readonly destination: string;
  readonly scenarioPath: string;
  readonly scenarioReviewPath: string;
};

const declarationDiagnosticCodes = new Set(["TS4023", "TS4058", "TS7056"]);

function emitPublicDeclarations(destination: string): void {
  const declarationsDirectory = resolve(destination, "declarations");
  const compiler = resolve(repoRoot, "node_modules/typescript/bin/tsc");
  const config = resolve(
    repoRoot,
    "scripts/raw-swarm/sdk-player/declarations.tsconfig.json",
  );
  const result = spawnSync(
    process.execPath,
    [
      compiler,
      "-p",
      config,
      "--outDir",
      declarationsDirectory,
      "--pretty",
      "false",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) {
    throw new Error(`Public declaration emission stopped by ${result.signal}.`);
  }
  if (result.status !== 0) {
    const diagnostics = `${result.stdout}${result.stderr}`
      .split("\n")
      .filter((line) => line.includes("error TS"));
    const unexpected = diagnostics.filter((line) => {
      const code = line.match(/error (TS\d+):/)?.[1];
      return code === undefined || !declarationDiagnosticCodes.has(code);
    });
    if (diagnostics.length === 0 || unexpected.length > 0) {
      throw new Error(
        `Public declaration emission failed:\n${unexpected.join("\n") || result.stderr}`,
      );
    }
    // TypeScript 5.9 reports these only while serializing large inferred
    // schemas, after it emits the reachable declarations. Required-file checks
    // below and the isolated consumer typecheck are the executable completeness
    // boundary for this narrow SDK; any other diagnostic fails the build.
  }

  const requiredDeclarations = [
    "scripts/raw-swarm/sdk-player/consumer-entry.d.ts",
    "scripts/raw-swarm/sdk-player/continuation-contract.d.ts",
    "scripts/raw-swarm/sdk-player/scenario-character-contract.d.ts",
    "scripts/raw-swarm/sdk-player/scenario-setup-contract.d.ts",
    "scripts/raw-swarm/sdk-player/scenario-session.d.ts",
    "packages/battle-runtime/src/index.d.ts",
    "packages/battle-runtime/src/battle-state-execution.d.ts",
    "packages/battle-runtime/src/battle-session-execution.d.ts",
    "packages/character-creation-runtime/src/index.d.ts",
    "packages/character-battle-runtime/src/index.d.ts",
    "packages/character-sheet-runtime/src/index.d.ts",
    "packages/tactical-space/src/index.d.ts",
  ];
  for (const relativePath of requiredDeclarations) {
    if (!existsSync(resolve(declarationsDirectory, relativePath))) {
      throw new Error(`Public declaration emission omitted ${relativePath}.`);
    }
  }
}

function consumerTsconfig(baseUrl: string, include: readonly string[]): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        lib: ["ES2022"],
        types: [],
        baseUrl,
        paths: {
          "@dnd/player-sdk": [
            resolve(
              baseUrl,
              "declarations/scripts/raw-swarm/sdk-player/consumer-entry.d.ts",
            ),
          ],
          "@dnd/scenario-character-sdk": [
            resolve(
              baseUrl,
              "declarations/scripts/raw-swarm/sdk-player/scenario-character-contract.d.ts",
            ),
          ],
          "@dnd/scenario-setup-sdk": [
            resolve(
              baseUrl,
              "declarations/scripts/raw-swarm/sdk-player/scenario-setup-contract.d.ts",
            ),
          ],
          "@dnd/battle-runtime": [
            resolve(
              baseUrl,
              "declarations/packages/battle-runtime/src/index.d.ts",
            ),
          ],
          "@dnd/character-battle-runtime": [
            resolve(
              baseUrl,
              "declarations/packages/character-battle-runtime/src/index.d.ts",
            ),
          ],
          "@dnd/character-creation-runtime": [
            resolve(
              baseUrl,
              "declarations/packages/character-creation-runtime/src/index.d.ts",
            ),
          ],
          "@dnd/character-sheet-runtime": [
            resolve(
              baseUrl,
              "declarations/packages/character-sheet-runtime/src/index.d.ts",
            ),
          ],
          "@dnd/shared/*": [
            resolve(baseUrl, "declarations/packages/shared/src/*"),
          ],
          "@dnd/shared-algebras/*": [
            resolve(baseUrl, "declarations/packages/shared-algebras/src/*"),
          ],
          "@dnd/tactical-space": [
            resolve(
              baseUrl,
              "declarations/packages/tactical-space/src/index.d.ts",
            ),
          ],
          "@dnd/surface/*": [
            resolve(baseUrl, "declarations/packages/surface/src/*"),
          ],
        },
        allowImportingTsExtensions: true,
        skipLibCheck: true,
        strict: true,
        exactOptionalPropertyTypes: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
      },
      include,
    },
    null,
    2,
  )}\n`;
}

export function buildConsumerDistribution(
  input: ConsumerDistributionInput,
): void {
  mkdirSync(input.destination, { recursive: true });
  mkdirSync(input.trustedDestination, { recursive: true });
  emitPublicDeclarations(input.destination);
  cpSync(
    resolve(input.destination, "declarations"),
    resolve(input.trustedDestination, "declarations"),
    { recursive: true, dereference: true },
  );
  copyFileSync(input.scenarioPath, resolve(input.destination, "SCENARIO.md"));
  copyFileSync(
    resolve(repoRoot, "packages/battle-runtime/README.md"),
    resolve(input.destination, "PUBLIC_SDK.md"),
  );
  copyFileSync(
    resolve(repoRoot, "scripts/raw-swarm/sdk-player/PLAYER.md"),
    resolve(input.destination, "PLAYER.md"),
  );
  writeFileSync(
    resolve(input.destination, "tsconfig.json"),
    consumerTsconfig(input.destination, ["attempt.ts"]),
  );
  writeFileSync(
    resolve(input.trustedDestination, "tsconfig.json"),
    consumerTsconfig(input.trustedDestination, ["submissions/*.ts"]),
  );
  writeFileSync(
    resolve(input.destination, "attempt.ts"),
    attemptSource(
      `  const acts = context.sdk.discoverBattleActs(context.session);

  return {
    kind: "continue",
    session: context.session,
    tacticalNote: "Observed " + acts.length + " available acts; replace this starter body with one coherent tactical continuation.",
  };`,
    ),
  );
  cpSync(
    resolve(repoRoot, "node_modules/typescript"),
    resolve(input.destination, "tooling/typescript"),
    { recursive: true, dereference: true },
  );
  cpSync(
    resolve(repoRoot, "node_modules/typescript"),
    resolve(input.trustedDestination, "tooling/typescript"),
    { recursive: true, dereference: true },
  );
  buildSync({
    entryPoints: [
      resolve(repoRoot, "scripts/raw-swarm/sdk-player/supervisor-cli.ts"),
    ],
    outfile: resolve(input.trustedDestination, "supervisor.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    sourcemap: false,
    logLevel: "silent",
  });
  buildSync({
    entryPoints: [
      resolve(repoRoot, "scripts/raw-swarm/sdk-player/player-client.ts"),
    ],
    outfile: resolve(input.destination, "player-client.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    sourcemap: false,
    logLevel: "silent",
  });
}

export function buildScenarioSetupDistribution(
  input: ScenarioSetupDistributionInput,
): void {
  mkdirSync(input.destination, { recursive: true });
  emitPublicDeclarations(input.destination);
  copyFileSync(input.scenarioPath, resolve(input.destination, "SCENARIO.md"));
  copyFileSync(
    input.scenarioReviewPath,
    resolve(input.destination, "SCENARIO_REVIEW.json"),
  );
  copyFileSync(
    resolve(repoRoot, "packages/battle-runtime/README.md"),
    resolve(input.destination, "PUBLIC_SDK.md"),
  );
  copyFileSync(
    resolve(repoRoot, "scripts/raw-swarm/sdk-player/SCENARIO_SETUP.md"),
    resolve(input.destination, "SCENARIO_SETUP.md"),
  );
  copyFileSync(
    resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/SCENARIO_SETUP_CONTROLLER.md",
    ),
    resolve(input.destination, "SCENARIO_SETUP_CONTROLLER.md"),
  );
  writeFileSync(
    resolve(input.destination, "STAT_BLOCKS.json"),
    `${JSON.stringify(input.statBlocks, null, 2)}\n`,
  );
  writeFileSync(
    resolve(input.destination, "CHARACTERS.json"),
    `${JSON.stringify(input.characterObservation, null, 2)}\n`,
  );
  writeFileSync(
    resolve(input.destination, "tsconfig.json"),
    consumerTsconfig(input.destination, ["setup.ts"]),
  );
  writeFileSync(
    resolve(input.destination, "setup.ts"),
    `import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = () => ({
  kind: "obstructed",
  obstruction: "Replace this starter with the closest faithful public-SDK setup.",
  observation: { setup: "not-authored" },
});
`,
  );
  cpSync(
    resolve(repoRoot, "node_modules/typescript"),
    resolve(input.destination, "tooling/typescript"),
    { recursive: true, dereference: true },
  );
}

export function buildScenarioCharacterDistribution(
  input: ScenarioCharacterDistributionInput,
): void {
  mkdirSync(input.destination, { recursive: true });
  emitPublicDeclarations(input.destination);
  copyFileSync(input.scenarioPath, resolve(input.destination, "SCENARIO.md"));
  copyFileSync(
    input.scenarioReviewPath,
    resolve(input.destination, "SCENARIO_REVIEW.json"),
  );
  copyFileSync(
    resolve(repoRoot, "packages/character-creation-runtime/README.md"),
    resolve(input.destination, "CHARACTER_CREATION_SDK.md"),
  );
  copyFileSync(
    resolve(repoRoot, "packages/character-sheet-runtime/README.md"),
    resolve(input.destination, "CHARACTER_SHEET_SDK.md"),
  );
  copyFileSync(
    resolve(repoRoot, "scripts/raw-swarm/sdk-player/SCENARIO_CHARACTERS.md"),
    resolve(input.destination, "SCENARIO_CHARACTERS.md"),
  );
  writeFileSync(
    resolve(input.destination, "tsconfig.json"),
    consumerTsconfig(input.destination, ["characters.ts"]),
  );
  writeFileSync(
    resolve(input.destination, "characters.ts"),
    `import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

export const composeScenarioCharacters: ScenarioCharacters = () => ({
  kind: "obstructed",
  obstruction: "Replace this starter with the closest faithful canonical Character Sheets.",
  observation: { characters: "not-authored" },
});
`,
  );
  cpSync(
    resolve(repoRoot, "node_modules/typescript"),
    resolve(input.destination, "tooling/typescript"),
    { recursive: true, dereference: true },
  );
  buildSync({
    entryPoints: [
      resolve(
        repoRoot,
        "scripts/raw-swarm/sdk-player/scenario-character-client.ts",
      ),
    ],
    outfile: resolve(input.destination, "character-client.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    sourcemap: false,
    logLevel: "silent",
  });
}
