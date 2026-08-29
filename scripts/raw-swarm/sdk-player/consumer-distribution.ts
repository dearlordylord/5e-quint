import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve, sep } from "node:path";
import { buildSync } from "esbuild";

import {
  benchmarkContextForRole,
  type BenchmarkContextDelivery,
} from "../benchmark-context.ts";
import {
  capabilityContextForRole,
  type CapabilityRole,
} from "../capability-projection.ts";
import { repoRoot } from "../transcript.ts";
import { attemptSource } from "./attempt-source.ts";
import { PLAYER_CONTINUATION_PROTOCOL_REMINDER } from "./continuation-contract.ts";
import type { JsonValue } from "./continuation-contract.ts";

export type ConsumerDistributionInput = {
  readonly destination: string;
  readonly trustedDestination: string;
  readonly scenarioPath: string;
  readonly contextDelivery: ContextDelivery<"player">;
};

export type ContextDelivery<Role extends CapabilityRole = CapabilityRole> =
  | { readonly tag: "canonicalRoleProjection"; readonly role: Role }
  | (Role extends "player"
      ? BenchmarkPlayerContextDelivery
      : Role extends "setupAuthoring"
        ? BenchmarkSetupContextDelivery
        : Role extends "characterAuthoring"
          ? BenchmarkCharacterContextDelivery
          : BenchmarkContextDelivery);

type BenchmarkPlayerContextDelivery = BenchmarkContextDelivery & {
  readonly role: "player";
};
type BenchmarkSetupContextDelivery = BenchmarkContextDelivery & {
  readonly role: "setupAuthoring";
};
type BenchmarkCharacterContextDelivery = BenchmarkContextDelivery & {
  readonly role: "characterAuthoring";
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
  readonly contextDelivery: ContextDelivery<"setupAuthoring">;
};

export type ScenarioCharacterDistributionInput = {
  readonly destination: string;
  readonly scenarioPath: string;
  readonly scenarioReviewPath: string;
  readonly contextDelivery: ContextDelivery<"characterAuthoring">;
};

function contextFileName(delivery: ContextDelivery): string {
  return delivery.tag === "canonicalRoleProjection"
    ? "CAPABILITY_CONTEXT.md"
    : "BENCHMARK_CONTEXT.md";
}

function contextText(delivery: ContextDelivery): string {
  return delivery.tag === "canonicalRoleProjection"
    ? capabilityContextForRole(delivery.role)
    : benchmarkContextForRole(delivery.profile, delivery.role);
}

type DeclarationDiagnosticLocation = readonly [line: number, column: number];
type NamedDeclarationDiagnosticLocation = readonly [
  line: number,
  column: number,
  exportedVariable: string,
];

const DECLARATION_SERIALIZATION_LENGTH_DIAGNOSTICS = {
  "packages/battle-runtime/src/battle-reducer/battle-codecs.ts": [
    [5585, 14],
    [6185, 14],
    [6373, 14],
    [8502, 14],
    [8514, 14],
  ],
  "packages/battle-runtime/src/battle-reducer/ongoing-concentration-area-spell.ts":
    [[4, 17]],
  "packages/surface/src/surface/schema-nonspell.ts": [
    [457, 14],
    [505, 14],
    [532, 14],
    [558, 14],
    [566, 14],
    [593, 14],
    [1052, 14],
    [1071, 14],
    [1835, 14],
    [1875, 14],
    [1917, 14],
    [1927, 14],
    [1932, 14],
    [1938, 14],
    [1944, 14],
    [1953, 14],
    [1958, 14],
    [1967, 14],
    [1975, 14],
    [1981, 14],
    [1986, 14],
    [1993, 14],
    [1999, 14],
    [3569, 14],
    [3575, 14],
    [3581, 14],
    [3587, 14],
    [3594, 14],
    [3600, 14],
    [3606, 14],
    [3612, 14],
    [3618, 14],
    [3624, 14],
    [3630, 14],
    [3636, 14],
    [3642, 14],
    [3648, 14],
    [3680, 14],
    [3762, 14],
    [3939, 14],
    [3950, 14],
    [4210, 14],
    [4218, 14],
    [4223, 14],
    [4255, 14],
    [4265, 14],
    [4291, 14],
    [4298, 14],
    [4336, 14],
    [4372, 14],
    [4390, 14],
    [4434, 14],
  ],
  "packages/surface/src/surface/schema-spell.ts": [
    [6856, 14],
    [6888, 14],
    [6896, 14],
    [6985, 14],
    [7002, 14],
  ],
  "packages/surface/src/surface/schema.ts": [
    [765, 14],
    [775, 14],
    [803, 14],
    [813, 14],
  ],
} as const satisfies Readonly<
  Record<string, readonly DeclarationDiagnosticLocation[]>
