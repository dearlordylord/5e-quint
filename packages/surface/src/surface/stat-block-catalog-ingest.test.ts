import { Option } from "effect";
import { describe, expect, test } from "vitest";

import { statBlockId } from "@dnd/shared/game-facts";

import goblinWarriorInput from "../../content/stat_block_goblin_warrior.json";
import {
  buildSrdStatBlockCatalogFromRecords,
  decodeStatBlockRecords,
  evaluateSrdStatBlockProvenance,
} from "./stat-block-catalog-core.ts";

describe("Stat Block ingest boundary", () => {
  test("collects every decode failure and retains valid records with their input ordinals", () => {
    const result = decodeStatBlockRecords([
      { ...goblinWarriorInput, id: "" },
      goblinWarriorInput,
      { ...goblinWarriorInput, name: "" },
    ]);

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues.map(({ inputOrdinal }) => inputOrdinal)).toEqual([
      1, 3,
    ]);
    expect(result.issues.every(({ message }) => message.length > 0)).toBe(true);
    expect(
      result.decodedRecords.map(({ inputOrdinal }) => inputOrdinal),
    ).toEqual([2]);
  });

  test("separates non-SRD records while retaining all valid SRD records", () => {
    const privateInput = {
      ...goblinWarriorInput,
      id: "stat_block_synthetic_private_warrior",
      name: "Synthetic Private Warrior",
      provenance: { kind: "xphb", section: "synthetic-test" },
    };
    const decoded = decodeStatBlockRecords([
      goblinWarriorInput,
      privateInput,
      {
        ...privateInput,
        id: "stat_block_synthetic_private_scout",
        name: "Synthetic Private Scout",
      },
    ]);
    expect(decoded.tag).toBe("decoded");
    if (decoded.tag !== "decoded") return;

    const provenance = evaluateSrdStatBlockProvenance(decoded.decodedRecords);
    expect(provenance.tag).toBe("mixed");
    if (provenance.tag !== "mixed") return;
    expect(provenance.issues.map(({ inputOrdinal }) => inputOrdinal)).toEqual([
      2, 3,
    ]);
    expect(provenance.srdRecords.map(({ id }) => id)).toEqual([
      goblinWarriorInput.id,
    ]);
  });

  test("builds a homogeneous SRD catalog and rejects duplicate records", () => {
    const decoded = decodeStatBlockRecords([goblinWarriorInput]);
    expect(decoded.tag).toBe("decoded");
    if (decoded.tag !== "decoded") return;
    const provenance = evaluateSrdStatBlockProvenance(decoded.decodedRecords);
    expect(provenance.tag).toBe("homogeneous");
    if (provenance.tag !== "homogeneous") return;

    const built = buildSrdStatBlockCatalogFromRecords(provenance.records);
    expect(built.tag).toBe("ok");
    if (built.tag !== "ok") return;
    expect(built.collection.statBlocks).toHaveLength(1);
    expect(
      Option.isSome(built.catalog.getStatBlock(provenance.records[0]!.id)),
    ).toBe(true);

    expect(
      buildSrdStatBlockCatalogFromRecords([
        provenance.records[0]!,
        provenance.records[0]!,
      ]),
    ).toMatchObject({
      tag: "invalid",
      issues: [{ code: "duplicateStatBlockId" }],
    });

    const duplicateIdentity = {
      ...provenance.records[0]!,
      id: statBlockId("stat_block_synthetic_duplicate_identity"),
      name: "  GOBLIN   WARRIOR ",
    };
    expect(
      buildSrdStatBlockCatalogFromRecords([
        provenance.records[0]!,
        duplicateIdentity,
      ]),
    ).toMatchObject({
      tag: "invalid",
      issues: [{ code: "duplicateStatBlockIdentity" }],
    });
  });
});
