import type {
  WeaponProficiency,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import { weaponMatchesProficiency } from "./weapon-proficiency-algebra.ts";

type WeaponProficiencyFacts = Pick<WeaponRecord, "category" | "properties">;

const martialFinesseWeapon = {
  category: "martial",
  properties: [{ kind: "finesse" }],
} as const satisfies WeaponProficiencyFacts;

describe("weapon proficiency algebra", () => {
  test("category proficiency matches every weapon in that category", () => {
    const proficiency = {
      kind: "weapon_category",
      category: "martial",
    } as const satisfies WeaponProficiency;

    expect(weaponMatchesProficiency(martialFinesseWeapon, proficiency)).toBe(
      true,
    );
    expect(
      weaponMatchesProficiency(
        { category: "martial", properties: [{ kind: "light" }] },
        proficiency,
      ),
    ).toBe(true);
    expect(
      weaponMatchesProficiency(
        { category: "simple", properties: [{ kind: "finesse" }] },
        proficiency,
      ),
    ).toBe(false);
  });

  test("property-restricted proficiency requires its category and any admitted property", () => {
    const proficiency = {
      kind: "weapon_category_with_properties",
      category: "martial",
      anyOfProperties: ["finesse", "light"],
    } as const satisfies WeaponProficiency;

    expect(weaponMatchesProficiency(martialFinesseWeapon, proficiency)).toBe(
      true,
    );
    expect(
      weaponMatchesProficiency(
        { category: "martial", properties: [{ kind: "heavy" }] },
        proficiency,
      ),
    ).toBe(false);
    expect(
      weaponMatchesProficiency(
        { category: "simple", properties: [{ kind: "finesse" }] },
        proficiency,
      ),
    ).toBe(false);
    expect(weaponMatchesProficiency({ category: "martial" }, proficiency)).toBe(
      false,
    );
  });
});
