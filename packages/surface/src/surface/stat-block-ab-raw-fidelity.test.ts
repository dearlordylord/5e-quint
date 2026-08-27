import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { statBlockId } from "@dnd/shared/game-facts";

import { discoverSrdStatBlocks } from "../../../../scripts/srd521-stat-block-parity.ts";

import { srdStatBlockCollection } from "./stat-block-catalog.ts";
import { normalizeStatBlockIdentity } from "./stat-block-identity.ts";

const SOURCE_PATH = ".references/srd-5.2.1/Monsters/Monsters-A-B.md" as const;
const AUTHORED_SOURCE_PREFIX = "Monsters/Monsters-A-B.md:" as const;

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
    const discovery = discoverSrdStatBlocks([
      {
        sourcePath: SOURCE_PATH,
        contents: readFileSync(
          join(
            dirname(fileURLToPath(import.meta.url)),
            "../../../../",
            SOURCE_PATH,
          ),
          "utf8",
        ),
      },
    ]);
    const installed = srdStatBlockCollection.statBlocks.filter((record) =>
      record.provenance.section.startsWith(AUTHORED_SOURCE_PREFIX),
    );
    const expectedSections = discovery.occurrences.map(({ anchor, name }) => ({
      name: normalizeStatBlockIdentity(name),
      section: anchor.section.replace(".references/srd-5.2.1/", ""),
    }));
    const installedSections = installed.map((record) => ({
      name: normalizeStatBlockIdentity(record.name),
      section: record.provenance.section,
    }));

    expect(discovery.issues).toEqual([]);
    expect(expectedSections).toHaveLength(41);
    expect(installedSections).toHaveLength(41);
    expect(new Set(installedSections.map(({ name }) => name)).size).toBe(41);
    expect(
      installedSections.sort((a, b) => a.name.localeCompare(b.name)),
    ).toEqual(expectedSections.sort((a, b) => a.name.localeCompare(b.name)));
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
