import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { discoverSrdStatBlocks } from "../../../../scripts/srd521-stat-block-parity.ts";

import { srdStatBlockCollection } from "./installed-srd-stat-block-catalog.ts";
import type { SrdStatBlockSourceOccurrence } from "./stat-block-parity-observation.ts";

const PACK_TACTICS_EFFECT = {
  kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target",
} as const;

const PACK_TACTICS_RAW_ANCHORS = [
  {
    sourcePath: ".references/srd-5.2.1/Monsters/Monsters-H-L.md",
    names: ["Hell Hound", "Hobgoblin Warrior", "Kobold Warrior"],
  },
  {
    sourcePath: ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
    names: [
      "Tough",
      "Tough Boss",
      "Warrior Infantry",
      "Werewolf",
      "Winter Wolf",
    ],
  },
] as const;

const repositoryRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);

const packTacticsDescription = (
  sourceLines: readonly string[],
  occurrence: SrdStatBlockSourceOccurrence,
): string | undefined => {
  const line = sourceLines
    .slice(occurrence.anchor.lineStart - 1, occurrence.anchor.lineEnd)
    .find((candidate) => /^\*{2,3}Pack Tactics\.\*{2,3} /.test(candidate));
  return line?.match(/^\*{2,3}Pack Tactics\.\*{2,3} (.+)$/)?.[1];
};

describe("Pack Tactics RAW fidelity", () => {
  test("projects all eight RAW anchors through the same typed effect", () => {
    const selectedAnchors = PACK_TACTICS_RAW_ANCHORS.flatMap((anchor) => {
      const source = readFileSync(
        join(repositoryRoot, anchor.sourcePath),
        "utf8",
      );
      const discovery = discoverSrdStatBlocks([
        { sourcePath: anchor.sourcePath, contents: source },
      ]);
      const selectedNames = new Set<string>(anchor.names);

      expect(discovery.issues).toEqual([]);
      return discovery.occurrences
        .filter((occurrence) => selectedNames.has(occurrence.name))
        .map((occurrence) => ({
          occurrence,
          rawDescription: packTacticsDescription(
            source.split(/\r?\n/),
            occurrence,
          ),
          authored: srdStatBlockCollection.statBlocks.find(
            (record) => record.name === occurrence.name,
          ),
        }));
    });

    expect(selectedAnchors).toHaveLength(8);
    for (const { occurrence, rawDescription, authored } of selectedAnchors) {
      const authoredSourceSection = occurrence.anchor.section.replace(
        ".references/srd-5.2.1/",
        "",
      );
      expect(
        authored,
        `Missing authored record for ${occurrence.anchor.section}`,
      ).toBeDefined();
      expect(authored?.provenance.section).toBe(authoredSourceSection);
      expect(
        rawDescription,
        `Missing RAW Pack Tactics at ${occurrence.anchor.section}`,
      ).toBeDefined();

      const authoredTrait = authored?.statBlock.traits?.find(
        (trait) => trait.name === "Pack Tactics",
      );
      expect(authoredTrait).toEqual({
        name: "Pack Tactics",
        description: rawDescription,
        effect: PACK_TACTICS_EFFECT,
      });
    }
  });
});
