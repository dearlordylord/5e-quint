import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ORACLE_PUBLICATION_ARTIFACTS,
  ORACLE_PUBLICATION_MEMBERS,
  isOraclePublicationArtifactFileName,
} from "../src/oracle-publication.ts";
import {
  formatOraclePublicationValidation,
  validateOraclePublicationSchemaBytes,
} from "./oracle-publication-validation.ts";
import { Result } from "effect";

type PublicationDirectoryEntry = {
  readonly name: string;
  readonly isFile: () => boolean;
};

export function checkOraclePublicationSync(
  publicationDirectory = join(process.cwd(), "publication"),
): readonly string[] {
  const issues: string[] = [];
  const entries = readPublicationDirectory(publicationDirectory);
  if (Result.isFailure(entries)) {
    issues.push(
      `publication directory cannot be read: ${safeErrorMessage(entries.failure)}`,
    );
    return issues;
  }

  for (const entry of entries.success) {
    if (!isOraclePublicationArtifactFileName(entry.name)) {
      issues.push(`orphan publication entry: ${entry.name}`);
    }
  }

  for (const member of ORACLE_PUBLICATION_MEMBERS) {
    const artifact = ORACLE_PUBLICATION_ARTIFACTS[member];
    const artifactPath = join(publicationDirectory, artifact.fileName);
    const entry = entries.success.find(
      (candidate) => candidate.name === artifact.fileName,
    );
    if (entry === undefined) {
      issues.push(`missing publication artifact: ${artifact.fileName}`);
      continue;
    }
    if (!entry.isFile()) {
      issues.push(`publication artifact is not a file: ${artifact.fileName}`);
      continue;
    }

    const committedBytes = readPublicationArtifact(artifactPath);
    if (Result.isFailure(committedBytes)) {
      issues.push(
        `publication artifact cannot be read (${artifact.fileName}): ${safeErrorMessage(committedBytes.failure)}`,
      );
      continue;
    }
    issues.push(
      ...formatOraclePublicationValidation(
        validateOraclePublicationSchemaBytes(member, committedBytes.success),
      ),
    );
  }

  return issues;
}

function readPublicationDirectory(
  publicationDirectory: string,
): Result.Result<readonly PublicationDirectoryEntry[], unknown> {
  try {
    return Result.succeed(
      readdirSync(publicationDirectory, { withFileTypes: true }),
    );
  } catch (cause) {
    return Result.fail(cause);
  }
}

function readPublicationArtifact(
  artifactPath: string,
): Result.Result<Buffer, unknown> {
  try {
    return Result.succeed(readFileSync(artifactPath));
  } catch (cause) {
    return Result.fail(cause);
  }
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function run(): void {
  const issues = checkOraclePublicationSync();
  if (issues.length > 0) {
    for (const issue of issues)
      console.error(`Opaque Oracle schema sync: ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log("Opaque Oracle schema publication is synchronized.");
}

const invokedScript = process.argv[1];
if (
  invokedScript !== undefined &&
  import.meta.url === pathToFileURL(invokedScript).href
) {
  run();
}
