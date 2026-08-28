import {
  chmodSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, parse, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Either } from "effect";
import { buildSync } from "esbuild";

import {
  computeOracleDistributionId,
  ORACLE_DISTRIBUTION_FILE_NAMES,
  serializeOracleDistributionIdentity,
} from "../src/oracle-distribution.ts";
import {
  ORACLE_PUBLICATION_ARTIFACTS,
  ORACLE_PUBLICATION_MEMBERS,
  type OraclePublicationMember,
} from "../src/oracle-publication.ts";
import { buildOracleStartupCatalog } from "../src/oracle-startup-catalog.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");

export const DEFAULT_DISTRIBUTION_DIRECTORY = resolve(packageRoot, "dist");
export const DEFAULT_DISTRIBUTION_ENTRYPOINT = resolve(
  packageRoot,
  "src/oracle-main.ts",
);

export type OracleDistributionBuildOptions = {
  readonly destination?: string;
  /** Test-only entrypoint seam; production always uses the canonical bootstrap. */
  readonly entryPoint?: string;
};

export type OracleDistributionBuildResult = {
  readonly destination: string;
  readonly executablePath: string;
  readonly distributionId: ReturnType<typeof computeOracleDistributionId>;
};

/**
 * Build one source-free, deterministic distribution root. The executable is
 * bundled before its identity metadata is written, keeping that metadata out
 * of the digest preimage.
 */
export function buildOracleDistribution(
  options: OracleDistributionBuildOptions = {},
): OracleDistributionBuildResult {
  const destination = resolve(
    options.destination ?? DEFAULT_DISTRIBUTION_DIRECTORY,
  );
  assertSafeDestination(destination);
  const entryPoint = resolve(
    options.entryPoint ?? DEFAULT_DISTRIBUTION_ENTRYPOINT,
  );
  const startup = buildOracleStartupCatalog();
  if (Either.isLeft(startup)) {
    throw new Error(
      `Oracle startup catalog failed: ${JSON.stringify(startup.left)}`,
    );
  }

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  const executablePath = resolve(
    destination,
    ORACLE_DISTRIBUTION_FILE_NAMES.executable,
  );
  buildSync({
    entryPoints: [entryPoint],
    outfile: executablePath,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    minify: true,
    sourcemap: false,
    legalComments: "none",
    charset: "utf8",
    treeShaking: true,
    absWorkingDir: repositoryRoot,
    logLevel: "silent",
  });
  const executableBody = readFileSync(executablePath, "utf8").replace(
    /^\/\/[^\n]*\n/gm,
    "",
  );
  writeFileSync(executablePath, `#!/usr/bin/env node\n${executableBody}`, {
    mode: 0o755,
  });
  chmodSync(executablePath, 0o755);

  const projectionPath = resolve(
    destination,
    ORACLE_DISTRIBUTION_FILE_NAMES.projection,
  );
  writeFileSync(projectionPath, startup.right.projectionBytes, { mode: 0o644 });
  const schemas = writePublicationArtifacts(destination);
  const executable = readFileSync(executablePath);
  const projection = readFileSync(projectionPath);
  const distributionId = computeOracleDistributionId({
    executable,
    schemas,
    projection,
  });
  writeFileSync(
    resolve(destination, ORACLE_DISTRIBUTION_FILE_NAMES.identity),
    serializeOracleDistributionIdentity({ distributionId }),
    { mode: 0o644 },
  );
  return { destination, executablePath, distributionId };
}

function writePublicationArtifacts(
  destination: string,
): Record<OraclePublicationMember, Uint8Array> {
  const schemas: Record<OraclePublicationMember, Uint8Array> = {
    case: new Uint8Array(0),
    trace: new Uint8Array(0),
    evaluationBatch: new Uint8Array(0),
  };
  for (const member of ORACLE_PUBLICATION_MEMBERS) {
    const artifact = ORACLE_PUBLICATION_ARTIFACTS[member];
    const path = resolve(destination, artifact.fileName);
    writeFileSync(path, artifact.bytes, { mode: 0o644 });
    schemas[member] = new Uint8Array(artifact.bytes);
  }
  return schemas;
}

function assertSafeDestination(destination: string): void {
  const filesystemRoot = parse(destination).root;
  if (
    destination === filesystemRoot ||
    destination === repositoryRoot ||
    destination === packageRoot ||
    destination === dirname(repositoryRoot)
  ) {
    throw new Error("Refusing to replace a repository or package root.");
  }
}

function runCli(): void {
  const destination = process.argv[2];
  const result = buildOracleDistribution(
    destination === undefined ? {} : { destination },
  );
  process.stdout.write(
    `opaque-oracle distribution ${result.distributionId} -> ${result.destination}\n`,
  );
}

const invokedScript = process.argv[1];
if (
  invokedScript !== undefined &&
  pathToFileURL(invokedScript).href === import.meta.url
) {
  try {
    runCli();
  } catch (cause) {
    process.stderr.write(
      `opaque-oracle distribution build failed: ${String(cause)}\n`,
    );
    process.exitCode = 1;
  }
}
