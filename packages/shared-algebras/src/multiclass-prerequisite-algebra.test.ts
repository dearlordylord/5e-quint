import { describe, expect, it } from "vitest";
import { Either } from "effect";

import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import type { Ability } from "@dnd/shared/types";
import {
  CLASS_NAMES,
  MULTICLASS_PREREQUISITES,
  MULTICLASS_THRESHOLD,
  canMulticlass,
  meetsMulticlassPrerequisite,
  multiclassAbilityScores,
  multiclassClassChange,
  multiclassPrerequisiteFromPrimaryAbilities,
  multiclassPrerequisitesFromSrdClassContainers,
  type MulticlassAbilityScores,
  type MulticlassClassChange,
  type MulticlassPrerequisiteTable,
} from "@dnd/shared-algebras/multiclass-prerequisite-algebra";

function scores(
  overrides: Partial<Record<Ability, number>> = {},
): MulticlassAbilityScores {
  const result = multiclassAbilityScores({
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    ...overrides,
  });
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test scores: ${result.left[0].tag}`);
  }
  return result.right;
}

function classChange(
  input: Parameters<typeof multiclassClassChange>[0],
): MulticlassClassChange {
  const result = multiclassClassChange(input);
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test class change: ${result.left.tag}`);
  }
  return result.right;
}

function prerequisiteTable(): MulticlassPrerequisiteTable {
  if (Either.isLeft(MULTICLASS_PREREQUISITES)) {
    throw new Error(
      `Invalid SRD multiclass prerequisite table: ${MULTICLASS_PREREQUISITES.left[0].tag}`,
    );
  }
  return MULTICLASS_PREREQUISITES.right;
}

function meets(
  scoreAssignment: MulticlassAbilityScores,
  className: Parameters<typeof meetsMulticlassPrerequisite>[1],
): boolean {
  const result = meetsMulticlassPrerequisite(scoreAssignment, className);
  if (Either.isLeft(result)) {
    throw new Error(
      `Invalid multiclass prerequisite lookup: ${result.left[0].tag}`,
    );
  }
  return result.right;
}

function canAddClass(
  scoreAssignment: MulticlassAbilityScores,
  change: MulticlassClassChange,
): boolean {
  const result = canMulticlass(scoreAssignment, change);
  if (Either.isLeft(result)) {
    throw new Error(
      `Invalid multiclass prerequisite lookup: ${result.left[0].tag}`,
    );
  }
  return result.right;
}

