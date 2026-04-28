import { describe, expect, it } from "vitest";

import {
  abilityModifier,
  armorClass,
  armorClassDelta,
  currentArmorClass,
  currentCreatureArmorClass,
  defaultArmorClassState,
  statBlockArmorClassState,
  zeroAbilityModifiers,
} from "@dnd/shared-algebras/armor-class-algebra";

describe("reducer armor class state", () => {
  it("derives stat-block AC without storing current AC as a scalar", () => {
    expect(Number(currentArmorClass(statBlockArmorClassState(15)))).toBe(15);
    expect(
      Number(
        currentCreatureArmorClass({
          armorClass: statBlockArmorClassState(15),
        }),
      ),
    ).toBe(15);
  });

  it("derives unarmored ability-sum base AC", () => {
    const armorClassState = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...zeroAbilityModifiers(),
        dex: abilityModifier(2),
      },
    };

    expect(Number(currentArmorClass(armorClassState))).toBe(12);
  });

  it("supports Barbarian-style unarmored defense plus a trained shield", () => {
    const armorClassState = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...zeroAbilityModifiers(),
        dex: abilityModifier(2),
        con: abilityModifier(3),
      },
      base: {
        kind: "ability_sum" as const,
        base: armorClass(10),
        abilityModifiers: ["dex", "con"] as const,
        source: "barbarian_unarmored_defense" as const,
      },
      bonuses: [
        {
          kind: "shield" as const,
          bonus: armorClassDelta(2),
          handUse: "shield" as const,
          trainingRequired: "shield" as const,
        },
      ],
      armorTraining: new Set(["shield" as const]),
      leftHandUse: "shield" as const,
    };

    expect(Number(currentArmorClass(armorClassState))).toBe(17);
  });

  it("does not apply a shield bonus from a non-shield hand use", () => {
    const armorClassState = {
      ...defaultArmorClassState(),
      bonuses: [
        {
          kind: "shield" as const,
          bonus: armorClassDelta(2),
          handUse: "shield" as const,
          trainingRequired: "shield" as const,
        },
      ],
      armorTraining: new Set(["shield" as const]),
      leftHandUse: "grapple" as const,
    };

    expect(Number(currentArmorClass(armorClassState))).toBe(10);
  });

  it("derives armor formulas and caps medium-armor Dexterity", () => {
    const armorClassState = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...zeroAbilityModifiers(),
        dex: abilityModifier(4),
      },
      base: {
        kind: "armor" as const,
        formula: {
          kind: "medium_dex_max_2" as const,
          base: 14,
        },
      },
    };

    expect(Number(currentArmorClass(armorClassState))).toBe(16);
  });

  it("supports unarmored/no-shield bonuses such as Bracers of Defense", () => {
    const bracers = {
      kind: "unarmored_no_shield" as const,
      bonus: armorClassDelta(2),
      sourceUnitId: "magic_item_bracers_of_defense",
    };

    expect(
      Number(
        currentArmorClass({
          ...defaultArmorClassState(),
          bonuses: [bracers],
        }),
      ),
    ).toBe(12);

    expect(
      Number(
        currentArmorClass({
          ...defaultArmorClassState(),
          bonuses: [bracers],
          leftHandUse: "shield",
        }),
      ),
    ).toBe(10);
  });

  it("applies AC floors after base and bonuses", () => {
    const armorClassState = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...zeroAbilityModifiers(),
        dex: abilityModifier(-1),
      },
      floors: [{ floor: armorClass(17), sourceUnitId: "barkskin" }],
    };

    expect(Number(currentArmorClass(armorClassState))).toBe(17);
  });
});
