import { describe, it, expect } from "vitest";
import {
  meetsMulticlassPrerequisite,
  canMulticlass,
  CLASS_NAMES,
  MULTICLASS_PREREQUISITES,
  MULTICLASS_THRESHOLD,
} from "@dnd/shared-algebras/multiclass-prerequisite-algebra";

// ── Helpers ──

function scores(
  options: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>
): Record<string, number> {
  return {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    ...options,
  };
}

// ── Threshold invariant ──

describe("multiclass-prerequisite-algebra", () => {
  it("threshold is always 13", () => {
    expect(MULTICLASS_THRESHOLD).toBe(13);
  });

  it("CLASS_NAMES enumerates exactly 12 classes", () => {
    expect(CLASS_NAMES.length).toBe(12);
    const expected = [
      "barbarian",
      "bard",
      "cleric",
      "druid",
      "fighter",
      "monk",
      "paladin",
      "ranger",
      "rogue",
      "sorcerer",
      "warlock",
      "wizard",
    ];
    expect(CLASS_NAMES).toEqual(expected);
  });

  it("exports the canonical prerequisite table for every class", () => {
    expect(Object.keys(MULTICLASS_PREREQUISITES).sort()).toEqual([...CLASS_NAMES].sort());
  });

  it("canonical table models fighter as STR or DEX", () => {
    expect(MULTICLASS_PREREQUISITES.fighter).toEqual({
      tag: "anyOf",
      prerequisites: [
        { tag: "scoreAtLeast", ability: "str", minimum: MULTICLASS_THRESHOLD },
        { tag: "scoreAtLeast", ability: "dex", minimum: MULTICLASS_THRESHOLD },
      ],
    });
  });

  it("canonical table models monk as DEX and WIS", () => {
    expect(MULTICLASS_PREREQUISITES.monk).toEqual({
      tag: "allOf",
      prerequisites: [
        { tag: "scoreAtLeast", ability: "dex", minimum: MULTICLASS_THRESHOLD },
        { tag: "scoreAtLeast", ability: "wis", minimum: MULTICLASS_THRESHOLD },
      ],
    });
  });

  // ── Single-class prereqs ──

  it("barbarian: STR >= 13 passes", () => {
    expect(meetsMulticlassPrerequisite(scores({ str: 15 }), "barbarian")).toBe(true);
  });

  it("barbarian: STR < 13 fails", () => {
    expect(meetsMulticlassPrerequisite(scores({ str: 10 }), "barbarian")).toBe(false);
  });

  it("bard: CHA >= 13 passes", () => {
    expect(meetsMulticlassPrerequisite(scores({ cha: 15 }), "bard")).toBe(true);
  });

  it("bard: CHA < 13 fails", () => {
    expect(meetsMulticlassPrerequisite(scores({ cha: 8 }), "bard")).toBe(false);
  });

  it("cleric: WIS >= 13 passes", () => {
    expect(meetsMulticlassPrerequisite(scores({ wis: 15 }), "cleric")).toBe(true);
  });

  it("cleric: WIS < 13 fails", () => {
    expect(meetsMulticlassPrerequisite(scores({ wis: 10 }), "cleric")).toBe(false);
  });

  it("druid: WIS >= 13 passes", () => {
    expect(meetsMulticlassPrerequisite(scores({ wis: 15 }), "druid")).toBe(true);
  });

  it("druid: WIS < 13 fails", () => {
    expect(meetsMulticlassPrerequisite(scores({ wis: 10 }), "druid")).toBe(false);
  });

  it("rogue: DEX >= 13 passes", () => {
    expect(meetsMulticlassPrerequisite(scores({ dex: 15 }), "rogue")).toBe(true);
  });

  it("rogue: DEX < 13 fails", () => {
    expect(meetsMulticlassPrerequisite(scores({ dex: 10 }), "rogue")).toBe(false);
  });

  it("sorcerer: CHA >= 13 passes", () => {
    expect(meetsMulticlassPrerequisite(scores({ cha: 15 }), "sorcerer")).toBe(true);
  });

  it("sorcerer: CHA < 13 fails", () => {
    expect(meetsMulticlassPrerequisite(scores({ cha: 8 }), "sorcerer")).toBe(false);
  });

  it("warlock: CHA >= 13 passes", () => {
    expect(meetsMulticlassPrerequisite(scores({ cha: 15 }), "warlock")).toBe(true);
  });

  it("warlock: CHA < 13 fails", () => {
    expect(meetsMulticlassPrerequisite(scores({ cha: 8 }), "warlock")).toBe(false);
  });

  it("wizard: INT >= 13 passes", () => {
    expect(meetsMulticlassPrerequisite(scores({ int: 15 }), "wizard")).toBe(true);
  });

  it("wizard: INT < 13 fails", () => {
    expect(meetsMulticlassPrerequisite(scores({ int: 10 }), "wizard")).toBe(false);
  });

  // ── Fighter (anyOf) ──

  it("fighter: STR >= 13 (DEX < 13) passes", () => {
    expect(
      meetsMulticlassPrerequisite(
        scores({ str: 15, dex: 10 }),
        "fighter"
      )
    ).toBe(true);
  });

  it("fighter: DEX >= 13 (STR < 13) passes", () => {
    expect(
      meetsMulticlassPrerequisite(
        scores({ str: 10, dex: 14 }),
        "fighter"
      )
    ).toBe(true);
  });

  it("fighter: both abilities below 13 fails", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ str: 10, dex: 10 }), "fighter")
    ).toBe(false);
  });

  it("fighter: both abilities >= 13 passes", () => {
    expect(
      meetsMulticlassPrerequisite(
        scores({ str: 15, dex: 15 }),
        "fighter"
      )
    ).toBe(true);
  });

  // ── Monk (allOf) ──

  it("monk: DEX >= 13 AND WIS >= 13 passes", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 15, wis: 15 }), "monk")
    ).toBe(true);
  });

  it("monk: DEX >= 13 but WIS < 13 fails", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 15, wis: 10 }), "monk")
    ).toBe(false);
  });

  it("monk: WIS >= 13 but DEX < 13 fails", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 10, wis: 15 }), "monk")
    ).toBe(false);
  });

  it("monk: both abilities < 13 fails", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 10, wis: 10 }), "monk")
    ).toBe(false);
  });

  // ── Paladin (allOf) ──

  it("paladin: STR >= 13 AND CHA >= 13 passes", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ str: 15, cha: 15 }), "paladin")
    ).toBe(true);
  });

  it("paladin: STR >= 13 but CHA < 13 fails", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ str: 15, cha: 8 }), "paladin")
    ).toBe(false);
  });

  it("paladin: CHA >= 13 but STR < 13 fails", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ str: 8, cha: 15 }), "paladin")
    ).toBe(false);
  });

  // ── Ranger (allOf) ──

  it("ranger: DEX >= 13 AND WIS >= 13 passes", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 15, wis: 15 }), "ranger")
    ).toBe(true);
  });

  it("ranger: DEX >= 13 but WIS < 13 fails", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 15, wis: 10 }), "ranger")
    ).toBe(false);
  });

  it("ranger: WIS >= 13 but DEX < 13 fails", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 10, wis: 15 }), "ranger")
    ).toBe(false);
  });

  // ── Boundary: exactly 13 ──

  it("cleric: WIS exactly 13 passes", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ wis: 13 }), "cleric")
    ).toBe(true);
  });

  it("cleric: WIS 12 fails (below threshold)", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ wis: 12 }), "cleric")
    ).toBe(false);
  });

  it("barbarian: STR exactly 13 passes", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ str: 13 }), "barbarian")
    ).toBe(true);
  });

  it("rogue: DEX exactly 13 passes", () => {
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 13 }), "rogue")
    ).toBe(true);
  });

  // ── canMulticlass ──

  it("canMulticlass returns true when both classes pass", () => {
    // STR 15 (barbarian), WIS 15 (cleric), all >= 13
    expect(
      canMulticlass(
        scores({ str: 15, dex: 15, con: 15, int: 15, wis: 15, cha: 15 }),
        "barbarian",
        "wizard"
      )
    ).toBe(true);
  });

  it("canMulticlass returns false when current class fails", () => {
    // CHA 8 — bard fails
    expect(
      canMulticlass(
        scores({ cha: 8 }),
        "bard",
        "cleric"
      )
    ).toBe(false);
  });

  it("canMulticlass returns false when new class fails", () => {
    // WIS 8 — cleric fails
    expect(
      canMulticlass(
        scores({ wis: 8 }),
        "barbarian",
        "cleric"
      )
    ).toBe(false);
  });
});
