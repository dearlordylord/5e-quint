import { Either } from "effect";
import { describe, expect, test } from "vitest";

import goblinWarriorInput from "../../content/stat_block_goblin_warrior.json";
import skeletonInput from "../../content/stat_block_skeleton.json";
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

describe("Stat Block catalog boundary", () => {
  test("decodes generic Stat Block records", () => {
    expect(goblinWarrior.kind).toBe("statBlock");
    expect(goblinWarrior.provenance.kind).toBe("srd-5.2.1");
    expect(goblinWarrior.statBlock.displayName).toBe("Goblin Warrior");
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
