import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  decodeStatBlockRecordEither,
  decodeStatBlockRecordSync,
} from "./schema.ts";
import {
  assertSrd521StatBlock,
  buildStatBlockCatalog,
  defineSrdStatBlockCollection,
} from "./stat-block-catalog.ts";
import type {
  Srd521StatBlock,
  SrdStatBlockCollection,
} from "./stat-block-catalog.ts";

const goblinWarriorInput = {
  id: "stat_block_goblin_warrior",
  kind: "statBlock",
  name: "Goblin Warrior",
  provenance: {
    kind: "srd-5.2.1",
    section: "Monsters/Monsters-E-G#Goblin Warrior",
  },
  statBlock: {
    displayName: "Goblin Warrior",
    size: "small",
    creatureType: "fey",
    ac: { kind: "literal", value: 15 },
    hp: { kind: "literal", value: 10 },
    speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
    abilityScores: {
      str: 8,
      dex: 15,
      con: 10,
      int: 10,
      wis: 8,
      cha: 8,
    },
    saveProficiencies: ["dex"],
    senses: [{ kind: "darkvision", rangeFeet: 60 }],
    languages: ["Common", "Goblin"],
  },
} as const;

const goblinWarrior = decodeStatBlockRecordSync(goblinWarriorInput);

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
