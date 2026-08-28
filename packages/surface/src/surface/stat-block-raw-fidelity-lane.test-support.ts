import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  discoverSrdStatBlocks,
  type SrdStatBlockSourceOccurrence,
} from "../../../../scripts/srd521-stat-block-parity.ts";

import type { SrdStatBlockRecord } from "./types.ts";
import {
  projectAuthoredStatBlocks,
  projectRawStatBlocks,
} from "./stat-block-raw-projection.test-support.ts";
import { srdStatBlockCollection } from "./stat-block-catalog.ts";
import { normalizeStatBlockIdentity } from "./stat-block-identity.ts";

type RawFidelityLane = {
  readonly source: string;
  readonly equipmentSource: string;
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
  readonly records: readonly SrdStatBlockRecord[];
};

type RawFidelitySourcePath = `.references/srd-5.2.1/${string}`;

const repositoryRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);

const loadRawFidelitySources = (
  sourcePath: RawFidelitySourcePath,
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
  readonly sourcePath: RawFidelitySourcePath;
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
      records,
      equipmentSource,
    ),
  };
};

export const defineRawStatBlockFidelityLane = (config: {
  readonly label: string;
  readonly sourcePath: RawFidelitySourcePath;
  readonly authoredSourcePrefix: string;
  readonly expectedRecordCount: number;
}): RawFidelityLane => {
  const { statBlockSource, equipmentSource, discovery } =
    loadRawFidelitySources(config.sourcePath);
  const records = srdStatBlockCollection.statBlocks.filter((record) =>
    record.provenance.section.startsWith(config.authoredSourcePrefix),
  );
  const rawProjection = (): ReturnType<typeof projectRawStatBlocks> =>
    projectRawStatBlocks(
      statBlockSource,
      discovery.occurrences,
      records,
      equipmentSource,
    );

  describe(`${config.label} independent RAW fidelity`, () => {
    test(`uses every parser-derived canonical ${config.label} source anchor exactly once`, () => {
      const expectedSections = discovery.occurrences.map(
        ({ anchor, name }) => ({
          name: normalizeStatBlockIdentity(name),
          section: anchor.section.replace(".references/srd-5.2.1/", ""),
        }),
      );
      const installedSections = records.map((record) => ({
        name: normalizeStatBlockIdentity(record.name),
        section: record.provenance.section,
      }));

      expect(discovery.issues).toEqual([]);
      expect(expectedSections).toHaveLength(config.expectedRecordCount);
      expect(installedSections).toHaveLength(config.expectedRecordCount);
      expect(new Set(installedSections.map(({ name }) => name)).size).toBe(
        config.expectedRecordCount,
      );
      expect(
        installedSections.sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      ).toEqual(
        expectedSections.sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
    });

    test("matches every scoped general fact and named RAW entry symmetrically", () => {
      expect(discovery.issues).toEqual([]);
      expect(projectAuthoredStatBlocks(records)).toEqual(rawProjection());
    });

    test("keeps projections independent of catalog order", () => {
      const expected = rawProjection();
      fc.assert(
        fc.property(
          fc.shuffledSubarray([...records], {
            minLength: records.length,
            maxLength: records.length,
          }),
          (permutation) => {
            expect(projectAuthoredStatBlocks(permutation)).toEqual(expected);
          },
        ),
        { numRuns: 20 },
      );
    });

    test("rejects named-entry deletion and order mutation", () => {
      const expected = rawProjection();
      const deletionTarget = records.find(
        (record) => (record.statBlock.traits?.length ?? 0) > 1,
      );
      const orderTarget = records.find(
        (record) => (record.statBlock.actions?.length ?? 0) > 1,
      );
      if (deletionTarget?.statBlock.traits === undefined) {
        throw new Error(
          `${config.label} deletion probe requires multiple traits`,
        );
      }
      if (orderTarget?.statBlock.actions === undefined) {
        throw new Error(
          `${config.label} order probe requires multiple actions`,
        );
      }
      const deletedTraitName = deletionTarget.statBlock.traits.at(-1)?.name;
      const retainedTraits = deletionTarget.statBlock.traits.filter(
        (trait) => trait.name !== deletedTraitName,
      );
      const [firstRetainedTrait, ...otherRetainedTraits] = retainedTraits;
      const [firstAction, secondAction, ...otherActions] =
        orderTarget.statBlock.actions;
      if (
        deletedTraitName === undefined ||
        firstRetainedTrait === undefined ||
        firstAction === undefined ||
        secondAction === undefined
      ) {
        throw new Error(
          `${config.label} mutation probe could not resolve named entries`,
        );
      }
      const withoutEntry = records.map((record) =>
        record === deletionTarget
          ? {
              ...record,
              statBlock: {
                ...record.statBlock,
                traits: [firstRetainedTrait, ...otherRetainedTraits] as const,
              },
            }
          : record,
      );
      const swappedEntries = records.map((record) =>
        record === orderTarget
          ? {
              ...record,
              statBlock: {
                ...record.statBlock,
                actions: [secondAction, firstAction, ...otherActions] as const,
              },
            }
          : record,
      );

      expect(projectAuthoredStatBlocks(withoutEntry)).not.toEqual(expected);
      expect(projectAuthoredStatBlocks(swappedEntries)).not.toEqual(expected);
    });
  });

  return {
    source: statBlockSource,
    equipmentSource,
    occurrences: discovery.occurrences,
    records,
  };
};
