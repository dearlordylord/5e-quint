import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Option, Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterBuildCatalogEquipmentItem,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  type CharacterBuild,
  type CharacterEquipmentItemId,
  type CharacterEquipmentItemSlot,
} from "@dnd/character-creation-runtime";
import {
  characterSheetEquipmentLoadoutIssueMessage,
  setCharacterSheetEquipmentLoadout,
  type CharacterSheetEquipmentLoadoutIssue,
} from "./index.ts";
import {
  armorClassBuild,
  requireSuccess,
  unitLibrary,
} from "./test-support.test-support.ts";

function equipmentItemId<const Slot extends CharacterEquipmentItemSlot>(
  slot: Slot,
  unitId: string,
): CharacterEquipmentItemId<Slot> {
  return characterEquipmentItemId({
    slot,
    unitId: requireSuccess(
      characterEquipmentItemUnitId(authoredUnitId(unitId)),
    ),
  });
}

function catalogItem(itemId: CharacterEquipmentItemId) {
  return characterBuildCatalogEquipmentItem({ itemId });
}

function failureIssues(
  result: ReturnType<typeof setCharacterSheetEquipmentLoadout>,
): readonly CharacterSheetEquipmentLoadoutIssue[] {
  if (Result.isFailure(result)) return result.failure;
  throw new Error("Expected an equipment loadout rejection.");
}

