import { describe, expect, test } from "vitest";

import {
  armorClassBehindCover,
  bonusCover,
  coverArmorClassBonus,
  coverBonus,
  coverBenefit,
  coverTargeting,
  directTargetCover,
  ruledCoverField,
  savingThrowBenefitsFromCover,
} from "./cover-algebra.ts";

describe("cover algebra", () => {
  test("Total Cover prevents direct targeting", () => {
    expect(coverTargeting("total")).toEqual({ tag: "totalCover" });
  });

  test("every other degree is targetable and keeps its degree", () => {
    expect(coverTargeting("none")).toEqual({
      tag: "targetable",
      cover: "none",
    });
    expect(coverTargeting("half")).toEqual({
      tag: "targetable",
      cover: "half",
    });
    expect(coverTargeting("threeQuarters")).toEqual({
      tag: "targetable",
      cover: "threeQuarters",
    });
  });

  test("narrowing keeps a targetable degree and refuses Total Cover", () => {
    expect(directTargetCover("half")).toBe("half");
    expect(directTargetCover("total")).toBeNull();
  });

  test("a target without a ruled degree has no cover", () => {
    expect(directTargetCover(undefined)).toBe("none");
  });

  test("Half Cover adds 2 to AC and Three-Quarters Cover adds 5", () => {
    expect(coverArmorClassBonus("none")).toBe(0);
    expect(coverArmorClassBonus("half")).toBe(2);
    expect(coverArmorClassBonus("threeQuarters")).toBe(5);
    expect(armorClassBehindCover(15, "none")).toBe(15);
    expect(armorClassBehindCover(15, "half")).toBe(17);
    expect(armorClassBehindCover(15, "threeQuarters")).toBe(20);
  });

  test("Half Cover adds 2 and Three-Quarters Cover adds 5 to a Dexterity saving throw", () => {
    expect(coverBonus("half")).toBe(2);
    expect(coverBonus("threeQuarters")).toBe(5);
    expect(coverBenefit("half")).toEqual({ cover: "half", bonus: 2 });
    expect(coverBenefit("threeQuarters")).toEqual({
      cover: "threeQuarters",
      bonus: 5,
    });
  });

  test("only Half Cover and Three-Quarters Cover add a bonus", () => {
    expect(bonusCover("none")).toBeNull();
    expect(bonusCover("half")).toBe("half");
    expect(bonusCover("threeQuarters")).toBe("threeQuarters");
  });

  test("only a Dexterity saving throw benefits from cover", () => {
    expect(savingThrowBenefitsFromCover("dex")).toBe(true);
    for (const ability of ["str", "con", "int", "wis", "cha"] as const) {
      expect(savingThrowBenefitsFromCover(ability)).toBe(false);
    }
  });

  test("a measured degree becomes a fact's cover field, and no cover no field", () => {
    expect(ruledCoverField("none")).toEqual({});
    expect(ruledCoverField("half")).toEqual({ cover: "half" });
    expect(ruledCoverField("threeQuarters")).toEqual({
      cover: "threeQuarters",
    });
    expect(ruledCoverField("total")).toEqual({ cover: "total" });
  });
});
