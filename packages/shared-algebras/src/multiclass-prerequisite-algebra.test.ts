import { describe, expect, it } from "vitest";
import { Either } from "effect";

import type { Ability } from "@dnd/shared/types";
import {
  MULTICLASS_PREREQUISITES,
  MULTICLASS_THRESHOLD,
  canMulticlass,
  meetsMulticlassPrerequisite,
  multiclassAbilityScores,
  multiclassClassChange,
  type MulticlassAbilityScores,
  type MulticlassClassChange,
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

describe("multiclass-prerequisite-algebra", () => {
  it("exposes the canonical SRD threshold and representative table facts", () => {
    expect(MULTICLASS_THRESHOLD).toBe(13);
    expect(MULTICLASS_PREREQUISITES.barbarian).toEqual({
      tag: "scoreAtLeast",
      ability: "str",
      minimum: 13,
    });
    expect(MULTICLASS_PREREQUISITES.wizard).toEqual({
      tag: "scoreAtLeast",
      ability: "int",
      minimum: 13,
    });
  });

  it("passes and fails single-primary-ability prerequisites", () => {
    expect(meetsMulticlassPrerequisite(scores({ str: 13 }), "barbarian")).toBe(
      true,
    );
    expect(meetsMulticlassPrerequisite(scores({ str: 12 }), "barbarian")).toBe(
      false,
    );
    expect(meetsMulticlassPrerequisite(scores({ cha: 13 }), "bard")).toBe(true);
    expect(meetsMulticlassPrerequisite(scores(), "bard")).toBe(false);
    expect(meetsMulticlassPrerequisite(scores({ int: 13 }), "wizard")).toBe(
      true,
    );
    expect(meetsMulticlassPrerequisite(scores(), "wizard")).toBe(false);
  });

  it("treats Fighter's Strength or Dexterity prerequisite as either/or", () => {
    expect(meetsMulticlassPrerequisite(scores({ str: 13 }), "fighter")).toBe(
      true,
    );
    expect(meetsMulticlassPrerequisite(scores({ dex: 13 }), "fighter")).toBe(
      true,
    );
    expect(meetsMulticlassPrerequisite(scores(), "fighter")).toBe(false);
  });

  it("treats Monk, Paladin, and Ranger prerequisites as all required", () => {
    expect(meetsMulticlassPrerequisite(scores({ dex: 13 }), "monk")).toBe(
      false,
    );
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 13, wis: 13 }), "monk"),
    ).toBe(true);

    expect(meetsMulticlassPrerequisite(scores({ str: 13 }), "paladin")).toBe(
      false,
    );
    expect(
      meetsMulticlassPrerequisite(scores({ str: 13, cha: 13 }), "paladin"),
    ).toBe(true);

    expect(meetsMulticlassPrerequisite(scores({ wis: 13 }), "ranger")).toBe(
      false,
    );
    expect(
      meetsMulticlassPrerequisite(scores({ dex: 13, wis: 13 }), "ranger"),
    ).toBe(true);
  });

  it("requires current and new class prerequisites for multiclassing", () => {
    expect(
      canMulticlass(
        scores({ str: 13, wis: 13 }),
        classChange({ currentClasses: ["barbarian"], newClass: "druid" }),
      ),
    ).toBe(true);
    expect(
      canMulticlass(
        scores({ wis: 13 }),
        classChange({ currentClasses: ["barbarian"], newClass: "druid" }),
      ),
    ).toBe(false);
    expect(
      canMulticlass(
        scores({ str: 13 }),
        classChange({ currentClasses: ["barbarian"], newClass: "druid" }),
      ),
    ).toBe(false);
  });

  it("requires all current class prerequisites for multiclassing", () => {
    expect(
      canMulticlass(
        scores({ dex: 13, wis: 13, int: 13 }),
        classChange({
          currentClasses: ["rogue", "druid"],
          newClass: "wizard",
        }),
      ),
    ).toBe(true);
    expect(
      canMulticlass(
        scores({ wis: 13, int: 13 }),
        classChange({
          currentClasses: ["rogue", "druid"],
          newClass: "wizard",
        }),
      ),
    ).toBe(false);
    expect(
      canMulticlass(
        scores({ dex: 13, int: 13 }),
        classChange({
          currentClasses: ["rogue", "druid"],
          newClass: "wizard",
        }),
      ),
    ).toBe(false);
    expect(
      canMulticlass(
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