>;

const DECLARATION_SERIALIZATION_EXTERNAL_NAME_DIAGNOSTICS = {
  "packages/battle-runtime/src/battle-reducer/battle-codecs.ts": [
    [5585, 14, "StatBlockExecutionSnapshotSchema"],
    [6185, 14, "BattleUnitSupportSourceSchema"],
    [8502, 14, "BattlePresentedSnapshotSchema"],
    [8514, 14, "BattleSnapshotSchema"],
  ],
  "packages/surface/src/surface/schema-nonspell.ts": [
    [457, 14, "PassiveOperationSchema"],
    [505, 14, "ActivatedAbilityMechanicsSchema"],
    [532, 14, "TriggeredReactionAbilityMechanicsSchema"],
    [558, 14, "MagicItemSpawnedCreatureMechanicsSchema"],
    [566, 14, "ClassFeatureActivationMechanicsSchema"],
    [593, 14, "ClassFeatureAcquisitionChoiceMechanicsSchema"],
    [1052, 14, "ClassFeatureComponentMechanicsSchema"],
    [1071, 14, "CompositeClassFeatureMechanicsSchema"],
    [1835, 14, "PassiveMechanicsSchema"],
    [1875, 14, "ClassFeatureMechanicsSchema"],
    [1917, 14, "ClassGeneralFeatureMechanicsSchema"],
    [1927, 14, "BardClassFeatureMechanicsSchema"],
    [1932, 14, "ClericClassFeatureMechanicsSchema"],
    [1938, 14, "DruidClassFeatureMechanicsSchema"],
    [1944, 14, "WizardClassFeatureMechanicsSchema"],
    [1953, 14, "BarbarianClassFeatureMechanicsSchema"],
    [1958, 14, "FighterClassFeatureMechanicsSchema"],
    [1967, 14, "MonkClassFeatureMechanicsSchema"],
    [1975, 14, "PaladinClassFeatureMechanicsSchema"],
    [1981, 14, "RangerClassFeatureMechanicsSchema"],
    [1986, 14, "RogueClassFeatureMechanicsSchema"],
    [1993, 14, "SorcererClassFeatureMechanicsSchema"],
    [1999, 14, "WarlockClassFeatureMechanicsSchema"],
    [3569, 14, "BardClassFeatureRecordSchema"],
    [3575, 14, "WizardClassFeatureRecordSchema"],
    [3581, 14, "BarbarianClassFeatureRecordSchema"],
    [3587, 14, "FighterClassFeatureRecordSchema"],
    [3594, 14, "ClericClassFeatureRecordSchema"],
    [3600, 14, "DruidClassFeatureRecordSchema"],
    [3606, 14, "MonkClassFeatureRecordSchema"],
    [3612, 14, "PaladinClassFeatureRecordSchema"],
    [3618, 14, "RangerClassFeatureRecordSchema"],
    [3624, 14, "RogueClassFeatureRecordSchema"],
    [3630, 14, "SorcererClassFeatureRecordSchema"],
    [3636, 14, "WarlockClassFeatureRecordSchema"],
    [3642, 14, "OtherClassFeatureRecordSchema"],
    [3648, 14, "ClassFeatureRecordSchema"],
    [3680, 14, "FeatMechanicsSchema"],
    [3762, 14, "FeatRecordSchema"],
    [3939, 14, "SpeciesTraitMechanicsSchema"],
    [3950, 14, "SpeciesTraitRecordSchema"],
    [4210, 14, "MagicItemComponentMechanicsSchema"],
    [4218, 14, "CompositeMagicItemMechanicsSchema"],
    [4223, 14, "MagicItemMechanicsSchema"],
    [4255, 14, "MagicItemVariantSchema"],
    [4265, 14, "MagicItemRecordSchema"],
    [4291, 14, "MagicEquipmentTraitSchema"],
    [4298, 14, "MagicEquipmentVariantSchema"],
    [4336, 14, "ArmorTemplateRecordSchema"],
    [4372, 14, "ShieldTemplateRecordSchema"],
    [4390, 14, "WeaponTemplateRecordSchema"],
    [4434, 14, "UnitRecordSchema"],
  ],
  "packages/surface/src/surface/schema.ts": [
    [765, 14, "SrdUnitRecordSchema"],
    [775, 14, "PublishedSrdUnitRecordSchema"],
    [803, 14, "SrdSurfaceSchema"],
    [813, 14, "PublishedSrdSurfaceSchema"],
  ],
} as const satisfies Readonly<
  Record<string, readonly NamedDeclarationDiagnosticLocation[]>
