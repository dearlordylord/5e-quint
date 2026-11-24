import { describe, expect, test } from "vitest";

import {
  armorClassBehindCover,
  coverArmorClassBonus,
  coverTargeting,
  directTargetCover,
  ruledCoverField,
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

  test("a measured degree becomes a fact's cover field, and no cover no field", () => {
    expect(ruledCoverField("none")).toEqual({});
    expect(ruledCoverField("half")).toEqual({ cover: "half" });
    expect(ruledCoverField("threeQuarters")).toEqual({
      cover: "threeQuarters",
    });
    expect(ruledCoverField("total")).toEqual({ cover: "total" });
  });
});