describe("multiclass-prerequisite-algebra", () => {
  it("derives every SRD class prerequisite from class container Primary Ability facts", () => {
    const table = prerequisiteTable();
    const classFacts = srdUnitCollection.units
      .map(readClassCreationFacts)
      .filter((result) => result.tag === "readable")
      .map((result) => result.value);

    expect(classFacts.map((facts) => facts.className).sort()).toEqual(
      [...CLASS_NAMES].sort(),
    );

    for (const facts of classFacts) {
      expect(table.get(facts.className)).toEqual(
        multiclassPrerequisiteFromPrimaryAbilities(facts.primaryAbilities),
      );
    }
  });

  it("reports missing SRD class containers as typed table issues", () => {
    const result = multiclassPrerequisitesFromSrdClassContainers([]);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toContainEqual({
      tag: "missingSrdClassContainer",
      className: "barbarian",
    });
  });

  it("reports duplicate SRD class containers as typed table issues", () => {
    const barbarian = srdUnitCollection.units.find(
      (unit) => unit.kind === "class" && unit.className === "barbarian",
    );
    if (barbarian === undefined) {
      throw new Error("Missing Barbarian class fixture");
    }

    const result = multiclassPrerequisitesFromSrdClassContainers([
      barbarian,
      barbarian,
    ]);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toContainEqual({
      tag: "duplicateSrdClassContainer",
      className: "barbarian",
    });
  });

  it("projects class Primary Ability expressions into SRD prerequisite operators", () => {
    expect(
      multiclassPrerequisiteFromPrimaryAbilities({
        kind: "all_of",
        abilities: ["wis"],
      }),
    ).toEqual({
      tag: "scoreAtLeast",
      ability: "wis",
      minimum: MULTICLASS_THRESHOLD,
    });
    expect(
      multiclassPrerequisiteFromPrimaryAbilities({
        kind: "all_of",
        abilities: ["dex", "wis"],
      }),
    ).toEqual({
      tag: "allOf",
      prerequisites: [
        {
          tag: "scoreAtLeast",
          ability: "dex",
          minimum: MULTICLASS_THRESHOLD,
        },
        {
          tag: "scoreAtLeast",
          ability: "wis",
          minimum: MULTICLASS_THRESHOLD,
        },
      ],
    });
    expect(
      multiclassPrerequisiteFromPrimaryAbilities({
        kind: "any_of",
        abilities: ["str", "dex"],
      }),
    ).toEqual({
      tag: "anyOf",
      prerequisites: [
        {
          tag: "scoreAtLeast",
          ability: "str",
          minimum: MULTICLASS_THRESHOLD,
        },
        {
          tag: "scoreAtLeast",
          ability: "dex",
          minimum: MULTICLASS_THRESHOLD,
        },
      ],
    });
  });

  it("exposes the canonical SRD threshold and representative table facts", () => {
    const table = prerequisiteTable();

    expect(MULTICLASS_THRESHOLD).toBe(13);
    expect(table.get("barbarian")).toEqual({
      tag: "scoreAtLeast",
      ability: "str",
      minimum: 13,
    });
    expect(table.get("wizard")).toEqual({
      tag: "scoreAtLeast",
      ability: "int",
      minimum: 13,
    });
  });

  it("passes and fails single-primary-ability prerequisites", () => {
    expect(meets(scores({ str: 13 }), "barbarian")).toBe(true);
    expect(meets(scores({ str: 12 }), "barbarian")).toBe(false);
    expect(meets(scores({ cha: 13 }), "bard")).toBe(true);
    expect(meets(scores(), "bard")).toBe(false);
    expect(meets(scores({ int: 13 }), "wizard")).toBe(true);
    expect(meets(scores(), "wizard")).toBe(false);
  });

  it("treats Fighter's Strength or Dexterity prerequisite as either/or", () => {
    expect(meets(scores({ str: 13 }), "fighter")).toBe(true);
    expect(meets(scores({ dex: 13 }), "fighter")).toBe(true);
    expect(meets(scores(), "fighter")).toBe(false);
  });

  it("treats Monk, Paladin, and Ranger prerequisites as all required", () => {
    expect(meets(scores({ dex: 13 }), "monk")).toBe(false);
    expect(meets(scores({ dex: 13, wis: 13 }), "monk")).toBe(true);

    expect(meets(scores({ str: 13 }), "paladin")).toBe(false);
    expect(meets(scores({ str: 13, cha: 13 }), "paladin")).toBe(true);

    expect(meets(scores({ wis: 13 }), "ranger")).toBe(false);
    expect(meets(scores({ dex: 13, wis: 13 }), "ranger")).toBe(true);
  });

  it("requires current and new class prerequisites for multiclassing", () => {
    expect(
      canAddClass(
        scores({ str: 13, wis: 13 }),
        classChange({ currentClasses: ["barbarian"], newClass: "druid" }),
      ),
    ).toBe(true);
    expect(
      canAddClass(
        scores({ wis: 13 }),
        classChange({ currentClasses: ["barbarian"], newClass: "druid" }),
      ),
    ).toBe(false);
    expect(
      canAddClass(
        scores({ str: 13 }),
        classChange({ currentClasses: ["barbarian"], newClass: "druid" }),
      ),
    ).toBe(false);
  });

  it("requires all current class prerequisites for multiclassing", () => {
    expect(
      canAddClass(
        scores({ dex: 13, wis: 13, int: 13 }),
        classChange({
          currentClasses: ["rogue", "druid"],
          newClass: "wizard",
        }),
      ),
    ).toBe(true);
    expect(
      canAddClass(
        scores({ wis: 13, int: 13 }),
        classChange({
          currentClasses: ["rogue", "druid"],
          newClass: "wizard",
        }),
      ),
    ).toBe(false);
    expect(
      canAddClass(
        scores({ dex: 13, int: 13 }),
        classChange({
          currentClasses: ["rogue", "druid"],
          newClass: "wizard",
        }),
      ),
    ).toBe(false);
    expect(
      canAddClass(
        scores({ dex: 13, wis: 13 }),
        classChange({
          currentClasses: ["rogue", "druid"],
          newClass: "wizard",
        }),
      ),
    ).toBe(false);
  });

  it("rejects non-multiclass class changes at the parsing boundary", () => {
    expect(
      multiclassClassChange({
        currentClasses: [],
        newClass: "fighter",
      }),
    ).toEqual(Either.left({ tag: "missingCurrentClass" }));
    expect(
      multiclassClassChange({
        currentClasses: ["fighter", "fighter"],
        newClass: "wizard",
      }),
    ).toEqual(
      Either.left({ tag: "duplicateCurrentClass", className: "fighter" }),
    );
    expect(
      multiclassClassChange({
        currentClasses: ["fighter"],
        newClass: "fighter",
      }),
    ).toEqual(
      Either.left({ tag: "newClassAlreadyCurrent", className: "fighter" }),
    );
  });

  it("rejects invalid score maps at the parsing boundary", () => {
    expect(() => scores({ str: 31 })).toThrow();
  });
});
