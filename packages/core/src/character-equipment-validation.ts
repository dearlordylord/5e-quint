import type { CharacterBackground } from "#/character-ability-scores.ts";
import {
  CHARACTER_BACKGROUND_EQUIPMENT_OPTIONS,
  CHARACTER_ARMORS,
  SHIELD_COST_GP,
  type CharacterArmor,
  type CharacterClassEquipmentOption,
  type CharacterCombatEquipmentItem,
  type CharacterWeapon,
} from "#/character-equipment-data.ts";
import {
  ARMOR_DATA,
  CLASS_PACKAGE_DATA,
  WEAPON_DATA,
  WEAPON_GRIPS,
  ownedCombatEquipment,
  startingGoldPieces,
  type CharacterEquipmentChoices,
  type CharacterEquipmentChoicesDraft,
  type CharacterEquipmentSheetLike,
} from "#/character-equipment.ts";
import type { ClassName } from "#/features/class-tables.ts";

export const CHARACTER_EQUIPMENT_ISSUE_CODES = [
  "missingEquipmentChoices",
  "missingBackgroundEquipmentChoice",
  "invalidBackgroundEquipmentChoice",
  "missingClassEquipmentChoice",
  "invalidClassEquipmentChoice",
  "missingRemainingGoldPieces",
  "invalidRemainingGoldPieces",
  "overspentStartingGold",
  "missingLoadout",
  "invalidLoadoutArmor",
  "invalidLoadoutWieldedWeapon",
  "invalidLoadoutSecondaryWeapon",
  "loadoutRequiresOwnedShield",
  "loadoutRequiresWieldedWeapon",
  "invalidWieldedWeaponGrip",
  "wieldedWeaponGripUnavailable",
  "twoHandedWeaponRequiresTwoHandedGrip",
  "secondaryWeaponRequiresOneHandedGrip",
  "shieldRequiresOneHandedGrip",
  "shieldAndSecondaryWeaponConflict",
  "loadoutConsumesSameWeaponTwice",
] as const;
export type CharacterEquipmentIssueCode =
  (typeof CHARACTER_EQUIPMENT_ISSUE_CODES)[number];

export interface CharacterEquipmentIssue {
  readonly code: CharacterEquipmentIssueCode;
  readonly message: string;
}

function countOccurrences<T extends string>(
  items: ReadonlyArray<T>,
  target: T,
): number {
  return items.filter((item) => item === target).length;
}

export function classOptionIsAllowed(
  primaryClass: ClassName,
  option: CharacterClassEquipmentOption,
): boolean {
  return option === "gold" || option === "packageA"
    ? true
    : CLASS_PACKAGE_DATA[primaryClass].packageB != null;
}

function weaponCanUseTwoHands(weapon: CharacterWeapon): boolean {
  const properties = WEAPON_DATA[weapon].properties;
  return properties.includes("twoHanded") || properties.includes("versatile");
}

function weaponRequiresTwoHands(weapon: CharacterWeapon): boolean {
  return WEAPON_DATA[weapon].properties.includes("twoHanded");
}

function combatEquipmentItemCost(item: CharacterCombatEquipmentItem): number {
  if (item === "shield") return SHIELD_COST_GP;
  return (CHARACTER_ARMORS as ReadonlyArray<string>).includes(item)
    ? ARMOR_DATA[item as CharacterArmor].costGp
    : WEAPON_DATA[item as CharacterWeapon].costGp;
}

