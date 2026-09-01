import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { buildSync, type BuildOptions, type BuildResult } from "esbuild";

import {
  validatedPackageEffectCompilerSupportDirectories,
  validatedPackageEffectRuntimeEntries,
} from "#dnd-package-effect-runtime";
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

/** The emitted declaration graph is compilation support, not an unbounded SDK. */
export const PUBLIC_DECLARATION_BUNDLE_REVIEWED_MANIFEST = {
  comparisonBaseline: {
    commit: "993cb0b11152316f8bd7e16693366267bf2ee16d",
    files: 530,
    bytes: 4_667_450,
    pathLedgerSha256:
      "fd48241ce438eb0f780a8fc8bfaf0035af6f4d0c686f2590dbe965420794083e",
  },
  measure: {
    files: 571,
    bytes: 10_299_610,
  },
  pathLedgerSha256:
    "4787fdc0e574cd519f4d3c20dcdd08031fa8ac0777acd0935474199866b20ed6",
  contentLedgerSha256:
    "159c1666a4f2d99b4ee37e54f56034f0722ad6b9432875e3647cd3d8a61d1927",
} as const;
export const PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE =
  PUBLIC_DECLARATION_BUNDLE_REVIEWED_MANIFEST.measure;
/** Coarse safety ceiling, independent of the exact reviewed manifest. */
export const PUBLIC_DECLARATION_BUNDLE_MAX_FILES = 1_000;
export const PUBLIC_DECLARATION_BUNDLE_MAX_BYTES = 10 * 1024 * 1024;
export const PUBLIC_DECLARATION_BUNDLE_REVIEWED_BYTE_MARGIN =
  PUBLIC_DECLARATION_BUNDLE_MAX_BYTES -
  PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE.bytes;
export const PUBLIC_DECLARATION_BUNDLE_FORBIDDEN_PATHS = [
  "packages/surface/src/surface/catalog-install.d.ts",
  "packages/surface/src/surface/generated/srd-stat-block-aggregate.d.ts",
  "packages/surface/src/surface/portable-surface.d.ts",
  "packages/surface/src/surface/stat-block-catalog-core.d.ts",
  "packages/surface/src/surface/stat-block-catalog-data.d.ts",
  "packages/surface/src/surface/stat-block-catalog.d.ts",
  "packages/surface/src/surface/stat-block-identity.d.ts",
] as const;

export const EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST = {
  versions: {
    effect: "4.0.0-rc.112",
    "fast-check": "4.9.0",
    msgpackr: "2.1.0",
    "pure-rand": "8.4.2",
  },
  files: 498,
  bytes: 10_598_459,
  pathLedgerSha256:
    "01e202db91ee798780a0dd9af282f2281895d34f70c87f203b189c44cf7db6ef",
  contentLedgerSha256:
    "b1df9fbfcd1513fcb19cbcd37c100a008a906f97ea622c9941c60eabe94b4560",
} as const;
export type PublicDeclarationBundleMeasure = {
  readonly files: number;
  readonly bytes: number;
};

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

function declarationPathLedgerSha256(
  directory: string,
  files: readonly string[],
): string {
  const root = realpathSync(directory);
  const ledger = files
    .map((path) => relative(root, path).split(sep).join("/"))
    .sort()
    .join("\n");
  return createHash("sha256").update(`${ledger}\n`).digest("hex");
}

function declarationContentLedgerSha256(
  directory: string,
  files: readonly string[],
): string {
  const root = realpathSync(directory);
  const ledger = files
    .map((path) => {
      const relativePath = relative(root, path).split(sep).join("/");
      const fileSha256 = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
      return `${relativePath}\t${fileSha256}`;
    })
    .sort()
    .join("\n");
  return createHash("sha256").update(`${ledger}\n`).digest("hex");
}

