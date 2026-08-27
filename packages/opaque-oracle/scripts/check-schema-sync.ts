import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ORACLE_PUBLICATION_ARTIFACTS,
  ORACLE_PUBLICATION_MEMBERS,
} from "../src/oracle-publication.ts";
import { validateOraclePublicationSchemaBytes } from "./oracle-publication-validation.ts";

export function checkOraclePublicationSync(
  publicationDirectory = join(process.cwd(), "publication"),
): readonly string[] {
  const issues: string[] = [];
  let entries: readonly {
    readonly name: string;
    readonly isFile: () => boolean;
  }[];
  try {
    entries = readdirSync(publicationDirectory, { withFileTypes: true });
  } catch (error) {
    issues.push(
      `publication directory cannot be read: ${error instanceof Error ? error.message : String(error)}`,
    );
    return issues;
  }

  const expectedNames = new Set<string>(
    ORACLE_PUBLICATION_MEMBERS.map(
      (member) => ORACLE_PUBLICATION_ARTIFACTS[member].fileName,
    ),
  );
  for (const entry of entries) {
    if (!expectedNames.has(entry.name)) {
      issues.push(`orphan publication entry: ${entry.name}`);
    }
  }

  for (const member of ORACLE_PUBLICATION_MEMBERS) {
    const artifact = ORACLE_PUBLICATION_ARTIFACTS[member];
    const artifactPath = join(publicationDirectory, artifact.fileName);
    const entry = entries.find(
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

    let committedBytes: Buffer;
    try {
      committedBytes = readFileSync(artifactPath);
    } catch (error) {
      issues.push(
        `publication artifact cannot be read (${artifact.fileName}): ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    issues.push(
      ...validateOraclePublicationSchemaBytes(member, committedBytes).issues,
    );
  }

  return issues;
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
