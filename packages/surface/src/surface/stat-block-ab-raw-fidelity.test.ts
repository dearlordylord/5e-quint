import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { statBlockId } from "@dnd/shared/game-facts";

import { discoverSrdStatBlocks } from "../../../../scripts/srd521-stat-block-parity.ts";

import {
  projectAuthoredStatBlocks,
  projectRawStatBlocks,
} from "./stat-block-raw-projection.test-support.ts";
import { srdStatBlockCollection } from "./stat-block-catalog.ts";
import { normalizeStatBlockIdentity } from "./stat-block-identity.ts";

const SOURCE_PATH = ".references/srd-5.2.1/Monsters/Monsters-A-B.md" as const;
const AUTHORED_SOURCE_PREFIX = "Monsters/Monsters-A-B.md:" as const;
const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../../", SOURCE_PATH),
  "utf8",
);
const DISCOVERY = discoverSrdStatBlocks([
  { sourcePath: SOURCE_PATH, contents: SOURCE },
]);
const INSTALLED = srdStatBlockCollection.statBlocks.filter((record) =>
  record.provenance.section.startsWith(AUTHORED_SOURCE_PREFIX),
);

function requireRecord(id: string) {
  const record = srdStatBlockCollection.statBlocks.find(
    (candidate) => candidate.id === statBlockId(id),
  );
  if (record === undefined) {
    throw new Error(`Missing A–B record ${id}`);
  }
  return record;
}

function proficiencyBonus(challengeRating: number): number {
  return 2 + Math.floor(Math.max(0, challengeRating - 1) / 4);
}

describe("A–B independent RAW fidelity", () => {
  test("uses every parser-derived canonical A–B source anchor exactly once", () => {
    const expectedSections = DISCOVERY.occurrences.map(({ anchor, name }) => ({
      name: normalizeStatBlockIdentity(name),
      section: anchor.section.replace(".references/srd-5.2.1/", ""),
    }));
    const installedSections = INSTALLED.map((record) => ({
      name: normalizeStatBlockIdentity(record.name),
      section: record.provenance.section,
    }));

    expect(DISCOVERY.issues).toEqual([]);
    expect(expectedSections).toHaveLength(41);
    expect(installedSections).toHaveLength(41);
    expect(new Set(installedSections.map(({ name }) => name)).size).toBe(41);
    expect(
      installedSections.sort((a, b) => a.name.localeCompare(b.name)),
    ).toEqual(expectedSections.sort((a, b) => a.name.localeCompare(b.name)));
  });

  test("matches every scoped general fact and named RAW entry symmetrically", () => {
    expect(DISCOVERY.issues).toEqual([]);
    expect(projectAuthoredStatBlocks(INSTALLED)).toEqual(
      projectRawStatBlocks(SOURCE, DISCOVERY.occurrences, INSTALLED),
    );
  });

  test("keeps projections independent of catalog order", () => {
    const expected = projectRawStatBlocks(
      SOURCE,
      DISCOVERY.occurrences,
      INSTALLED,
    );

    fc.assert(
      fc.property(
        fc.shuffledSubarray([...INSTALLED], {
          minLength: INSTALLED.length,
          maxLength: INSTALLED.length,
        }),
        (permutation) => {
          expect(projectAuthoredStatBlocks(permutation)).toEqual(expected);
        },
      ),
      { numRuns: 20 },
    );
  });

  test("rejects named-entry deletion and order mutation", () => {
    const expected = projectRawStatBlocks(
      SOURCE,
      DISCOVERY.occurrences,
      INSTALLED,
    );
    const deletionTarget = INSTALLED.find(
      (record) => (record.statBlock.traits?.length ?? 0) > 1,
    );
    const orderTarget = INSTALLED.find(
      (record) => (record.statBlock.actions?.length ?? 0) > 1,
    );
    if (deletionTarget?.statBlock.traits === undefined) {
      throw new Error("A–B deletion probe requires multiple traits");
    }
    if (orderTarget?.statBlock.actions === undefined) {
      throw new Error("A–B order probe requires multiple actions");
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
      throw new Error("A–B mutation probe could not resolve named entries");
    }
    const withoutEntry = INSTALLED.map((record) =>
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
    const swappedEntries = INSTALLED.map((record) =>
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

  test("preserves the repaired RAW traits and attack abilities", () => {
    expect(requireRecord("stat_block_ankheg").statBlock.traits).toEqual([
      {
        name: "Tunneler",
        description:
          "The ankheg can burrow through solid rock at half its Burrow Speed and leaves a 10-foot-diameter tunnel in its wake.",
      },
    ]);
    expect(requireRecord("stat_block_azer_sentinel").statBlock.traits).toEqual([
      {
        name: "Fire Aura",
        description:
          "At the end of each of the azer's turns, each creature of the azer's choice in a 5-foot Emanation originating from the azer takes 5 (1d10) Fire damage unless the azer has the Incapacitated condition.",
      },
      {
        name: "Illumination",
        description:
          "The azer sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet.",
      },
    ]);

    for (const [id, name] of [
      ["stat_block_awakened_shrub", "Rake"],
      ["stat_block_bandit_captain", "Scimitar"],
      ["stat_block_blink_dog", "Bite"],
    ] as const) {
      expect(requireRecord(id).statBlock.actions).toContainEqual(
        expect.objectContaining({
          kind: "executable",
          procedure: expect.objectContaining({
            kind: "attack_roll",
            name,
            attackAbility: "dex",
          }),
        }),
      );
    }
  });

  test("keeps every A–B literal attack bonus aligned with its authored ability", () => {
    const records = srdStatBlockCollection.statBlocks.filter((record) =>
      record.provenance.section.startsWith(AUTHORED_SOURCE_PREFIX),
    );
    const mismatches: string[] = [];
    const sections = ["actions", "bonusActions", "reactions"] as const;

    for (const record of records) {
      for (const section of sections) {
        for (const entry of record.statBlock[section] ?? []) {
          if (
            entry.kind !== "executable" ||
            entry.procedure.kind !== "attack_roll" ||
            entry.procedure.attackBonus.kind !== "literal"
          ) {
            continue;
          }
          const abilityModifier = Math.floor(
            (record.statBlock.abilityScores[entry.procedure.attackAbility] -
              10) /
              2,
          );
          const expected =
            abilityModifier + proficiencyBonus(record.challengeRating);
          if (entry.procedure.attackBonus.value !== expected) {
            mismatches.push(
              `${record.name}/${entry.procedure.name}: ${entry.procedure.attackAbility} implies ${expected}, authored ${entry.procedure.attackBonus.value}`,
            );
          }
        }
      }
    }

    expect(records).toHaveLength(41);
    expect(mismatches).toEqual([]);
  });
});