function compilerSupportFiles(directory: string): readonly string[] {
  const root = realpathSync(directory);
  const visit = (current: string): readonly string[] =>
    readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Effect declaration compiler support cannot contain a symbolic link: ${relative(root, path)}.`,
        );
      }
      if (entry.isDirectory()) return visit(path);
      if (!entry.isFile()) {
        throw new Error(
          `Effect declaration compiler support contains an unsupported entry: ${relative(root, path)}.`,
        );
      }
      const relativePath = relative(root, path).split(sep).join("/");
      const [packageName, ...packageRelativeParts] = relativePath.split("/");
      const packageRelativePath = packageRelativeParts.join("/");
      if (
        packageName === undefined ||
        !(
          packageName in EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.versions
        ) ||
        (packageRelativePath !== "LICENSE" &&
          packageRelativePath !== "package.json" &&
          !packageRelativePath.endsWith(".d.ts") &&
          !packageRelativePath.endsWith(".d.cts"))
      ) {
        throw new Error(
          `Effect declaration compiler support contains a non-declaration artifact: ${relativePath}.`,
        );
      }
      return [path];
    });
  return visit(directory);
}

export function assertEffectDeclarationCompilerSupport(
  directory: string,
): void {
  const files = compilerSupportFiles(directory);
  const versions = Object.fromEntries(
    Object.keys(EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.versions).map(
      (packageName) => {
        const packageManifest: unknown = JSON.parse(
          readFileSync(resolve(directory, packageName, "package.json"), "utf8"),
        );
        return [
          packageName,
          typeof packageManifest === "object" &&
          packageManifest !== null &&
          "version" in packageManifest &&
          typeof packageManifest.version === "string"
            ? packageManifest.version
            : undefined,
        ];
      },
    ),
  );
  const bytes = files.reduce((total, path) => total + lstatSync(path).size, 0);
  const pathLedgerSha256 = declarationPathLedgerSha256(directory, files);
  const contentLedgerSha256 = declarationContentLedgerSha256(directory, files);
  if (
    JSON.stringify(versions) !==
      JSON.stringify(EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.versions) ||
    files.length !== EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.files ||
    bytes !== EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.bytes ||
    pathLedgerSha256 !==
      EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.pathLedgerSha256 ||
    contentLedgerSha256 !==
      EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.contentLedgerSha256
  ) {
    throw new Error(
      `Effect declaration compiler support differs from the validated package cohort manifest: expected versions ${JSON.stringify(EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.versions)}, ${String(EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.files)} files, ${String(EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.bytes)} bytes, path ledger ${EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.pathLedgerSha256}, and content ledger ${EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.contentLedgerSha256}; received versions ${JSON.stringify(versions)}, ${String(files.length)} files, ${String(bytes)} bytes, path ledger ${pathLedgerSha256}, and content ledger ${contentLedgerSha256}.`,
    );
  }
}

export function copyEffectDeclarationCompilerSupport(
  destination: string,
): void {
  const sources = validatedPackageEffectCompilerSupportDirectories(
    CONSUMER_DISTRIBUTION_EFFECT_RUNTIME_OWNERS,
  );
  const cohortTarget = resolve(destination, "node_modules");
  const copyDeclarations = (
    sourcePackage: string,
    sourceDirectory: string,
    targetPackage: string,
  ): void => {
    for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
      const sourcePath = resolve(sourceDirectory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Validated Effect declaration source cannot contain a symbolic link: ${sourcePath}.`,
        );
      }
      if (entry.isDirectory()) {
        copyDeclarations(sourcePackage, sourcePath, targetPackage);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".d.ts") || entry.name.endsWith(".d.cts"))
      ) {
        const targetPath = resolve(
          targetPackage,
          relative(sourcePackage, sourcePath),
        );
        mkdirSync(resolve(targetPath, ".."), { recursive: true });
        copyFileSync(sourcePath, targetPath);
      }
    }
  };
  for (const packageName of [
    "effect",
    "fast-check",
    "msgpackr",
    "pure-rand",
  ] as const) {
    const source = sources[packageName];
    const target = resolve(cohortTarget, packageName);
    mkdirSync(target, { recursive: true });
    for (const fileName of ["LICENSE", "package.json"] as const) {
      copyFileSync(resolve(source, fileName), resolve(target, fileName));
    }
    copyDeclarations(source, source, target);
  }
  assertEffectDeclarationCompilerSupport(cohortTarget);
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

