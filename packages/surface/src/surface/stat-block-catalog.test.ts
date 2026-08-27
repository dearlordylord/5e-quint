import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { statBlockId } from "@dnd/shared/game-facts";

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

describe("Stat Block catalog boundary", () => {
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

  test("catalog returns only SRD records and rejects duplicate ids", () => {
    const collection = defineSrdStatBlockCollection({
      statBlocks: [assertSrd521StatBlock(goblinWarrior)],
    });
    const valid = buildStatBlockCatalog({ collections: [collection] });

    expect(valid.tag).toBe("ok");
    if (valid.tag === "ok") {
      expect(valid.catalog.requireStatBlock(goblinWarrior.id)).toEqual(
        goblinWarrior,
      );
      expect(
        valid.catalog
          .listStatBlocks()
          .map((statBlock) => statBlock.provenance.kind),
      ).toEqual(["srd-5.2.1"]);
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

  test("rejects distinct records with the same normalized identity", () => {
    const srdGoblinWarrior = assertSrd521StatBlock(goblinWarrior);
    const duplicateName = assertSrd521StatBlock({
      ...srdGoblinWarrior,
      id: statBlockId("stat_block_goblin_warrior_duplicate_identity"),
      name: "  GOBLIN   WARRIOR ",
      provenance: {
        kind: "srd-5.2.1",
        section: srdGoblinWarrior.provenance.section,
      },
    });
    expect(() =>
      defineSrdStatBlockCollection({
        statBlocks: [srdGoblinWarrior, duplicateName],
      }),
    ).toThrow(
      '"code":"duplicateStatBlockIdentity","normalizedIdentity":"goblin warrior"',
    );

    const result = buildStatBlockCatalog({
      collections: [
        defineSrdStatBlockCollection({ statBlocks: [srdGoblinWarrior] }),
        defineSrdStatBlockCollection({ statBlocks: [duplicateName] }),
      ],
    });

    expect(result).toEqual({
      tag: "invalid",
      issues: [
        {
          code: "duplicateStatBlockIdentity",
          normalizedIdentity: "goblin warrior",
          statBlockId: duplicateName.id,
          priorStatBlockId: srdGoblinWarrior.id,
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
        kind: "textOnly",
        name: "Invisibility",
        description:
          "The imp casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability.",
        reason: "unsupported_procedure_family",
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
      expect(quasit.statBlock.actions?.[1]).toMatchObject({
        kind: "textOnly",
        name: "Invisibility",
        description:
          "The quasit casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability.",
        reason: "unsupported_procedure_family",
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
        kind: "textOnly",
        name: "Invisibility",
        description:
          "The sprite casts Invisibility on itself, requiring no spell components and using Charisma as the spellcasting ability.",
        reason: "unsupported_procedure_family",
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
