import { Either } from "effect";
import { describe, expect, test } from "vitest";

import findFamiliarInput from "../../content/find_familiar.json";
import findFamiliarStatBlocksInput from "../../content/stat_block_find_familiar_forms.json";
import goblinWarriorInput from "../../content/stat_block_goblin_warrior.json";
import skeletonInput from "../../content/stat_block_skeleton.json";
import sphinxOfWonderInput from "../../content/stat_block_sphinx_of_wonder.json";
import {
  decodeStatBlockRecordEither,
  decodeStatBlockRecordSync,
} from "./schema.ts";
import {
  assertSrd521StatBlock,
  buildStatBlockCatalog,
  defineSrdStatBlockCollection,
  srdStatBlockCollection,
} from "./stat-block-catalog.ts";
import type {
  Srd521StatBlock,
  SrdStatBlockCollection,
} from "./stat-block-catalog.ts";

const goblinWarrior = decodeStatBlockRecordSync(goblinWarriorInput);
const skeleton = decodeStatBlockRecordSync(skeletonInput);
const pseudodragonInput = findFamiliarStatBlocksInput.find(
  (input) => input.id === "stat_block_pseudodragon",
);
if (pseudodragonInput === undefined) {
  throw new Error("Expected authored Pseudodragon Stat Block input.");
}

const findFamiliarNormalFormSkillModifiers: Record<
  string,
  ReadonlyArray<{ readonly modifier: number; readonly skill: string }>
> = {
  stat_block_bat: [],
  stat_block_cat: [
    { modifier: 3, skill: "perception" },
    { modifier: 4, skill: "stealth" },
  ],
  stat_block_frog: [
    { modifier: 1, skill: "perception" },
    { modifier: 3, skill: "stealth" },
  ],
  stat_block_hawk: [{ modifier: 6, skill: "perception" }],
  stat_block_lizard: [],
  stat_block_octopus: [
    { modifier: 2, skill: "perception" },
    { modifier: 6, skill: "stealth" },
  ],
  stat_block_owl: [
    { modifier: 5, skill: "perception" },
    { modifier: 5, skill: "stealth" },
  ],
  stat_block_rat: [{ modifier: 2, skill: "perception" }],
  stat_block_raven: [{ modifier: 3, skill: "perception" }],
  stat_block_spider: [{ modifier: 4, skill: "stealth" }],
  stat_block_weasel: [
    { modifier: 5, skill: "acrobatics" },
    { modifier: 3, skill: "perception" },
    { modifier: 5, skill: "stealth" },
  ],
} as const;