function assertReviewedPublicDeclarationBundle(
  directory: string,
): PublicDeclarationBundleMeasure {
  const measure = assertPublicDeclarationBundle(directory);
  const files = declarationFiles(directory);
  const pathLedgerSha256 = declarationPathLedgerSha256(directory, files);
  const contentLedgerSha256 = declarationContentLedgerSha256(directory, files);
  if (
    measure.files !== PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE.files ||
    measure.bytes !== PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE.bytes ||
    pathLedgerSha256 !==
      PUBLIC_DECLARATION_BUNDLE_REVIEWED_MANIFEST.pathLedgerSha256 ||
    contentLedgerSha256 !==
      PUBLIC_DECLARATION_BUNDLE_REVIEWED_MANIFEST.contentLedgerSha256
  ) {
    throw new Error(
      `Public declaration bundle differs from the reviewed manifest: expected ${String(PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE.files)} files, ${String(PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE.bytes)} bytes, path ledger ${PUBLIC_DECLARATION_BUNDLE_REVIEWED_MANIFEST.pathLedgerSha256}, and content ledger ${PUBLIC_DECLARATION_BUNDLE_REVIEWED_MANIFEST.contentLedgerSha256}; received ${String(measure.files)} files, ${String(measure.bytes)} bytes, path ledger ${pathLedgerSha256}, and content ledger ${contentLedgerSha256}.`,
    );
  }
  return measure;
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
  if (
    result.status !== 0 ||
    result.stdout.length > 0 ||
    result.stderr.length > 0
  ) {
    throw new Error(
      `Public declaration emission failed:\n${result.stdout}${result.stderr}`,
    );
  }
  copyFileSync(
    resolve(repoRoot, "packages/shared/src/non-empty-array.d.ts"),
    resolve(declarationsDirectory, "packages/shared/src/non-empty-array.d.ts"),
  );

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
    "packages/character-creation-runtime/src/phase1-manifest.d.ts",
    "packages/character-sheet-runtime/src/index.d.ts",
    "packages/shared/src/non-empty-array.d.ts",
    "packages/tactical-space/src/index.d.ts",
  ];
  for (const relativePath of requiredDeclarations) {
    if (!existsSync(resolve(declarationsDirectory, relativePath))) {
      throw new Error(`Public declaration emission omitted ${relativePath}.`);
    }
  }
  const phaseOneWeaponExports = readFileSync(
    resolve(
      declarationsDirectory,
      "packages/character-creation-runtime/src/phase1-manifest.d.ts",
    ),
    "utf8",
  );
  for (const exportName of [
    "PHASE1_WEAPON_FLAIL_UNIT_ID",
    "PHASE1_WEAPON_SPEAR_UNIT_ID",
  ] as const) {
    if (
      !phaseOneWeaponExports.includes(`export declare const ${exportName}:`)
    ) {
      throw new Error(
        `Public declaration emission omitted Character Creation export ${exportName}.`,
      );
    }
  }
  for (const relativePath of PUBLIC_DECLARATION_BUNDLE_FORBIDDEN_PATHS) {
    if (existsSync(resolve(declarationsDirectory, relativePath))) {
      throw new Error(
        `Public declaration emission included forbidden runtime/data owner ${relativePath}.`,
      );
    }
  }
  return assertReviewedPublicDeclarationBundle(declarationsDirectory);
}

const DECLARATION_PACKAGE_PATH_ROOTS = [
  {
    specifierPrefix: "@dnd/shared/",
    declarationRoot: "packages/shared/src",
  },
  {
    specifierPrefix: "@dnd/shared-algebras/",
    declarationRoot: "packages/shared-algebras/src",
  },
  {
    specifierPrefix: "@dnd/surface/",
    declarationRoot: "packages/surface/src",
  },
] as const;

function compilerDeclarationPackagePaths(
  baseDirectory: string,
): Readonly<Record<string, readonly [string]>> {
  const declarationsDirectory = resolve(baseDirectory, "declarations");
  const specifiers = new Set<string>();
  for (const path of declarationFiles(declarationsDirectory)) {
    for (const match of readFileSync(path, "utf8").matchAll(
      /["'](@dnd\/(?:shared|shared-algebras|surface)\/[^"']+)["']/g,
    )) {
      const specifier = match[1];
      if (specifier !== undefined) specifiers.add(specifier);
    }
  }
  return Object.fromEntries(
    [...specifiers].sort().map((specifier) => {
      const owner = DECLARATION_PACKAGE_PATH_ROOTS.find(({ specifierPrefix }) =>
        specifier.startsWith(specifierPrefix),
      );
      if (owner === undefined) {
        throw new Error(
          `Public declaration compiler path has no package owner: ${specifier}.`,
        );
      }
      const sourceSubpath = specifier.slice(owner.specifierPrefix.length);
      const declarationSubpath = sourceSubpath.endsWith(".d.ts")
        ? sourceSubpath
        : `${sourceSubpath.replace(/\.(?:js|ts)$/, "")}.d.ts`;
      const declarationTarget = resolve(
        declarationsDirectory,
        owner.declarationRoot,
        declarationSubpath,
      );
      if (!existsSync(declarationTarget)) {
        throw new Error(
          `Public declaration compiler path target does not exist: ${specifier} -> ${declarationSubpath}.`,
        );
      }
      return [
        specifier,
        [`./declarations/${owner.declarationRoot}/${declarationSubpath}`],
      ];
    }),
  );
}

