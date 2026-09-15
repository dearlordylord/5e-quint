import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Result } from "effect";
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
});
