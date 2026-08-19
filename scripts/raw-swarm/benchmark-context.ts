import { readdirSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";

import { capabilityContextForRole } from "./capability-projection.ts";
import { emitPublicDeclarations } from "./sdk-player/consumer-distribution.ts";
import { repoRoot } from "./transcript.ts";

/** The model-facing roles retained by every fixed benchmark profile. */
export const BENCHMARK_CONTEXT_ROLES = [
  "scenarioGeneration",
  "scenarioReview",
  "characterAuthoring",
  "setupAuthoring",
  "player",
  "postPlayReview",
] as const;
export type BenchmarkContextRole = (typeof BENCHMARK_CONTEXT_ROLES)[number];

export const BENCHMARK_CONTEXT_PROFILES = [
  "documentDeclarationSet",
  "boundedCapabilityProjection",
] as const;
export type BenchmarkContextProfile =
  (typeof BENCHMARK_CONTEXT_PROFILES)[number];

type CapabilityContextRole = Parameters<typeof capabilityContextForRole>[0];

const HISTORICAL_SDK_CAPABILITY_DOCUMENTS = [
  {
    label: "SCENARIO_CHARACTERS.md",
    path: "scripts/raw-swarm/sdk-player/SCENARIO_CHARACTERS.md",
  },
  {
    label: "CHARACTER_CREATION_SDK.md",
    path: "packages/character-creation-runtime/README.md",
  },
  {
    label: "CHARACTER_SHEET_SDK.md",
    path: "packages/character-sheet-runtime/README.md",
  },
  {
    label: "@dnd/scenario-character-sdk public contract",
    path: "scripts/raw-swarm/sdk-player/scenario-character-contract.ts",
  },
  {
    label: "SCENARIO_SETUP.md",
    path: "scripts/raw-swarm/sdk-player/SCENARIO_SETUP.md",
  },
  {
    label: "@dnd/scenario-setup-sdk public contract",
    path: "scripts/raw-swarm/sdk-player/scenario-setup-contract.ts",
  },
  {
    label: "PLAYER.md",
    path: "scripts/raw-swarm/sdk-player/PLAYER.md",
  },
  {
    label: "@dnd/player-sdk public contract",
    path: "scripts/raw-swarm/sdk-player/continuation-contract.ts",
  },
  {
    label: "PUBLIC_SDK.md",
    path: "packages/battle-runtime/README.md",
  },
] as const;

let declarationBundleCache: string | undefined;

function declarationFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return declarationFiles(path);
    return entry.isFile() && entry.name.endsWith(".d.ts") ? [path] : [];
  });
}

/** Emit the exact declaration bundle retained by the historical profile. */
export function historicalDeclarationBundleText(): string {
  if (declarationBundleCache !== undefined) return declarationBundleCache;
  const scratch = mkdtempSync(
    resolve(tmpdir(), "dnd-fixed-benchmark-declarations-"),
  );
  const declarations = resolve(scratch, "declarations");
  try {
    emitPublicDeclarations(scratch);
    declarationBundleCache = declarationFiles(declarations)
      .map((path) => {
        const label = relative(scratch, path);
        return "\n--- " + label + " ---\n" + readFileSync(path, "utf8");
      })
      .sort()
      .join("\n");
    return declarationBundleCache;
  } finally {
    rmSync(scratch, { recursive: true });
  }
}

function historicalDocumentSetText(): string {
  return HISTORICAL_SDK_CAPABILITY_DOCUMENTS.map(
    ({ label, path }) =>
      "## " + label + "\n\n" + readFileSync(resolve(repoRoot, path), "utf8"),
  ).join("\n\n");
}

function capabilityRoleForBenchmarkRole(
  role: BenchmarkContextRole,
): CapabilityContextRole {
  if (role === "scenarioGeneration") return "generation";
  if (role === "scenarioReview" || role === "postPlayReview") return "review";
  return role;
}

/** Construct the historical document/declaration context for one role. */
export function historicalDocumentDeclarationContextForRole(
  role: BenchmarkContextRole,
  declarationBundle = historicalDeclarationBundleText(),
): string {
  return [
    "Raw Swarm fixed benchmark document declaration set",
    "Role: " + role,
    "Current public SDK capability documentation:",
    historicalDocumentSetText(),
    "Full emitted public declaration bundle (compiler-readable declarations only):",
    declarationBundle,
  ].join("\n\n");
}

/** Construct the one canonical context byte sequence for a role and profile. */
export function benchmarkContextForRole(
  profile: BenchmarkContextProfile,
  role: BenchmarkContextRole,
  declarationBundle?: string,
): string {
  return profile === "documentDeclarationSet"
    ? historicalDocumentDeclarationContextForRole(role, declarationBundle)
    : capabilityContextForRole(capabilityRoleForBenchmarkRole(role));
}
