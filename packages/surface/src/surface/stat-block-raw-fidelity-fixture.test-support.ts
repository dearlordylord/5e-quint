import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverSrdStatBlocks } from "../../../../scripts/srd521-stat-block-parity.ts";

import type { SrdStatBlockSourceOccurrence } from "./stat-block-parity-observation.ts";
import type { SrdStatBlockRecord } from "./types.ts";
import { projectRawStatBlocks } from "./stat-block-raw-projection.test-support.ts";
import { srdStatBlockCollection } from "./stat-block-catalog.ts";
import { normalizeStatBlockIdentity } from "./stat-block-identity.ts";

type RawStatBlockSourceFixture = {
  readonly source: string;
  readonly equipmentSource: string;
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
  readonly records: readonly SrdStatBlockRecord[];
};

type RawStatBlockSourcePath = `.references/srd-5.2.1/${string}`;

const repositoryRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);

const loadRawFidelitySources = (
  sourcePath: RawStatBlockSourcePath,
): {
  readonly statBlockSource: string;
  readonly equipmentSource: string;
  readonly discovery: ReturnType<typeof discoverSrdStatBlocks>;
} => {
  const statBlockSource = readFileSync(
    join(repositoryRoot, sourcePath),
    "utf8",
  );
  const equipmentSource = readFileSync(
    join(repositoryRoot, ".references/srd-5.2.1/Equipment.md"),
    "utf8",
  );
  return {
    statBlockSource,
    equipmentSource,
    discovery: discoverSrdStatBlocks([
      { sourcePath, contents: statBlockSource },
    ]),
  };
};

export const projectRawStatBlockSourceOccurrences = (config: {
  readonly sourcePath: RawStatBlockSourcePath;
  readonly names: readonly string[];
}): {
  readonly statBlockSource: string;
  readonly equipmentSource: string;
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
  readonly records: readonly SrdStatBlockRecord[];
  readonly projection: ReturnType<typeof projectRawStatBlocks>;
} => {
  const { statBlockSource, equipmentSource, discovery } =
    loadRawFidelitySources(config.sourcePath);
  if (discovery.issues.length > 0) {
    throw new Error(
      `Unable to reconcile ${config.sourcePath}: ${JSON.stringify(discovery.issues)}`,
    );
  }
  const names = new Set(config.names.map(normalizeStatBlockIdentity));
  const occurrences = discovery.occurrences.filter((occurrence) =>
    names.has(normalizeStatBlockIdentity(occurrence.name)),
  );
  const records = srdStatBlockCollection.statBlocks.filter((record) =>
    names.has(normalizeStatBlockIdentity(record.name)),
  );
  return {
    statBlockSource,
    equipmentSource,
    occurrences,
    records,
    projection: projectRawStatBlocks(
      statBlockSource,
      occurrences,
      equipmentSource,
    ),
  };
};

export const loadRawStatBlockSourceFixture = (
  sourcePath: RawStatBlockSourcePath,
): RawStatBlockSourceFixture => {
  const { statBlockSource, equipmentSource, discovery } =
    loadRawFidelitySources(sourcePath);
  if (discovery.issues.length > 0) {
    throw new Error(
      `Unable to load ${sourcePath}: ${JSON.stringify(discovery.issues)}`,
    );
  }
  const identities = new Set(
    discovery.occurrences.map(({ name }) => normalizeStatBlockIdentity(name)),
  );
  const records = srdStatBlockCollection.statBlocks.filter((record) =>
    identities.has(normalizeStatBlockIdentity(record.name)),
  );

  return {
    source: statBlockSource,
    equipmentSource,
    occurrences: discovery.occurrences,
    records,
  };
};
