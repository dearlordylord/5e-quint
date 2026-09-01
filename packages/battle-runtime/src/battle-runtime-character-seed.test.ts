import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";

import {
  characterSeed,
  greataxeWeaponMasterySelections,
  longbowWeaponMasterySelections,
  longswordWeaponMasterySelections,
  quarterstaffWeaponMasterySelections,
  testDaggerAttack,
  testGreataxeAttack,
  testLongswordAttack,
  testQuarterstaffAttack,
  testRangedCleaveLongbowAttack,
  testShortswordAttack,
} from "./battle-runtime.test-support.ts";
import { battleObjectId } from "./identity.ts";

const SELECTED_WEAPON_CASES = [
  {
    name: "Longsword",
    attack: testLongswordAttack,
    selections: longswordWeaponMasterySelections,
    masteryProperty: "sap",
  },
  {
    name: "Greataxe",
    attack: testGreataxeAttack,
    selections: greataxeWeaponMasterySelections,
    masteryProperty: "cleave",
  },
  {
    name: "Quarterstaff",
    attack: testQuarterstaffAttack,
    selections: quarterstaffWeaponMasterySelections,
    masteryProperty: "topple",
  },
] as const;

describe("shared character seed weapon mastery admission", () => {
  for (const testCase of SELECTED_WEAPON_CASES) {
    test(`admits ${testCase.name} mastery facts for a main-hand attack`, () => {
      const seed = characterSeed({
        initiative: 20,
        attack: testCase.attack(),
        weaponMasteries: testCase.selections(),
      });

      expect(seed.creatureInit.attack?.weapon).toMatchObject({
        masteryProperty: testCase.masteryProperty,
      });
    });
  }

  test("admits selected mastery facts for a matching off-hand attack", () => {
    const quarterstaffUnitId = unitId("weapon_quarterstaff");
    const seed = characterSeed({
      initiative: 20,
      attack: null,
      selectedLoadout: {
        offHandWeapon: {
          itemId: battleObjectId("off:weapon_quarterstaff"),
          unitId: quarterstaffUnitId,
        },
      },
      offHandAttack: testQuarterstaffAttack(),
      weaponMasteries: quarterstaffWeaponMasterySelections(),
    });

    expect(seed.creatureInit.offHandAttack?.weapon).toMatchObject({
      weaponUnitId: quarterstaffUnitId,
      masteryProperty: "topple",
    });
  });

  test("keeps unselected attacks free of mastery execution facts", () => {
    const shortswordUnitId = unitId("weapon_shortsword");
    const daggerUnitId = unitId("weapon_dagger");
    const seed = characterSeed({
      initiative: 20,
      selectedLoadout: {
        weapon: {
          itemId: battleObjectId("main:weapon_shortsword"),
          unitId: shortswordUnitId,
          grip: "one_handed",
        },
        offHandWeapon: {
          itemId: battleObjectId("off:weapon_dagger"),
          unitId: daggerUnitId,
        },
      },
      attack: testShortswordAttack(),
      offHandAttack: testDaggerAttack(),
      weaponMasteries: greataxeWeaponMasterySelections(),
    });

    expect(seed.creatureInit.attack?.weapon).not.toHaveProperty(
      "masteryProperty",
    );
    expect(seed.creatureInit.offHandAttack?.weapon).not.toHaveProperty(
      "masteryProperty",
    );
  });

  test("preserves an explicitly admitted synthetic mastery projection", () => {
    const seed = characterSeed({
      initiative: 20,
      attack: testRangedCleaveLongbowAttack(),
      weaponMasteries: longbowWeaponMasterySelections(),
    });

    expect(seed.creatureInit.attack?.weapon).toMatchObject({
      weaponUnitId: "weapon_longbow",
      masteryProperty: "cleave",
    });
  });
});
