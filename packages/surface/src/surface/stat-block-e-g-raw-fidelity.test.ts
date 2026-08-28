import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  projectAuthoredStatBlocks,
  projectRawStatBlocks,
} from "./stat-block-raw-projection.test-support.ts";
import { defineRawStatBlockFidelityLane } from "./stat-block-raw-fidelity-lane.test-support.ts";
import { SrdStatBlockRecordSchema } from "./schema.ts";

const {
  source: SOURCE,
  equipmentSource: EQUIPMENT_SOURCE,
  occurrences: OCCURRENCES,
  records: INSTALLED,
} = defineRawStatBlockFidelityLane({
  label: "E–G",
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-E-G.md",
  authoredSourcePrefix: "Monsters/Monsters-E-G.md:",
  expectedRecordCount: 40,
});

const installedByName = new Map(
  INSTALLED.map((record) => [record.name, record]),
);
const decodeSrdStatBlockRecord = Schema.decodeUnknownSync(
  SrdStatBlockRecordSchema,
);

describe("E–G independent RAW fidelity", () => {
  test("rejects claiming one authored ability for a RAW-ambiguous attack", () => {
    const ghast = installedByName.get("Ghast");
    const bite = ghast?.statBlock.actions?.find(
      (entry) => entry.kind === "textOnly" && entry.name === "Bite",
    );
    if (ghast === undefined || bite?.kind !== "textOnly") {
      throw new Error("E–G ambiguity probe requires the Ghast Bite fixture");
    }
    const ghastWithClaimedAbility = decodeSrdStatBlockRecord({
      ...ghast,
      statBlock: {
        ...ghast.statBlock,
        actions: ghast.statBlock.actions?.map((entry) =>
          entry === bite
            ? {
                kind: "executable",
                procedureOrdinal: entry.procedureOrdinal,
                resourceRefs: entry.resourceRefs,
                procedure: {
                  kind: "attack_roll",
                  name: "Bite",
                  attackType: "melee",
                  attackAbility: "str",
                  attackBonus: { kind: "literal", value: 5 },
                  reachFeet: 5,
                  onHit: [
                    {
                      kind: "damage",
                      damageType: "piercing",
                      amount: {
                        kind: "fixed",
                        expr: { dice: 1, dieSize: 8, flat: 3 },
                        static: 7,
                      },
                    },
                    {
                      kind: "damage",
                      damageType: "necrotic",
                      amount: {
                        kind: "fixed",
                        expr: { dice: 2, dieSize: 8 },
                        static: 9,
                      },
                    },
                  ],
                },
              }
            : entry,
        ),
      },
    });

    expect(() =>
      projectAuthoredStatBlocks(
        INSTALLED.map((record) =>
          record === ghast ? ghastWithClaimedAbility : record,
        ),
      ),
    ).toThrow(/ambiguous RAW-derived attack abilities/);
  });

  test("rejects executable demotion and declared-resource mutations", () => {
    const expected = projectRawStatBlocks(
      SOURCE,
      OCCURRENCES,
      INSTALLED,
      EQUIPMENT_SOURCE,
    );
    const earthElemental = installedByName.get("Earth Elemental");
    const adultGoldDragon = installedByName.get("Adult Gold Dragon");
    const goblinWarrior = installedByName.get("Goblin Warrior");
    const slam = earthElemental?.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "attack_roll" &&
        entry.procedure.name === "Slam",
    );
    const breathRecharge = adultGoldDragon?.statBlock.resources?.find(
      (resource) => resource.limit.kind === "recharge",
    );
    const shortbow = goblinWarrior?.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "attack_roll" &&
        entry.procedure.name === "Shortbow",
    );
    if (
      earthElemental === undefined ||
      adultGoldDragon === undefined ||
      goblinWarrior === undefined ||
      slam?.kind !== "executable" ||
      slam.procedure.kind !== "attack_roll" ||
      breathRecharge?.limit.kind !== "recharge" ||
      shortbow?.kind !== "executable" ||
      shortbow.procedure.kind !== "attack_roll"
    ) {
      throw new Error("E–G support/resource mutation probes require fixtures");
    }

    const demotedEarthElemental = decodeSrdStatBlockRecord({
      ...earthElemental,
      statBlock: {
        ...earthElemental.statBlock,
        actions: earthElemental.statBlock.actions?.map((entry) =>
          entry === slam
            ? {
                kind: "textOnly",
                procedureOrdinal: entry.procedureOrdinal,
                name: entry.procedure.name,
                description:
                  "Melee Attack Roll: +8, reach 10 ft. Hit: 14 (2d8 + 5) Bludgeoning damage.",
                reason: "unsupported_action_shape",
                resourceRefs: entry.resourceRefs,
              }
            : entry,
        ),
      },
    });
    const demotedSlam = INSTALLED.map((record) =>
      record === earthElemental ? demotedEarthElemental : record,
    );
    const adultGoldWithChangedRecharge = decodeSrdStatBlockRecord({
      ...adultGoldDragon,
      statBlock: {
        ...adultGoldDragon.statBlock,
        resources: adultGoldDragon.statBlock.resources?.map((resource) =>
          resource === breathRecharge
            ? { ...resource, ownership: "each" }
            : resource,
        ),
      },
    });
    const changedRechargeOwnership = INSTALLED.map((record) =>
      record === adultGoldDragon ? adultGoldWithChangedRecharge : record,
    );
    const adultGoldWithExtraResource = decodeSrdStatBlockRecord({
      ...adultGoldDragon,
      statBlock: {
        ...adultGoldDragon.statBlock,
        resources: [
          ...(adultGoldDragon.statBlock.resources ?? []),
          {
            ordinal: 99,
            ownership: "shared",
            limit: { kind: "recharge", minimumRoll: 6 },
          },
        ],
      },
    });
    const extraUnreferencedResource = INSTALLED.map((record) =>
      record === adultGoldDragon ? adultGoldWithExtraResource : record,
    );
    const goblinWithChangedAmmunition = decodeSrdStatBlockRecord({
      ...goblinWarrior,
      statBlock: {
        ...goblinWarrior.statBlock,
        actions: goblinWarrior.statBlock.actions?.map((entry) =>
          entry === shortbow
            ? {
                ...entry,
                procedure: { ...entry.procedure, ammunition: "bolt" },
              }
            : entry,
        ),
      },
    });
    const changedAmmunition = INSTALLED.map((record) =>
      record === goblinWarrior ? goblinWithChangedAmmunition : record,
    );
    const goblinWithMultiattackCount = decodeSrdStatBlockRecord({
      ...goblinWarrior,
      statBlock: {
        ...goblinWarrior.statBlock,
        actions: goblinWarrior.statBlock.actions?.map((entry) =>
          entry === shortbow
            ? {
                ...entry,
                procedure: {
                  ...entry.procedure,
                  multiattackCount: { kind: "literal", value: 2 },
                },
              }
            : entry,
        ),
      },
    });
    const addedMultiattackCount = INSTALLED.map((record) =>
      record === goblinWarrior ? goblinWithMultiattackCount : record,
    );

    expect(projectAuthoredStatBlocks(demotedSlam)).not.toEqual(expected);
    expect(projectAuthoredStatBlocks(changedRechargeOwnership)).not.toEqual(
      expected,
    );
    expect(projectAuthoredStatBlocks(extraUnreferencedResource)).not.toEqual(
      expected,
    );
    expect(projectAuthoredStatBlocks(changedAmmunition)).not.toEqual(expected);
    expect(projectAuthoredStatBlocks(addedMultiattackCount)).not.toEqual(
      expected,
    );
  });

  test("rejects omitted optional executable and spell facts", () => {
    const expected = projectRawStatBlocks(
      SOURCE,
      OCCURRENCES,
      INSTALLED,
      EQUIPMENT_SOURCE,
    );
    const adultGoldDragon = installedByName.get("Adult Gold Dragon");
    const goblinWarrior = installedByName.get("Goblin Warrior");
    const spellcasting = adultGoldDragon?.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "spellcasting" &&
        entry.procedure.name === "Spellcasting",
    );
    const scimitar = goblinWarrior?.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "attack_roll" &&
        entry.procedure.name === "Scimitar",
    );
    if (
      adultGoldDragon === undefined ||
      goblinWarrior === undefined ||
      spellcasting?.kind !== "executable" ||
      spellcasting.procedure.kind !== "spellcasting" ||
      scimitar?.kind !== "executable" ||
      scimitar.procedure.kind !== "attack_roll"
    ) {
      throw new Error(
        "E–G optional executable mutation probes require fixtures",
      );
    }
    const spellcastingProcedure = spellcasting.procedure;
    const scimitarProcedure = scimitar.procedure;

    const adultGoldWithSpellCount = decodeSrdStatBlockRecord({
      ...adultGoldDragon,
      statBlock: {
        ...adultGoldDragon.statBlock,
        actions: adultGoldDragon.statBlock.actions?.map((entry) =>
          entry === spellcasting
            ? {
                ...entry,
                procedure: {
                  ...spellcastingProcedure,
                  groups: spellcastingProcedure.groups.map((group) => ({
                    ...group,
                    spells: group.spells.map((spell) =>
                      spell.spellId === "detect_magic"
                        ? { ...spell, count: 2 }
                        : spell,
                    ),
                  })),
                },
              }
            : entry,
        ),
      },
    });
    const scimitarWithAbilityModifier = decodeSrdStatBlockRecord({
      ...goblinWarrior,
      statBlock: {
        ...goblinWarrior.statBlock,
        actions: goblinWarrior.statBlock.actions?.map((entry) =>
          entry === scimitar
            ? {
                ...entry,
                procedure: {
                  ...scimitarProcedure,
                  onHit: scimitarProcedure.onHit.map((effect) =>
                    effect.kind === "damage" &&
                    effect.damageType === "slashing" &&
                    "expr" in effect.amount
                      ? {
                          ...effect,
                          amount: {
                            ...effect.amount,
                            expr: {
                              ...effect.amount.expr,
                              abilityModifier: "dex",
                            },
                          },
                        }
                      : effect,
                  ),
                },
              }
            : entry,
        ),
      },
    });

    expect(
      projectAuthoredStatBlocks(
        INSTALLED.map((record) =>
          record === adultGoldDragon ? adultGoldWithSpellCount : record,
        ),
      ),
    ).not.toEqual(expected);
    expect(
      projectAuthoredStatBlocks(
        INSTALLED.map((record) =>
          record === goblinWarrior ? scimitarWithAbilityModifier : record,
        ),
      ),
    ).not.toEqual(expected);
  });

  test("rejects omitted general, trait, identity, and text-support facts", () => {
    const expected = projectRawStatBlocks(
      SOURCE,
      OCCURRENCES,
      INSTALLED,
      EQUIPMENT_SOURCE,
    );
    const earthElemental = installedByName.get("Earth Elemental");
    const guardCaptain = installedByName.get("Guard Captain");
    const earthGlide = earthElemental?.statBlock.traits?.find(
      (trait) => trait.name === "Earth Glide",
    );
    const multiattack = earthElemental?.statBlock.actions?.find(
      (entry) => entry.kind === "textOnly" && entry.name === "Multiattack",
    );
    const javelin = guardCaptain?.statBlock.gear?.find(
      (gear) => gear.item === "Javelin",
    );
    if (
      earthElemental === undefined ||
      guardCaptain === undefined ||
      earthGlide === undefined ||
      multiattack?.kind !== "textOnly" ||
      javelin === undefined
    ) {
      throw new Error("E–G general-fact mutation probes require fixtures");
    }

    const mutations = [
      decodeSrdStatBlockRecord({
        ...earthElemental,
        id: "stat_block_changed_earth_elemental",
      }),
      decodeSrdStatBlockRecord({
        ...earthElemental,
        statBlock: {
          ...earthElemental.statBlock,
          ac: {
            ...earthElemental.statBlock.ac,
            annotations: ["Natural Armor"],
          },
        },
      }),
      decodeSrdStatBlockRecord({
        ...earthElemental,
        statBlock: {
          ...earthElemental.statBlock,
          saveProficiencies: ["str"],
        },
      }),
      decodeSrdStatBlockRecord({
        ...earthElemental,
        statBlock: {
          ...earthElemental.statBlock,
          swarm: { constituentSize: "tiny" },
        },
      }),
      decodeSrdStatBlockRecord({
        ...earthElemental,
        statBlock: {
          ...earthElemental.statBlock,
          traits: earthElemental.statBlock.traits?.map((trait) =>
            trait === earthGlide
              ? {
                  ...trait,
                  effect: {
                    kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target",
                  },
                }
              : trait,
          ),
        },
      }),
      decodeSrdStatBlockRecord({
        ...earthElemental,
        statBlock: {
          ...earthElemental.statBlock,
          actions: earthElemental.statBlock.actions?.map((entry) =>
            entry === multiattack
              ? { ...entry, reason: "unparsed_prose" }
              : entry,
          ),
        },
      }),
    ];
    const guardWithPluralGear = decodeSrdStatBlockRecord({
      ...guardCaptain,
      statBlock: {
        ...guardCaptain.statBlock,
        gear: guardCaptain.statBlock.gear?.map((gear) =>
          gear === javelin ? { ...gear, item: "Javelins" } : gear,
        ),
      },
    });

    for (const mutation of mutations) {
      expect(
        projectAuthoredStatBlocks(
          INSTALLED.map((record) =>
            record === earthElemental ? mutation : record,
          ),
        ),
      ).not.toEqual(expected);
    }
    expect(
      projectAuthoredStatBlocks(
        INSTALLED.map((record) =>
          record === guardCaptain ? guardWithPluralGear : record,
        ),
      ),
    ).not.toEqual(expected);
  });

  test("retains Goblin riders and gold/green dragon lair capacity", () => {
    const goblin = installedByName.get("Goblin Warrior");
    expect(goblin).toBeDefined();
    if (goblin === undefined) return;

    for (const [name, damageType] of [
      ["Scimitar", "slashing"],
      ["Shortbow", "piercing"],
    ] as const) {
      const entry = goblin.statBlock.actions?.find(
        (candidate) =>
          candidate.kind === "executable" &&
          candidate.procedure.kind === "attack_roll" &&
          candidate.procedure.name === name,
      );
      expect(entry, `Goblin Warrior ${name}`).toBeDefined();
      if (
        entry?.kind !== "executable" ||
        entry.procedure.kind !== "attack_roll"
      ) {
        continue;
      }
      expect(
        entry.procedure.onHit.find(
          (effect) =>
            effect.kind === "conditional_bonus_damage" &&
            effect.damageType === damageType,
        ),
      ).toEqual({
        kind: "conditional_bonus_damage",
        damageType,
        amount: {
          kind: "fixed",
          expr: { dice: 1, dieSize: 4 },
          static: 2,
        },
        when: { kind: "attack_roll_had_advantage" },
      });
    }

    const nimbleEscape = goblin.statBlock.bonusActions?.find(
      (candidate) =>
        candidate.kind === "executable" &&
        candidate.procedure.kind === "action_option" &&
        candidate.procedure.name === "Nimble Escape",
    );
    expect(nimbleEscape).toMatchObject({
      kind: "executable",
      procedure: { kind: "action_option", options: ["disengage", "hide"] },
    });

    for (const name of [
      "Adult Gold Dragon",
      "Ancient Gold Dragon",
      "Adult Green Dragon",
      "Ancient Green Dragon",
    ]) {
      expect(
        installedByName.get(name)?.statBlock.legendaryActions?.uses,
      ).toEqual({
        kind: "lair_bonus",
        usesOutsideLair: 3,
        additionalUsesInLair: 1,
      });
    }
  });
});