>;

const DECLARATION_SERIALIZATION_LENGTH_MESSAGE =
  "The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type annotation is needed.";
const DECLARATION_SERIALIZATION_EXTERNAL_NAME_SUFFIX = `has or is using name 'CurseOccurrenceEffect' from external module "<repo>/packages/surface/src/surface/schema-spell" but cannot be named.`;

const PRE_EXISTING_DECLARATION_SERIALIZATION_DIAGNOSTICS = new Set([
  ...Object.entries(DECLARATION_SERIALIZATION_LENGTH_DIAGNOSTICS).flatMap(
    ([owner, locations]) =>
      locations.map(
        ([line, column]) =>
          `${owner}(${String(line)},${String(column)}): error TS7056: ${DECLARATION_SERIALIZATION_LENGTH_MESSAGE}`,
      ),
  ),
  ...Object.entries(
    DECLARATION_SERIALIZATION_EXTERNAL_NAME_DIAGNOSTICS,
  ).flatMap(([owner, locations]) =>
    locations.map(
      ([line, column, exportedVariable]) =>
        `${owner}(${String(line)},${String(column)}): error TS4023: Exported variable '${exportedVariable}' ${DECLARATION_SERIALIZATION_EXTERNAL_NAME_SUFFIX}`,
    ),
  ),
  `packages/battle-runtime/src/battle-reducer/ongoing-concentration-area-spell.ts(4,17): error TS4058: Return type of exported function ${DECLARATION_SERIALIZATION_EXTERNAL_NAME_SUFFIX}`,
]);

function declarationDiagnosticFingerprint(diagnostic: string): string {
  return diagnostic.replaceAll(repoRoot, "<repo>").replaceAll("\\", "/");
}

/**
 * The pinned integration revision emitted 512 files and 6,302,380 bytes while
 * an allowed TS7056 prevented codec-building-blocks.d.ts from being emitted.
 * The #427 graph emits that owner successfully and measures 514 files and
 * about 6.38 MB. These named limits leave six files and less than 0.5 MiB of
 * headroom without treating the older partial-emission counts as a target.
 */
const PUBLIC_DECLARATION_BUNDLE_OBSERVED_FILES = 514;
const PUBLIC_DECLARATION_BUNDLE_FILE_HEADROOM = 6;
export const PUBLIC_DECLARATION_BUNDLE_MAX_FILES =
  PUBLIC_DECLARATION_BUNDLE_OBSERVED_FILES +
  PUBLIC_DECLARATION_BUNDLE_FILE_HEADROOM;
export const PUBLIC_DECLARATION_BUNDLE_MAX_BYTES = 13 * 512 * 1024;
export type PublicDeclarationBundleMeasure = {
  readonly files: number;
  readonly bytes: number;
};

export function unexpectedPublicDeclarationDiagnostics(
  diagnostics: readonly string[],
): readonly string[] {
  return diagnostics.filter(
    (line) =>
      !PRE_EXISTING_DECLARATION_SERIALIZATION_DIAGNOSTICS.has(
        declarationDiagnosticFingerprint(line),
      ),
  );
}
const PLAYER_RUN_START_OBSERVATION = {
  kind: "awaitingFirstContinuation",
  tacticalNote: "",
  guidance:
    "No SDK call has been recorded. Replace the attempt.ts starter body with the first tactical continuation.",
} as const satisfies JsonValue;

