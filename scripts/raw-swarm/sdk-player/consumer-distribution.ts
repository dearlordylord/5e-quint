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

import { CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS } from "../lane-classification.cjs";
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

const DECLARATION_SERIALIZATION_LENGTH_MESSAGE =
  "The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type annotation is needed.";
const DECLARATION_SERIALIZATION_LENGTH_BASELINE = [
  {
    owner: "packages/battle-runtime/src/battle-reducer/battle-codecs.ts",
    count: 2,
  },
  {
    owner: "packages/battle-runtime/src/battle-mechanical-frontier.ts",
    count: 1,
  },
  {
    owner: "packages/battle-runtime/src/battle-snapshot-presentation.ts",
    count: 1,
  },
  {
    owner:
      "packages/battle-runtime/src/battle-reducer/ongoing-concentration-area-spell.ts",
    count: 1,
  },
  { owner: "packages/surface/src/surface/schema-nonspell.ts", count: 53 },
  { owner: "packages/surface/src/surface/schema-spell.ts", count: 1 },
  { owner: "packages/surface/src/surface/schema.ts", count: 4 },
] as const;

const PUBLIC_DECLARATION_SERIALIZATION_DIAGNOSTIC_CODES = [
  "TS4023",
  "TS4058",
  "TS7056",
] as const;
type PublicDeclarationSerializationDiagnosticCode =
  (typeof PUBLIC_DECLARATION_SERIALIZATION_DIAGNOSTIC_CODES)[number];
export type PublicDeclarationSerializationDiagnosticBaselineEntry = {
  readonly owner: string;
  readonly code: PublicDeclarationSerializationDiagnosticCode;
  readonly message: string;
  readonly count: number;
};

function declarationDiagnosticFingerprintFromParts(
  owner: string,
  code: PublicDeclarationSerializationDiagnosticCode,
  message: string,
): string {
  return `${owner}: error ${code}: ${message}`;
}

export const PUBLIC_DECLARATION_SERIALIZATION_DIAGNOSTIC_BASELINE: readonly PublicDeclarationSerializationDiagnosticBaselineEntry[] =
  DECLARATION_SERIALIZATION_LENGTH_BASELINE.map(
    ({
      owner,
      count,
    }): PublicDeclarationSerializationDiagnosticBaselineEntry => ({
      owner,
      code: "TS7056",
      message: DECLARATION_SERIALIZATION_LENGTH_MESSAGE,
      count,
    }),
  );

function diagnosticCountMap(
  baseline: readonly PublicDeclarationSerializationDiagnosticBaselineEntry[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const { owner, code, message, count } of baseline) {
    const fingerprint = declarationDiagnosticFingerprintFromParts(
      owner,
      code,
      message,
    );
    counts.set(fingerprint, (counts.get(fingerprint) ?? 0) + count);
  }
  return counts;
}

const PINNED_DECLARATION_SERIALIZATION_DIAGNOSTIC_COUNTS = diagnosticCountMap(
  PUBLIC_DECLARATION_SERIALIZATION_DIAGNOSTIC_BASELINE,
);

function publicDeclarationSerializationDiagnosticCode(
  value: string,
): PublicDeclarationSerializationDiagnosticCode | null {
  return (
    PUBLIC_DECLARATION_SERIALIZATION_DIAGNOSTIC_CODES.find(
      (code) => code === value,
    ) ?? null
  );
}

function declarationDiagnosticFingerprint(diagnostic: string): string | null {
  const normalizedRepoRoot = repoRoot.replaceAll("\\", "/");
  const normalizedDiagnostic = diagnostic
    .replaceAll("\\", "/")
    .replaceAll(normalizedRepoRoot, "<repo>");
  const parsed = /^(.*)\(\d+,\d+\): error (TS\d+): (.*)$/.exec(
    normalizedDiagnostic,
  );
  if (parsed === null) return null;
  const [, ownerWithOptionalRoot, code, message] = parsed;
  if (
    ownerWithOptionalRoot === undefined ||
    code === undefined ||
    message === undefined
  ) {
    return null;
  }
  const diagnosticCode = publicDeclarationSerializationDiagnosticCode(code);
  if (diagnosticCode === null) return null;
  const owner = ownerWithOptionalRoot.startsWith("<repo>/")
    ? ownerWithOptionalRoot.slice("<repo>/".length)
    : ownerWithOptionalRoot;
  return declarationDiagnosticFingerprintFromParts(
    owner,
    diagnosticCode,
    message,
  );
}

/** The emitted declaration graph is compilation support, not an unbounded SDK. */
export const PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE = {
  files: 536,
  bytes: 5_710_631,
} as const;
/**
 * The reviewed declaration graph uses every admitted file. Any graph growth
 * must update the exact measure explicitly.
 */
export const PUBLIC_DECLARATION_BUNDLE_MAX_FILES =
  PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE.files;
export const PUBLIC_DECLARATION_BUNDLE_MAX_BYTES = 10 * 1024 * 1024;
export const PUBLIC_DECLARATION_BUNDLE_REVIEWED_BYTE_MARGIN =
  PUBLIC_DECLARATION_BUNDLE_MAX_BYTES -
  PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE.bytes;
export type PublicDeclarationBundleMeasure = {
  readonly files: number;
  readonly bytes: number;
};

export function publicDeclarationDiagnosticBaselineMismatches(
  diagnostics: readonly string[],
): readonly string[] {
  const remainingExpected = new Map(
    PINNED_DECLARATION_SERIALIZATION_DIAGNOSTIC_COUNTS,
  );
  const unexpected = diagnostics.flatMap((diagnostic) => {
    const fingerprint = declarationDiagnosticFingerprint(diagnostic);
    if (fingerprint === null) return [diagnostic];
    const remainingCount = remainingExpected.get(fingerprint);
    if (remainingCount === undefined || remainingCount === 0) {
      return [diagnostic];
    }
    remainingExpected.set(fingerprint, remainingCount - 1);
    return [];
  });
  const missing = [...remainingExpected.entries()].flatMap(
    ([fingerprint, remainingCount]) =>
      remainingCount === 0
        ? []
        : [
            `Missing pinned public declaration diagnostic (${String(remainingCount)} occurrence${remainingCount === 1 ? "" : "s"}): ${fingerprint}`,
          ],
  );
  return [...unexpected, ...missing];
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
  const diagnostics = `${result.stdout}${result.stderr}`
    .split("\n")
    .filter((line) => line.includes("error TS"));
  const diagnosticBaselineMismatches =
    publicDeclarationDiagnosticBaselineMismatches(diagnostics);
  if (
    diagnosticBaselineMismatches.length > 0 ||
    (result.status !== 0 && diagnostics.length === 0)
  ) {
    throw new Error(
      `Public declaration emission failed:\n${diagnosticBaselineMismatches.join("\n") || result.stderr}`,
    );
  }
  if (result.status !== 0) {
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
      resolve(repoRoot, CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS.supervisor),
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
      resolve(repoRoot, CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS.playerClient),
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
        CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS.scenarioCharacterClient,
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