const srdFieldCorrespondence = {
  stat_block_bat: {
    name: "Bat",
    source: "Animals.md:164-185",
    alignment: "unaligned",
    ac: 12,
    hp: 1,
    initiative: 12,
    passivePerception: 11,
    actions: [[1, "executable", "Bite"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_cat: {
    name: "Cat",
    source: "Animals.md:319-344",
    alignment: "unaligned",
    ac: 12,
    hp: 2,
    initiative: 12,
    passivePerception: 13,
    actions: [[1, "executable", "Scratch"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_frog: {
    name: "Frog",
    source: "Animals.md:612-638",
    alignment: "unaligned",
    ac: 11,
    hp: 1,
    initiative: 11,
    passivePerception: 11,
    actions: [[1, "executable", "Bite"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_hawk: {
    name: "Hawk",
    source: "Animals.md:1454-1475",
    alignment: "unaligned",
    ac: 13,
    hp: 1,
    initiative: 13,
    passivePerception: 16,
    actions: [[1, "executable", "Talons"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_lizard: {
    name: "Lizard",
    source: "Animals.md:1650-1676",
    alignment: "unaligned",
    ac: 10,
    hp: 2,
    initiative: 10,
    passivePerception: 9,
    actions: [[1, "executable", "Bite"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_octopus: {
    name: "Octopus",
    source: "Animals.md:1757-1788",
    alignment: "unaligned",
    ac: 12,
    hp: 3,
    initiative: 12,
    passivePerception: 12,
    actions: [[1, "executable", "Tentacles"]],
    bonusActions: [],
    reactions: [[1, "textOnly", "Ink Cloud"]],
  },
  stat_block_owl: {
    name: "Owl",
    source: "Animals.md:1791-1818",
    alignment: "unaligned",
    ac: 11,
    hp: 1,
    initiative: 11,
    passivePerception: 15,
    actions: [[1, "executable", "Talons"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_rat: {
    name: "Rat",
    source: "Animals.md:1980-2005",
    alignment: "unaligned",
    ac: 10,
    hp: 1,
    initiative: 10,
    passivePerception: 12,
    actions: [[1, "executable", "Bite"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_raven: {
    name: "Raven",
    source: "Animals.md:2008-2035",
    alignment: "unaligned",
    ac: 12,
    hp: 2,
    initiative: 12,
    passivePerception: 13,
    actions: [[1, "executable", "Beak"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_spider: {
    name: "Spider",
    source: "Animals.md:2197-2223",
    alignment: "unaligned",
    ac: 12,
    hp: 1,
    initiative: 12,
    passivePerception: 10,
    actions: [[1, "executable", "Bite"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_weasel: {
    name: "Weasel",
    source: "Animals.md:2563-2583",
    alignment: "unaligned",
    ac: 13,
    hp: 1,
    initiative: 13,
    passivePerception: 13,
    actions: [[1, "executable", "Bite"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_venomous_snake: {
    name: "Venomous Snake",
    source: "Animals.md:2489-2510",
    alignment: "unaligned",
    ac: 12,
    hp: 5,
    initiative: 12,
    passivePerception: 10,
    actions: [[1, "executable", "Bite"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_imp: {
    name: "Imp",
    source: "Monsters/Monsters-H-L.md:386-415",
    alignment: { order: "lawful", morality: "evil" },
    ac: 13,
    hp: 21,
    initiative: 13,
    passivePerception: 11,
    actions: [
      [1, "executable", "Sting"],
      [2, "executable", "Invisibility"],
      [3, "textOnly", "Shape-Shift"],
    ],
    bonusActions: [],
    reactions: [],
  },
  stat_block_pseudodragon: {
    name: "Pseudodragon",
    source: "Monsters/Monsters-P-S.md:292-319",
    alignment: { order: "neutral", morality: "good" },
    ac: 14,
    hp: 10,
    initiative: 12,
    passivePerception: 15,
    actions: [
      [1, "executable", "Multiattack"],
      [2, "executable", "Bite"],
      [3, "textOnly", "Sting"],
    ],
    bonusActions: [],
    reactions: [],
  },
  stat_block_quasit: {
    name: "Quasit",
    source: "Monsters/Monsters-P-S.md:359-390",
    alignment: { order: "chaotic", morality: "evil" },
    ac: 13,
    hp: 25,
    initiative: 13,
    passivePerception: 10,
    actions: [
      [1, "textOnly", "Rend"],
      [2, "executable", "Invisibility"],
      [3, "textOnly", "Scare"],
      [4, "textOnly", "Shape-Shift"],
    ],
    bonusActions: [],
    reactions: [],
  },
  stat_block_sprite: {
    name: "Sprite",
    source: "Monsters/Monsters-P-S.md:1484-1512",
    alignment: { order: "neutral", morality: "good" },
    ac: 15,
    hp: 10,
    initiative: 14,
    passivePerception: 13,
    actions: [
      [1, "executable", "Needle Sword"],
      [2, "textOnly", "Enchanting Bow"],
      [3, "textOnly", "Heart Sight"],
      [4, "executable", "Invisibility"],
    ],
    bonusActions: [],
    reactions: [],
  },
  stat_block_riding_horse: {
    name: "Riding Horse",
    source: "Animals.md:2089-2108",
    alignment: "unaligned",
    ac: 11,
    hp: 13,
    initiative: 11,
    passivePerception: 10,
    actions: [[1, "executable", "Hooves"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_wolf: {
    name: "Wolf",
    source: "Animals.md:2587-2611",
    alignment: "unaligned",
    ac: 12,
    hp: 11,
    initiative: 12,
    passivePerception: 15,
    actions: [[1, "executable", "Bite"]],
    bonusActions: [],
    reactions: [],
  },
  stat_block_goblin_warrior: {
    name: "Goblin Warrior",
    source: "Monsters/Monsters-E-G.md:721-748",
    alignment: { order: "chaotic", morality: "neutral" },
    ac: 15,
    hp: 10,
    initiative: 12,
    passivePerception: 9,
    actions: [
      [1, "executable", "Scimitar"],
      [2, "executable", "Shortbow"],
    ],
    bonusActions: [[1, "executable", "Nimble Escape"]],
    reactions: [],
  },
  stat_block_skeleton: {
    name: "Skeleton",
    source: "Monsters/Monsters-P-S.md:1152-1175",
    alignment: { order: "lawful", morality: "evil" },
    ac: 14,
    hp: 13,
    initiative: 13,
    passivePerception: 9,
    actions: [
      [1, "executable", "Shortsword"],
      [2, "executable", "Shortbow"],
    ],
    bonusActions: [],
    reactions: [],
  },
  stat_block_sphinx_of_wonder: {
    name: "Sphinx of Wonder",
    source: "Monsters/Monsters-P-S.md:1316-1344",
    alignment: { order: "lawful", morality: "good" },
    ac: 13,
    hp: 39,
    initiative: 13,
    passivePerception: 11,
    actions: [[1, "executable", "Rend"]],
    bonusActions: [],
    reactions: [[1, "textOnly", "Burst of Ingenuity"]],
  },
} as const;

describe("Stat Block catalog boundary", () => {
  test("corresponds field-by-field to the audited 21-record SRD matrix", () => {
    expect(srdStatBlockCollection.statBlocks).toHaveLength(21);
    expect(Object.keys(srdFieldCorrespondence)).toHaveLength(21);
    for (const record of srdStatBlockCollection.statBlocks) {
      const expected =
        srdFieldCorrespondence[
          record.id as keyof typeof srdFieldCorrespondence
        ];
      expect(expected).toBeDefined();
      if (expected === undefined) continue;
      const procedureLabel = (
        entry: NonNullable<Srd521StatBlock["statBlock"]["actions"]>[number],
      ) => (entry.kind === "textOnly" ? entry.name : entry.procedure.name);
      expect({
        name: record.name,
        source: record.provenance.section,
        alignment: record.statBlock.alignment,
        ac: record.statBlock.ac.value.value,
        hp: record.statBlock.hp.value,
        initiative: record.statBlock.initiative.score,
        passivePerception: record.statBlock.passivePerception,
        actions: (record.statBlock.actions ?? []).map((entry) => [
          entry.procedureOrdinal,
          entry.kind,
          procedureLabel(entry),
        ]),
        bonusActions: (record.statBlock.bonusActions ?? []).map((entry) => [
          entry.procedureOrdinal,
          entry.kind,
          entry.kind === "textOnly" ? entry.name : entry.procedure.name,
        ]),
        reactions: (record.statBlock.reactions ?? []).map((entry) => [
          entry.procedureOrdinal,
          entry.kind,
          entry.kind === "textOnly" ? entry.name : entry.procedure.name,
        ]),
      }).toEqual(expected);
    }
  });

  test("decodes generic Stat Block records", () => {
    expect(goblinWarrior.kind).toBe("statBlock");
    expect(goblinWarrior.provenance.kind).toBe("srd-5.2.1");
    expect(goblinWarrior.name).toBe("Goblin Warrior");
    expect(
      goblinWarrior.statBlock.actions?.map((entry) => entry.procedureOrdinal),
    ).toEqual([1, 2]);
  });

  test("rejects empty Stat Block ids and names", () => {
    expect(
      Either.isLeft(
        decodeStatBlockRecordEither({ ...goblinWarriorInput, id: "" }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeStatBlockRecordEither({ ...goblinWarriorInput, id: "   " }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeStatBlockRecordEither({ ...goblinWarriorInput, name: "   " }),
      ),
    ).toBe(true);
  });

  test("rejects Stat Block challenge ratings outside the SRD domain", () => {
    expect(
      decodeStatBlockRecordSync({
        ...goblinWarriorInput,
        challengeRating: 0.125,
      }).challengeRating,
    ).toBe(0.125);
    expect(
      Either.isLeft(
        decodeStatBlockRecordEither({
          ...goblinWarriorInput,
          challengeRating: 0.13,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeStatBlockRecordEither({
          ...goblinWarriorInput,
          challengeRating: 31,
        }),
      ),
    ).toBe(true);
  });

  test("retains the complete unsupported saving-throw procedure", () => {
    const sting = pseudodragonInput.statBlock.actions?.[2];
    expect(sting).toMatchObject({
      kind: "textOnly",
      name: "Sting",
      reason: "unsupported_action_shape",
      description: expect.stringContaining("Constitution Saving Throw: DC 12"),
    });
  });

  test("catalog returns generic records and rejects duplicate ids", () => {
    const collection = defineSrdStatBlockCollection({
      statBlocks: [assertSrd521StatBlock(goblinWarrior)],
    });
    const valid = buildStatBlockCatalog({ collections: [collection] });

    expect(valid.tag).toBe("ok");
    if (valid.tag === "ok") {
      expect(valid.catalog.requireStatBlock(goblinWarrior.id)).toEqual(
        goblinWarrior,
      );
    }

    const duplicate = buildStatBlockCatalog({
      collections: [collection, collection],
    });

    expect(duplicate).toEqual({
      tag: "invalid",
      issues: [
        {
          code: "duplicateStatBlockId",
          statBlockId: goblinWarrior.id,
        },
      ],
    });
  });

  test("exports the authored SRD Goblin Warrior Stat Block collection", () => {
    const valid = buildStatBlockCatalog({
      collections: [srdStatBlockCollection],
    });

    expect(valid.tag).toBe("ok");
    if (valid.tag === "ok") {
      const goblin = valid.catalog.requireStatBlock(
        "stat_block_goblin_warrior",
      );

      expect(goblin.name).toBe("Goblin Warrior");
      expect(goblin.challengeRating).toBe(0.25);
      expect(goblin.statBlock.ac).toEqual({
        value: { kind: "literal", value: 15 },
      });
      expect(goblin.statBlock.hp).toEqual({ kind: "literal", value: 10 });
      expect(goblin.statBlock.initiative).toEqual({ modifier: 2, score: 12 });
      expect(goblin.statBlock.savingThrowModifiers).toEqual([
        { ability: "dex", modifier: 2 },
      ]);
      expect(goblin.statBlock.saveProficiencies).toBeUndefined();
      expect(
        goblin.statBlock.actions?.map((entry) =>
          entry.kind === "executable" ? entry.procedure.name : entry.name,
        ),
      ).toEqual(["Scimitar", "Shortbow"]);
      const shortbow = goblin.statBlock.actions?.[1];
      expect(
        shortbow?.kind === "executable" &&
          shortbow.procedure.kind === "attack_roll" &&
          shortbow.procedure.attackType === "ranged"
          ? shortbow.procedure.ammunition
          : undefined,
      ).toBe("arrow");
      const scimitar = goblin.statBlock.actions?.[0];
      expect(
        scimitar?.kind === "executable" &&
          scimitar.procedure.kind === "attack_roll"
          ? scimitar.procedure.onHit
          : [],
      ).toContainEqual({
        amount: { expr: { dice: 1, dieSize: 4 }, kind: "fixed", static: 2 },
        damageType: "slashing",
        kind: "conditional_bonus_damage",
        when: { kind: "attack_roll_had_advantage" },
      });
      expect(
        shortbow?.kind === "executable" &&
          shortbow.procedure.kind === "attack_roll"
          ? shortbow.procedure.onHit
          : [],
      ).toContainEqual({
        amount: { expr: { dice: 1, dieSize: 4 }, kind: "fixed", static: 2 },
        damageType: "piercing",
        kind: "conditional_bonus_damage",
        when: { kind: "attack_roll_had_advantage" },
      });
      expect(goblin.statBlock.bonusActions?.[0]).toMatchObject({
        kind: "executable",
        procedure: {
          kind: "action_option",
          name: "Nimble Escape",
          options: ["disengage", "hide"],
        },
      });
    }
  });

  test("rejects ammunition on a melee creature attack", () => {
    const actions = goblinWarriorInput.statBlock.actions;
    expect(actions).toBeDefined();
    if (actions === undefined) return;
    const first = actions[0];
    expect(first?.kind).toBe("executable");
    if (first?.kind !== "executable" || first.procedure.kind !== "attack_roll")
      return;
    const malformed = {
      ...goblinWarriorInput,
      statBlock: {
        ...goblinWarriorInput.statBlock,
        actions: actions.map((entry, index) =>
          index === 0
            ? {
                ...entry,
                procedure: { ...first.procedure, ammunition: "arrow" },
              }
            : entry,
        ),
      },
    };
    expect(Either.isLeft(decodeStatBlockRecordEither(malformed))).toBe(true);
  });

  test("exports Skeleton's SRD Stat Block vulnerabilities and immunities", () => {
    const valid = buildStatBlockCatalog({
      collections: [srdStatBlockCollection],
    });

    expect(valid.tag).toBe("ok");
    if (valid.tag === "ok") {
      const skeletonRecord = valid.catalog.requireStatBlock(
        "stat_block_skeleton",
      );

      expect(skeletonRecord).toEqual(skeleton);
      expect(skeletonRecord.name).toBe("Skeleton");
      expect(skeletonRecord.challengeRating).toBe(0.25);
      expect(skeletonRecord.statBlock.creatureType).toBe("undead");
      expect(skeletonRecord.statBlock.vulnerabilities).toEqual({
        damageTypes: ["bludgeoning"],
        kind: "fixed",
      });
      expect(skeletonRecord.statBlock.immunities).toEqual({
        conditions: ["exhaustion", "poisoned"],
        damageTypes: ["poison"],
      });
      expect(
        skeletonRecord.statBlock.actions?.map((entry) => ({
          name: entry.kind === "executable" ? entry.procedure.name : entry.name,
          attackType:
            entry.kind === "executable" &&
            entry.procedure.kind === "attack_roll"
              ? entry.procedure.attackType
              : undefined,
        })),
      ).toEqual([
        { attackType: "melee", name: "Shortsword" },
        { attackType: "ranged", name: "Shortbow" },
      ]);
    }
  });

  test("exports SRD Stat Blocks for Find Familiar normal forms", () => {
    const findFamiliarCreature = findFamiliarInput.mechanics.creature;
    expect(findFamiliarCreature.kind).toBe("familiar_form_catalog");
    if (findFamiliarCreature.kind !== "familiar_form_catalog") {
      throw new Error("Expected Find Familiar form catalog input.");
    }
    const valid = buildStatBlockCatalog({
      collections: [srdStatBlockCollection],
    });

    expect(valid.tag).toBe("ok");
    if (valid.tag === "ok") {
      for (const form of findFamiliarCreature.normalForms) {
        const statBlock = valid.catalog.requireStatBlock(form.statBlockId);
        expect(statBlock.name).toBe(form.displayName);
        expect(statBlock.statBlock.creatureType).toBe("beast");
        expect(statBlock.challengeRating).toBe(0);
        expect(
          Object.hasOwn(findFamiliarNormalFormSkillModifiers, form.statBlockId),
        ).toBe(true);
        expect(statBlock.statBlock.skillModifiers ?? []).toEqual(
          findFamiliarNormalFormSkillModifiers[form.statBlockId],
        );
      }
    }
  });

  test("exports SRD Stat Blocks for Wild Shape recommended forms not used by Find Familiar", () => {
    const valid = buildStatBlockCatalog({
      collections: [srdStatBlockCollection],
    });

    expect(valid.tag).toBe("ok");
    if (valid.tag === "ok") {
      const ridingHorse = valid.catalog.requireStatBlock(
        "stat_block_riding_horse",
      );
      expect(ridingHorse.name).toBe("Riding Horse");
      expect(ridingHorse.statBlock.creatureType).toBe("beast");
      expect(ridingHorse.challengeRating).toBe(0.25);

      const wolf = valid.catalog.requireStatBlock("stat_block_wolf");
      expect(wolf.name).toBe("Wolf");
      expect(wolf.statBlock.creatureType).toBe("beast");
      expect(wolf.challengeRating).toBe(0.25);
      expect(wolf.statBlock.skillModifiers ?? []).toEqual([
        { modifier: 5, skill: "perception" },
        { modifier: 4, skill: "stealth" },
      ]);
    }
  });

  test("exports SRD action and skill details for Pact special familiar forms", () => {
    const valid = buildStatBlockCatalog({
      collections: [srdStatBlockCollection],
    });

    expect(valid.tag).toBe("ok");
    if (valid.tag === "ok") {
      const imp = valid.catalog.requireStatBlock("stat_block_imp");
      expect(imp.statBlock.skillModifiers).toEqual([
        { modifier: 4, skill: "deception" },
        { modifier: 3, skill: "insight" },
        { modifier: 5, skill: "stealth" },
      ]);
      expect(
        imp.statBlock.actions?.map((entry) =>
          entry.kind === "executable" ? entry.procedure.name : entry.name,
        ),
      ).toEqual(["Sting", "Invisibility", "Shape-Shift"]);
      expect(imp.statBlock.actions?.[1]).toMatchObject({
        kind: "executable",
        procedure: {
          kind: "spellcasting",
          groups: [{ kind: "at_will", resourceRefs: { kind: "none" } }],
        },
      });

      const pseudodragon = valid.catalog.requireStatBlock(
        "stat_block_pseudodragon",
      );
      expect(pseudodragon.statBlock.skillModifiers).toEqual([
        { modifier: 5, skill: "perception" },
        { modifier: 4, skill: "stealth" },
      ]);
      expect(pseudodragon.statBlock.actions?.[2]).toMatchObject({
        kind: "textOnly",
        name: "Sting",
        reason: "unsupported_action_shape",
        description: expect.stringContaining(
          "Constitution Saving Throw: DC 12",
        ),
      });

      const quasit = valid.catalog.requireStatBlock("stat_block_quasit");
      expect(quasit.statBlock.skillModifiers).toEqual([
        { modifier: 5, skill: "stealth" },
      ]);
      expect(
        quasit.statBlock.actions?.map((entry) =>
          entry.kind === "executable" ? entry.procedure.name : entry.name,
        ),
      ).toEqual(["Rend", "Invisibility", "Scare", "Shape-Shift"]);
      expect(quasit.statBlock.actions?.[0]).toMatchObject({
        kind: "textOnly",
        description: expect.stringContaining(
          "Hit: 5 (1d4 + 3) Slashing damage",
        ),
      });

      const sphinxOfWonder = valid.catalog.requireStatBlock(
        "stat_block_sphinx_of_wonder",
      );
      expect(sphinxOfWonder).toEqual(
        decodeStatBlockRecordSync(sphinxOfWonderInput),
      );
      expect(sphinxOfWonder.statBlock.skillModifiers).toEqual([
        { modifier: 4, skill: "arcana" },
        { modifier: 4, skill: "religion" },
        { modifier: 5, skill: "stealth" },
      ]);
      expect(sphinxOfWonder.statBlock.reactions?.[0]).toMatchObject({
        kind: "textOnly",
        name: "Burst of Ingenuity",
        reason: "unsupported_procedure_family",
        resourceRefs: { kind: "some", ordinals: [1] },
      });

      const sprite = valid.catalog.requireStatBlock("stat_block_sprite");
      expect(sprite.statBlock.skillModifiers).toEqual([
        { modifier: 3, skill: "perception" },
        { modifier: 8, skill: "stealth" },
      ]);
      expect(
        sprite.statBlock.actions?.map((entry) =>
          entry.kind === "executable" ? entry.procedure.name : entry.name,
        ),
      ).toEqual([
        "Needle Sword",
        "Enchanting Bow",
        "Heart Sight",
        "Invisibility",
      ]);
      expect(sprite.statBlock.actions?.[1]).toMatchObject({
        kind: "textOnly",
        description: expect.stringContaining("Hit: 1 Piercing damage"),
      });
      expect(sprite.statBlock.actions?.[3]).toMatchObject({
        kind: "executable",
        procedure: { kind: "spellcasting" },
      });
    }
  });

  test("rejects malformed SRD collections with mixed provenance", () => {
    const privateRecord = decodeStatBlockRecordSync({
      ...goblinWarriorInput,
      provenance: {
        kind: "xphb",
        section: "structured-input-only",
      },
    });
    const malformedCollection: SrdStatBlockCollection = {
      kind: "srdStatBlockCollection",
      provenance: { kind: "srd-5.2.1" },
      statBlocks: [
        // Cast justification: this test intentionally simulates a corrupted
        // SRD collection boundary after the generic Stat Block parser accepted
        // a non-SRD record, so runtime provenance validation must reject it.
        privateRecord as Srd521StatBlock,
      ],
    };

    expect(
      buildStatBlockCatalog({ collections: [malformedCollection] }),
    ).toEqual({
      tag: "invalid",
      issues: [
        {
          code: "mixedProvenance",
          collectionKind: "srdStatBlockCollection",
          expected: { kind: "srd-5.2.1" },
          actual: privateRecord.provenance,
          statBlockId: privateRecord.id,
        },
      ],
    });
  });
});
