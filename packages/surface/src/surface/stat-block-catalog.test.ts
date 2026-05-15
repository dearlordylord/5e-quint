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

describe("Stat Block catalog boundary", () => {
  test("decodes generic Stat Block records", () => {
    expect(goblinWarrior.kind).toBe("statBlock");
    expect(goblinWarrior.provenance.kind).toBe("srd-5.2.1");
    expect(goblinWarrior.statBlock.displayName).toBe("Goblin Warrior");
  });

  test("decodes Stat Block Multiattack and Bonus Action procedure sections", () => {
    const decoded = decodeStatBlockRecordSync({
      ...goblinWarriorInput,
      id: "stat_block_surface_contract_multiattack",
      statBlock: {
        ...goblinWarriorInput.statBlock,
        actions: {
          ...goblinWarriorInput.statBlock.actions,
          multiattacks: [
            {
              name: "Multiattack",
              dispatches: [
                { name: "Scimitar", count: { kind: "literal", value: 1 } },
                { name: "Shortbow", count: { kind: "literal", value: 1 } },
              ],
            },
          ],
        },
      },
    });

    expect(decoded.statBlock.actions?.multiattacks).toEqual([
      {
        name: "Multiattack",
        dispatches: [
          { name: "Scimitar", count: { kind: "literal", value: 1 } },
          { name: "Shortbow", count: { kind: "literal", value: 1 } },
        ],
      },
    ]);
    expect(decoded.statBlock.bonusActions?.actionOptions).toEqual([
      { name: "Nimble Escape", options: ["disengage", "hide"] },
    ]);
  });

  test("rejects empty Stat Block ids and names", () => {
    expect(
      Either.isLeft(
        decodeStatBlockRecordEither({ ...goblinWarriorInput, id: "" }),
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

  test("rejects Stat Block save gates without exactly one recipient shape", () => {
    const sting = pseudodragonInput.statBlock.actions.saves?.[0];
    expect(sting).toBeDefined();
    if (sting === undefined) {
      throw new Error("Expected authored Pseudodragon Sting save input.");
    }

    const { target: _target, ...targetlessSting } = sting;
    expect(
      Either.isLeft(
        decodeStatBlockRecordEither({
          ...pseudodragonInput,
          id: "stat_block_reject_targetless_save_gate",
          statBlock: {
            ...pseudodragonInput.statBlock,
            actions: {
              ...pseudodragonInput.statBlock.actions,
              saves: [targetlessSting],
            },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeStatBlockRecordEither({
          ...pseudodragonInput,
          id: "stat_block_reject_ambiguous_save_gate",
          statBlock: {
            ...pseudodragonInput.statBlock,
            actions: {
              ...pseudodragonInput.statBlock.actions,
              saves: [
                {
                  ...sting,
                  area: { kind: "sphere", radiusFeet: 5 },
                },
              ],
            },
          },
        }),
      ),
    ).toBe(true);
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

      expect(goblin.statBlock.displayName).toBe("Goblin Warrior");
      expect(goblin.challengeRating).toBe(0.25);
      expect(goblin.statBlock.ac).toEqual({ kind: "literal", value: 15 });
      expect(goblin.statBlock.hp).toEqual({ kind: "literal", value: 10 });
      expect(goblin.statBlock.initiativeModifier).toBe(2);
      expect(goblin.statBlock.savingThrowModifiers).toEqual([
        { ability: "dex", modifier: 2 },
      ]);
      expect(goblin.statBlock.saveProficiencies).toBeUndefined();
      expect(
        goblin.statBlock.actions?.attacks?.map((attack) => attack.name),
      ).toEqual(["Scimitar", "Shortbow"]);
      expect(goblin.statBlock.actions?.attacks?.[0]?.onHit).toContainEqual({
        amount: { expr: { dice: 1, dieSize: 4 }, kind: "fixed" },
        damageType: "slashing",
        kind: "conditional_bonus_damage",
        when: { kind: "attack_roll_had_advantage" },
      });
      expect(goblin.statBlock.actions?.attacks?.[1]?.onHit).toContainEqual({
        amount: { expr: { dice: 1, dieSize: 4 }, kind: "fixed" },
        damageType: "piercing",
        kind: "conditional_bonus_damage",
        when: { kind: "attack_roll_had_advantage" },
      });
      expect(goblin.statBlock.bonusActions?.actionOptions).toEqual([
        {
          name: "Nimble Escape",
          options: ["disengage", "hide"],
        },
      ]);
    }
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
      expect(skeletonRecord.statBlock.displayName).toBe("Skeleton");
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
        skeletonRecord.statBlock.actions?.attacks?.map((attack) => ({
          name: attack.name,
          attackType: attack.attackType,
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
        expect(statBlock.statBlock.displayName).toBe(form.displayName);
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
        imp.statBlock.actions?.specials?.map((action) => action.name),
      ).toEqual(["Invisibility", "Shape-Shift"]);

      const pseudodragon = valid.catalog.requireStatBlock(
        "stat_block_pseudodragon",
      );
      expect(pseudodragon.statBlock.skillModifiers).toEqual([
        { modifier: 5, skill: "perception" },
        { modifier: 4, skill: "stealth" },
      ]);
      expect(pseudodragon.statBlock.actions?.saves?.[0]).toMatchObject({
        ability: "con",
        dc: { dc: 12, kind: "fixed" },
        name: "Sting",
        target: { kind: "one_creature_in_range", rangeFeet: 5 },
      });

      const quasit = valid.catalog.requireStatBlock("stat_block_quasit");
      expect(quasit.statBlock.skillModifiers).toEqual([
        { modifier: 5, skill: "stealth" },
      ]);
      expect(quasit.statBlock.actions?.attacks?.[0]?.description).toContain(
        "Poisoned condition",
      );
      expect(
        quasit.statBlock.actions?.specials?.map((action) => action.name),
      ).toEqual(["Invisibility", "Scare", "Shape-Shift"]);

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
      expect(sphinxOfWonder.statBlock.reactions?.specials).toEqual([
        {
          description:
            "Trigger: The sphinx or another creature within 30 feet makes an ability check or a saving throw. Response: The sphinx adds 2 to the roll.",
          limitedUse: { kind: "daily", uses: 2 },
          name: "Burst of Ingenuity",
        },
      ]);

      const sprite = valid.catalog.requireStatBlock("stat_block_sprite");
      expect(sprite.statBlock.skillModifiers).toEqual([
        { modifier: 3, skill: "perception" },
        { modifier: 8, skill: "stealth" },
      ]);
      expect(sprite.statBlock.actions?.attacks?.[1]?.description).toContain(
        "Charmed condition",
      );
      expect(
        sprite.statBlock.actions?.specials?.map((action) => action.name),
      ).toEqual(["Heart Sight", "Invisibility"]);
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