export function validateCharacterEquipment(params: {
  readonly primaryClass?: ClassName;
  readonly background?: CharacterBackground;
  readonly equipment?: CharacterEquipmentChoicesDraft;
}): ReadonlyArray<CharacterEquipmentIssue> {
  const issues: CharacterEquipmentIssue[] = [];
  const equipment = params.equipment;

  if (equipment == null) {
    return [
      {
        code: "missingEquipmentChoices",
        message: "Starting equipment choices are required.",
      },
    ];
  }

  if (equipment.backgroundOption == null) {
    issues.push({
      code: "missingBackgroundEquipmentChoice",
      message: "Background equipment choice is required.",
    });
  } else if (
    !(CHARACTER_BACKGROUND_EQUIPMENT_OPTIONS as ReadonlyArray<string>).includes(
      equipment.backgroundOption,
    )
  ) {
    issues.push({
      code: "invalidBackgroundEquipmentChoice",
      message: "Background equipment choice is invalid.",
    });
  }

  if (equipment.classOption == null) {
    issues.push({
      code: "missingClassEquipmentChoice",
      message: "Class equipment choice is required.",
    });
  } else if (
    params.primaryClass != null &&
    !classOptionIsAllowed(params.primaryClass, equipment.classOption)
  ) {
    issues.push({
      code: "invalidClassEquipmentChoice",
      message: "Class equipment choice is invalid for the selected class.",
    });
  }

  if (equipment.remainingGoldPieces == null) {
    issues.push({
      code: "missingRemainingGoldPieces",
      message: "Remaining starting gold must be recorded.",
    });
  } else if (
    !Number.isFinite(equipment.remainingGoldPieces) ||
    equipment.remainingGoldPieces < 0
  ) {
    issues.push({
      code: "invalidRemainingGoldPieces",
      message: "Remaining starting gold must be a non-negative number of GP.",
    });
  }

  if (equipment.loadout == null) {
    issues.push({
      code: "missingLoadout",
      message: "Combat loadout choices are required.",
    });
    return issues;
  }
  if (params.primaryClass == null || params.background == null) return issues;

  const finalizedEquipment: CharacterEquipmentChoices = {
    backgroundOption: equipment.backgroundOption ?? "package",
    classOption: equipment.classOption ?? "packageA",
    purchasedCombatEquipment: [...(equipment.purchasedCombatEquipment ?? [])],
    remainingGoldPieces: equipment.remainingGoldPieces ?? 0,
    loadout: {
      wornArmor: equipment.loadout.wornArmor ?? null,
      wieldedWeapon: equipment.loadout.wieldedWeapon ?? null,
      secondaryWeapon: equipment.loadout.secondaryWeapon ?? null,
      shield: equipment.loadout.shield === true,
      wieldedWeaponGrip: equipment.loadout.wieldedWeaponGrip ?? null,
    },
  };
  const sheetLike: CharacterEquipmentSheetLike = {
    primaryClass: params.primaryClass,
    background: params.background,
    equipment: finalizedEquipment,
  };
  const owned = ownedCombatEquipment(sheetLike);
  const { loadout } = equipment;
  const totalCombatSpend =
    (equipment.purchasedCombatEquipment ?? []).reduce(
      (total, item) => total + combatEquipmentItemCost(item),
      0,
    ) + (equipment.remainingGoldPieces ?? 0);

  if (totalCombatSpend > startingGoldPieces(sheetLike)) {
    issues.push({
      code: "overspentStartingGold",
      message:
        "Purchased combat equipment and remaining gold exceed the starting funds granted by the selected class and background choices.",
    });
  }
  if (
    loadout.wornArmor != null &&
    countOccurrences(owned.armor, loadout.wornArmor) < 1
  ) {
    issues.push({
      code: "invalidLoadoutArmor",
      message: "Worn armor must be owned by the sheet.",
    });
  }
  if (
    loadout.wieldedWeapon != null &&
    countOccurrences(owned.weapons, loadout.wieldedWeapon) < 1
  ) {
    issues.push({
      code: "invalidLoadoutWieldedWeapon",
      message: "Wielded weapon must be owned by the sheet.",
    });
  }
  if (
    loadout.secondaryWeapon != null &&
    countOccurrences(owned.weapons, loadout.secondaryWeapon) <
      (loadout.secondaryWeapon === loadout.wieldedWeapon ? 2 : 1)
  ) {
    issues.push({
      code: "invalidLoadoutSecondaryWeapon",
      message: "Secondary weapon must be owned by the sheet.",
    });
  }
  if (loadout.shield === true && owned.shields < 1) {
    issues.push({
      code: "loadoutRequiresOwnedShield",
      message: "Shield loadout requires an owned Shield.",
    });
  }
  if (loadout.secondaryWeapon != null && loadout.wieldedWeapon == null) {
    issues.push({
      code: "loadoutRequiresWieldedWeapon",
      message: "A secondary weapon requires a wielded weapon.",
    });
  }
  if (
    loadout.wieldedWeaponGrip != null &&
    !(WEAPON_GRIPS as ReadonlyArray<string>).includes(loadout.wieldedWeaponGrip)
  ) {
    issues.push({
      code: "invalidWieldedWeaponGrip",
      message: "Weapon grip must be one-handed or two-handed.",
    });
  }
  if (
    loadout.wieldedWeaponGrip === "twoHanded" &&
    loadout.wieldedWeapon != null &&
    !weaponCanUseTwoHands(loadout.wieldedWeapon)
  ) {
    issues.push({
      code: "wieldedWeaponGripUnavailable",
      message: "Selected weapon cannot be used with a two-handed grip.",
    });
  }
  if (
    loadout.wieldedWeapon != null &&
    weaponRequiresTwoHands(loadout.wieldedWeapon) &&
    loadout.wieldedWeaponGrip !== "twoHanded"
  ) {
    issues.push({
      code: "twoHandedWeaponRequiresTwoHandedGrip",
      message: "A Two-Handed weapon requires a two-handed grip in the loadout.",
    });
  }
  if (
    loadout.secondaryWeapon != null &&
    loadout.wieldedWeaponGrip === "twoHanded"
  ) {
    issues.push({
      code: "secondaryWeaponRequiresOneHandedGrip",
      message:
        "A secondary weapon requires the wielded weapon to use one hand.",
    });
  }
  if (loadout.shield === true && loadout.wieldedWeaponGrip === "twoHanded") {
    issues.push({
      code: "shieldRequiresOneHandedGrip",
      message: "A Shield requires the wielded weapon to use one hand.",
    });
  }
  if (loadout.shield === true && loadout.secondaryWeapon != null) {
    issues.push({
      code: "shieldAndSecondaryWeaponConflict",
      message:
        "A Shield and a secondary weapon cannot both occupy the other hand.",
    });
  }
  if (
    loadout.wieldedWeapon != null &&
    loadout.secondaryWeapon != null &&
    loadout.wieldedWeapon === loadout.secondaryWeapon &&
    countOccurrences(owned.weapons, loadout.wieldedWeapon) < 2
  ) {
    issues.push({
      code: "loadoutConsumesSameWeaponTwice",
      message:
        "The same owned weapon cannot fill both weapon slots unless two copies are owned.",
    });
  }

  return issues;
}
