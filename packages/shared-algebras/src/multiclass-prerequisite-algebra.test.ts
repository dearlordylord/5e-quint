import { describe, expect, it } from "vitest";

import type { Ability } from "@dnd/shared/types";
import {
  MULTICLASS_PREREQUISITES,
  MULTICLASS_THRESHOLD,
  canMulticlass,
  meetsMulticlassPrerequisite,
} from "@dnd/shared-algebras/multiclass-prerequisite-algebra";

function scores(
  overrides: Partial<Record<Ability, number>> = {},
): Readonly<Record<Ability, number>> {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...overrides };
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
    expect(canMulticlass(scores({ str: 13, wis: 13 }), "barbarian", "druid"))
      .toBe(true);
    expect(canMulticlass(scores({ wis: 13 }), "barbarian", "druid")).toBe(
      false,
    );
    expect(canMulticlass(scores({ str: 13 }), "barbarian", "druid")).toBe(
      false,
    );
  });
});