function declarationFiles(directory: string): readonly string[] {
  const root = realpathSync(directory);
  const visit = (current: string): readonly string[] =>
    readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Public declaration bundle cannot expose a symbolic link: ${relative(root, path)}.`,
        );
      }
      if (entry.isDirectory()) return visit(path);
      if (!entry.isFile() || !entry.name.endsWith(".d.ts")) {
        throw new Error(
          `Public declaration bundle contains a non-declaration file: ${relative(root, path)}.`,
        );
      }
      const canonical = realpathSync(path);
      const relativeCanonical = relative(root, canonical);
      if (
        relativeCanonical === ".." ||
        relativeCanonical.startsWith(`..${sep}`)
      ) {
        throw new Error(
          `Public declaration bundle file escapes its root: ${relative(root, path)}.`,
        );
      }
      return [path];
    });
  return visit(directory);
}

/**
 * Enforce the separate declaration accessibility/size boundary. The model
 * context budget does not constrain files that are reachable by the compiler;
 * this gate does, and rejects any non-declaration or escaped file outright.
 */
export function assertPublicDeclarationBundle(
  directory: string,
): PublicDeclarationBundleMeasure {
  const files = declarationFiles(directory);
  const bytes = files.reduce((total, path) => total + lstatSync(path).size, 0);
  if (files.length > PUBLIC_DECLARATION_BUNDLE_MAX_FILES) {
    throw new Error(
      `Public declaration bundle has ${String(files.length)} files; maximum is ${String(PUBLIC_DECLARATION_BUNDLE_MAX_FILES)}.`,
    );
  }
  if (bytes > PUBLIC_DECLARATION_BUNDLE_MAX_BYTES) {
    throw new Error(
      `Public declaration bundle has ${String(bytes)} bytes; maximum is ${String(PUBLIC_DECLARATION_BUNDLE_MAX_BYTES)}.`,
    );
  }
  return { files: files.length, bytes };
}

export function emitPublicDeclarations(
  destination: string,
): PublicDeclarationBundleMeasure {
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
    const unexpected = unexpectedPublicDeclarationDiagnostics(diagnostics);
    if (diagnostics.length === 0 || unexpected.length > 0) {
      throw new Error(
        `Public declaration emission failed:\n${unexpected.join("\n") || result.stderr}`,
      );
    }
    // TypeScript 5.9 reports the explicitly partitioned pre-existing
    // diagnostics only while serializing the listed giant inferred schemas.
    // Required-file checks below and the isolated consumer typecheck are the
    // executable completeness boundary for this narrow SDK. New owners,
    // including #427 attack-selection schemas, must emit without diagnostics.
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
  return assertPublicDeclarationBundle(declarationsDirectory);
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
  const declarationMeasure = emitPublicDeclarations(input.destination);
  cpSync(
    resolve(input.destination, "declarations"),
    resolve(input.trustedDestination, "declarations"),
    { recursive: true, dereference: true },
  );
  const trustedDeclarationMeasure = assertPublicDeclarationBundle(
    resolve(input.trustedDestination, "declarations"),
  );
  if (
    trustedDeclarationMeasure.files !== declarationMeasure.files ||
    trustedDeclarationMeasure.bytes !== declarationMeasure.bytes
  ) {
    throw new Error(
      "Trusted declaration bundle differs from the public declaration bundle.",
    );
  }
  copyFileSync(input.scenarioPath, resolve(input.destination, "SCENARIO.md"));
  writeFileSync(
    resolve(input.destination, contextFileName(input.contextDelivery)),
    contextText(input.contextDelivery),
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
      `${PLAYER_CONTINUATION_PROTOCOL_REMINDER.map((line) => `  // ${line}`).join("\n")}
  return {
    kind: "continue",
    session: context.session,
    tacticalNote: "Replace this starter body with one coherent tactical continuation that makes at least one SDK call.",
  };`,
    ),
  );
  writeFileSync(
    resolve(input.destination, "OBSERVATION.json"),
    `${JSON.stringify(PLAYER_RUN_START_OBSERVATION, null, 2)}\n`,
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
  writeFileSync(
    resolve(input.destination, contextFileName(input.contextDelivery)),
    contextText(input.contextDelivery),
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
  writeFileSync(
    resolve(input.destination, contextFileName(input.contextDelivery)),
    contextText(input.contextDelivery),
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