function consumerTsconfig(
  baseDirectory: string,
  include: readonly string[],
): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        lib: ["ES2022", "ESNext.Disposable", "DOM", "DOM.Iterable"],
        types: [],
        baseUrl: ".",
        paths: {
          "@dnd/player-sdk": [
            "./declarations/scripts/raw-swarm/sdk-player/consumer-entry.d.ts",
          ],
          "@dnd/scenario-character-sdk": [
            "./declarations/scripts/raw-swarm/sdk-player/scenario-character-contract.d.ts",
          ],
          "@dnd/scenario-setup-sdk": [
            "./declarations/scripts/raw-swarm/sdk-player/scenario-setup-contract.d.ts",
          ],
          "@dnd/battle-runtime": [
            "./declarations/packages/battle-runtime/src/index.d.ts",
          ],
          "@dnd/character-creation-runtime": [
            "./declarations/packages/character-creation-runtime/src/index.d.ts",
          ],
          "@dnd/character-sheet-runtime": [
            "./declarations/packages/character-sheet-runtime/src/index.d.ts",
          ],
          ...compilerDeclarationPackagePaths(baseDirectory),
          "@dnd/tactical-space": [
            "./declarations/packages/tactical-space/src/index.d.ts",
          ],
        },
        allowImportingTsExtensions: true,
        skipLibCheck: false,
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

const CONSUMER_DISTRIBUTION_EFFECT_RUNTIME_OWNERS = [
  "surface",
  "battle-runtime",
] as const satisfies Parameters<typeof validatedPackageEffectRuntimeEntries>[0];

type ConsumerDistributionBundleOptions = Pick<
  BuildOptions,
  "entryPoints" | "stdin" | "sourcemap" | "logLevel"
> & {
  readonly outfile: string;
  readonly bundle: true;
  readonly platform: "node";
  readonly format: "esm";
  readonly target: "node24";
};

const PACKAGE_EFFECT_RUNTIME_MODULE_SPECIFIER = "#dnd-package-effect-runtime";

export function buildConsumerDistributionBundle(
  options: ConsumerDistributionBundleOptions,
): BuildResult {
  const runtimeEntries = validatedPackageEffectRuntimeEntries(
    CONSUMER_DISTRIBUTION_EFFECT_RUNTIME_OWNERS,
  );
  const runtimeModuleContents = `import * as effect from ${JSON.stringify(runtimeEntries.effectEntry)};
import * as schemaAst from ${JSON.stringify(runtimeEntries.schemaAstEntry)};
const validatedPackageEffectOwners = new Set(${JSON.stringify(CONSUMER_DISTRIBUTION_EFFECT_RUNTIME_OWNERS)});
export const effectRuntimeForPackageOwners = (packageOwners) => {
  if (!Array.isArray(packageOwners) || packageOwners.length === 0) {
    throw new Error("Package Effect runtime owners must be a non-empty array.");
  }
  for (const owner of packageOwners) {
    if (!validatedPackageEffectOwners.has(owner)) {
      throw new Error(\`Unknown package Effect runtime owner: \${String(owner)}.\`);
    }
  }
  return { effect, schemaAst };
};
`;
  const substitutionDirectory = mkdtempSync(
    join(tmpdir(), "dnd-package-effect-runtime-bundle-"),
  );
  const substitutionPath = join(substitutionDirectory, "runtime.js");
  try {
    writeFileSync(substitutionPath, runtimeModuleContents, "utf8");
    return buildSync({
      ...(options.entryPoints === undefined
        ? {}
        : { entryPoints: options.entryPoints }),
      ...(options.stdin === undefined ? {} : { stdin: options.stdin }),
      ...(options.sourcemap === undefined
        ? {}
        : { sourcemap: options.sourcemap }),
      ...(options.logLevel === undefined ? {} : { logLevel: options.logLevel }),
      outfile: options.outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node24",
      packages: "bundle",
      external: [],
      alias: { [PACKAGE_EFFECT_RUNTIME_MODULE_SPECIFIER]: substitutionPath },
    });
  } finally {
    rmSync(substitutionDirectory, { recursive: true, force: true });
  }
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
  copyEffectDeclarationCompilerSupport(input.destination);
  copyEffectDeclarationCompilerSupport(input.trustedDestination);
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
    consumerTsconfig(input.trustedDestination, ["attempt.ts"]),
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
  buildConsumerDistributionBundle({
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
  buildConsumerDistributionBundle({
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
  copyEffectDeclarationCompilerSupport(input.destination);
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
  copyEffectDeclarationCompilerSupport(input.destination);
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