describe("Character Sheet equipment loadout ownership", () => {
  test("rejects an empty patch before reading the build", () => {
    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build: armorClassBuild({ startingClass: "class_fighter" }),
        patch: {},
        unitLibrary,
      }),
    );

    expect(issues).toEqual([{ tag: "emptyEquipmentLoadoutPatch" }]);
  });

  test("reports an unknown selected equipment Unit", () => {
    const unknown = equipmentItemId("armor", "synthetic_unknown_equipment");

    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build: armorClassBuild({ startingClass: "class_fighter" }),
        patch: { armor: unknown },
        unitLibrary,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          tag: "equipmentItemUnknown",
          itemId: unknown,
          unitId: "synthetic_unknown_equipment",
        },
      ]),
    );
  });

  test("requires exact armor ownership rather than a same-unit weapon reference", () => {
    const armor = equipmentItemId("armor", "armor_chain_mail");
    const mainSlotAlias = equipmentItemId("main", "armor_chain_mail");
    const base = armorClassBuild({
      startingClass: "class_fighter",
      armor: "armor_chain_mail",
    });
    const build: CharacterBuild = {
      ...base,
      equipment: {
        ...base.equipment,
        owned: [catalogItem(mainSlotAlias)],
      },
    };

    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build,
        patch: { armor },
        unitLibrary,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          tag: "equipmentItemNotOwned",
          itemId: armor,
          nextAction: "useOwnedCatalogItemReference",
        },
      ]),
    );
  });

  test("requires exact shield ownership rather than a same-unit weapon reference", () => {
    const shield = equipmentItemId("shield", "equipment_shield");
    const mainSlotAlias = equipmentItemId("main", "equipment_shield");
    const base = armorClassBuild({
      startingClass: "class_fighter",
      shield: true,
    });
    const build: CharacterBuild = {
      ...base,
      equipment: {
        ...base.equipment,
        owned: [catalogItem(mainSlotAlias)],
      },
    };

    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build,
        patch: { shield },
        unitLibrary,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          tag: "equipmentItemNotOwned",
          itemId: shield,
          nextAction: "useOwnedCatalogItemReference",
        },
      ]),
    );
  });

  test("rejects a selected Unit kind that does not match its loadout slot", () => {
    const wrongArmor = equipmentItemId("armor", "weapon_dagger");
    const base = armorClassBuild({
      startingClass: "class_fighter",
      weapon: "weapon_dagger",
    });

    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build: base,
        patch: { armor: wrongArmor },
        unitLibrary,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          tag: "equipmentItemWrongKind",
          itemId: wrongArmor,
          slot: "armor",
          expectedKind: "armor",
          actualKind: "weapon",
        },
      ]),
    );
  });

  test("allows moving an owned main-hand weapon reference into the off hand", () => {
    const off = equipmentItemId("off", "weapon_dagger");
    const build = armorClassBuild({
      startingClass: "class_fighter",
      weapon: "weapon_dagger",
    });

    const result = setCharacterSheetEquipmentLoadout({
      build,
      patch: {
        weapon: null,
        offHandWeapon: { itemId: off },
      },
      unitLibrary,
    });

    expect(result).toEqual(Result.succeed({ offHandWeapon: { itemId: off } }));
  });

  test("requires armor training for a selected armor category", () => {
    const armor = equipmentItemId("armor", "armor_chain_mail");
    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build: armorClassBuild({
          startingClass: "class_wizard",
          armor: "armor_chain_mail",
        }),
        patch: { armor },
        unitLibrary,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        { tag: "armorTrainingRequired", itemId: armor, category: "heavy" },
      ]),
    );
  });

  test("requires shield training for a selected shield", () => {
    const shield = equipmentItemId("shield", "equipment_shield");
    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build: armorClassBuild({ startingClass: "class_wizard", shield: true }),
        patch: { shield },
        unitLibrary,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        { tag: "shieldTrainingRequired", itemId: shield },
      ]),
    );
  });

  test("rejects a two-handed weapon in a one-handed loadout grip", () => {
    const weapon = equipmentItemId("main", "weapon_greataxe");
    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build: armorClassBuild({
          startingClass: "class_fighter",
          weapon: "weapon_greataxe",
        }),
        patch: { weapon: { itemId: weapon, grip: "one_handed" } },
        unitLibrary,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        { tag: "weaponCannotBeHeldOneHanded", itemId: weapon },
      ]),
    );
  });

  test("rejects a shield and off-hand weapon occupying the same loadout", () => {
    const shield = equipmentItemId("shield", "equipment_shield");
    const off = equipmentItemId("off", "weapon_dagger");
    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build: armorClassBuild({
          startingClass: "class_fighter",
          shield: true,
          offHandWeapon: "weapon_dagger",
        }),
        patch: { shield, offHandWeapon: { itemId: off } },
        unitLibrary,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([{ tag: "shieldAndOffHandWeaponConflict" }]),
    );
  });

  test("reports insufficient quantity when both hands select one owned weapon", () => {
    const main = equipmentItemId("main", "weapon_dagger");
    const off = equipmentItemId("off", "weapon_dagger");
    const base = armorClassBuild({
      startingClass: "class_fighter",
      weapon: "weapon_dagger",
      offHandWeapon: "weapon_dagger",
    });
    const build: CharacterBuild = {
      ...base,
      equipment: {
        ...base.equipment,
        owned: [catalogItem(main)],
      },
    };

    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build,
        patch: { weapon: { itemId: main, grip: "one_handed" } },
        unitLibrary,
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          tag: "equipmentQuantityInsufficient",
          itemId: off,
          required: 2,
          available: 1,
        },
      ]),
    );
  });

  test("retains a typed armor-training issue when the class catalog is unavailable", () => {
    const unavailableClassCatalog = {
      ...unitLibrary,
      getUnit: (id: string) =>
        id === "class_fighter" ? Option.none() : unitLibrary.getUnit(id),
    };

    const issues = failureIssues(
      setCharacterSheetEquipmentLoadout({
        build: armorClassBuild({ startingClass: "class_fighter" }),
        patch: { armor: null },
        unitLibrary: unavailableClassCatalog,
      }),
    );

    expect(issues[0]).toMatchObject({ tag: "armorTrainingUnavailable" });
  });

  test("renders every equipment loadout issue variant", () => {
    const armor = equipmentItemId("armor", "armor_chain_mail");
    const shield = equipmentItemId("shield", "equipment_shield");
    const weapon = equipmentItemId("main", "weapon_greataxe");
    const unknown = equipmentItemId("armor", "synthetic_unknown_equipment");
    const issues: CharacterSheetEquipmentLoadoutIssue[] = [
      { tag: "emptyEquipmentLoadoutPatch" },
      {
        tag: "equipmentItemUnknown",
        itemId: unknown,
        unitId: "synthetic_unknown_equipment",
      },
      {
        tag: "equipmentItemNotOwned",
        itemId: armor,
        nextAction: "useOwnedCatalogItemReference",
      },
      {
        tag: "equipmentItemWrongKind",
        itemId: armor,
        slot: "armor",
        expectedKind: "armor",
        actualKind: "weapon",
      },
      { tag: "armorTrainingRequired", itemId: armor, category: "heavy" },
      { tag: "shieldTrainingRequired", itemId: shield },
      { tag: "weaponCannotBeHeldOneHanded", itemId: weapon },
      { tag: "shieldAndOffHandWeaponConflict" },
      {
        tag: "equipmentQuantityInsufficient",
        itemId: armor,
        required: 2,
        available: 1,
      },
      { tag: "armorTrainingUnavailable", message: "synthetic issue" },
    ];

    expect(issues.map(characterSheetEquipmentLoadoutIssueMessage)).toEqual([
      "Equipment loadout operation must change at least one slot.",
      "Equipment item armor:synthetic_unknown_equipment references unknown Unit synthetic_unknown_equipment.",
      "Equipment item armor:armor_chain_mail has no canonical owned item reference; use an item reference returned in build.equipment.owned.",
      "Equipment item armor:armor_chain_mail is a weapon Unit and cannot fill the armor slot.",
      "Wearing armor armor:armor_chain_mail requires heavy armor training.",
      "Wielding shield shield:equipment_shield requires shield training.",
      "Weapon main:weapon_greataxe cannot be held one-handed.",
      "A shield and an off-hand weapon cannot occupy the same loadout.",
      "Equipment item armor:armor_chain_mail has quantity 1, but this loadout requires 2.",
      "synthetic issue",
    ]);
  });
});
