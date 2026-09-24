import { describe, expect, test } from "vitest";

import { statBlockId } from "@dnd/shared/game-facts";

import { srdStatBlockCollection } from "./stat-block-catalog.ts";
import { loadRawStatBlockSourceFixture } from "./stat-block-raw-fidelity-fixture.test-support.ts";
import { projectRawStatBlocks } from "./stat-block-raw-projection.test-support.ts";
import { statBlockProficiencyBonusForChallengeRating } from "./stat-block-proficiency-bonus.ts";

const A_B_FIXTURE = loadRawStatBlockSourceFixture(
  ".references/srd-5.2.1/monsters-A-Z.md",
);
const A_B_RECORDS = A_B_FIXTURE.records.filter(({ name }) =>
  /^[AB]/.test(name),
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

describe("A–B independent RAW fidelity", () => {
  test("projects ammunition from the current HTML equipment table", () => {
    const assassinOccurrence = A_B_FIXTURE.occurrences.find(
      ({ name }) => name === "Assassin",
    );
    if (assassinOccurrence === undefined) {
      throw new Error("Missing Assassin source occurrence");
    }
    const [assassin] = projectRawStatBlocks(
      A_B_FIXTURE.source,
      [assassinOccurrence],
      A_B_FIXTURE.equipmentSource,
    );
    expect(assassin?.procedures).toContainEqual(
      expect.objectContaining({
        name: "Light Crossbow",
        kind: "attack_roll",
        ammunition: "bolt",
      }),
    );
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
    const mismatches: string[] = [];
    const sections = ["actions", "bonusActions", "reactions"] as const;

    for (const record of A_B_RECORDS) {
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
            abilityModifier +
            statBlockProficiencyBonusForChallengeRating(record.challengeRating);
          if (entry.procedure.attackBonus.value !== expected) {
            mismatches.push(
              `${record.name}/${entry.procedure.name}: ${entry.procedure.attackAbility} implies ${expected}, authored ${entry.procedure.attackBonus.value}`,
            );
          }
        }
      }
    }

    expect(A_B_RECORDS).toHaveLength(50);
    expect(mismatches).toEqual([]);
  });
});
