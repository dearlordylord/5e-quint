import {
  characterBuildArmorTraining,
  characterEquipmentItemSourceFromId,
  characterCreationIssueMessage,
  type CharacterBuild,
  type CharacterBuildLoadout,
  type CharacterEquipmentItemId,
  type CharacterEquipmentItemSlot,
  type UnitCatalog,
} from "@dnd/character-creation-runtime/consumer-protocol";
import { Match, Option, Result } from "effect";

import type { UnitRecord } from "@dnd/surface/surface/types";

export type CharacterSheetEquipmentLoadoutPatch = {
  readonly armor?: CharacterEquipmentItemId<"armor"> | null;
  readonly shield?: CharacterEquipmentItemId<"shield"> | null;
  readonly weapon?: {
    readonly itemId: CharacterEquipmentItemId<"main">;
    readonly grip: "one_handed";
  } | null;
  readonly offHandWeapon?: {
    readonly itemId: CharacterEquipmentItemId<"off">;
  } | null;
};

export type CharacterSheetEquipmentLoadoutIssue =
  | {
      readonly tag: "emptyEquipmentLoadoutPatch";
    }
  | {
      readonly tag: "equipmentItemUnknown";
      readonly itemId: CharacterEquipmentItemId;
      readonly unitId: string;
    }
  | {
      readonly tag: "equipmentItemNotOwned";
      readonly itemId: CharacterEquipmentItemId;
      readonly nextAction: "useOwnedCatalogItemReference";
    }
  | {
      readonly tag: "equipmentItemWrongKind";
      readonly itemId: CharacterEquipmentItemId;
      readonly slot: CharacterEquipmentItemSlot;
      readonly expectedKind: "armor" | "shield" | "weapon";
      readonly actualKind: UnitRecord["kind"];
    }
  | {
      readonly tag: "armorTrainingRequired";
      readonly itemId: CharacterEquipmentItemId<"armor">;
      readonly category: "light" | "medium" | "heavy";
    }
  | {
      readonly tag: "shieldTrainingRequired";
      readonly itemId: CharacterEquipmentItemId<"shield">;
    }
  | {
      readonly tag: "weaponCannotBeHeldOneHanded";
      readonly itemId: CharacterEquipmentItemId;
    }
  | {
      readonly tag: "shieldAndOffHandWeaponConflict";
    }
  | {
      readonly tag: "equipmentQuantityInsufficient";
      readonly itemId: CharacterEquipmentItemId;
      readonly required: number;
      readonly available: number;
    }
  | {
      readonly tag: "armorTrainingUnavailable";
      readonly message: string;
    };

export type CharacterSheetEquipmentLoadoutIssues = readonly [
  CharacterSheetEquipmentLoadoutIssue,
  ...CharacterSheetEquipmentLoadoutIssue[],
];

/**
 * Apply a session-owned equipment patch after validating all selected items
 * against the build's owned inventory, the installed catalog, and the
 * character's armor training. No state is changed when any independent check
 * fails.
 */
export function setCharacterSheetEquipmentLoadout(input: {
  readonly build: CharacterBuild;
  readonly patch: CharacterSheetEquipmentLoadoutPatch;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<CharacterBuildLoadout, CharacterSheetEquipmentLoadoutIssues> {
  const patchKeys = Object.keys(input.patch);
  if (patchKeys.length === 0) {
    return Result.fail([{ tag: "emptyEquipmentLoadoutPatch" }]);
  }

  const loadout = mergeEquipmentLoadout(
    input.build.equipment.loadout,
    input.patch,
  );
  const issues: CharacterSheetEquipmentLoadoutIssue[] = [];
  const armorTraining = characterBuildArmorTraining(
    input.build,
    input.unitLibrary,
  );
  const armorTrainingSet = new Set(
    Result.isSuccess(armorTraining) ? armorTraining.success : [],
  );
  if (Result.isFailure(armorTraining)) {
    issues.push({
      tag: "armorTrainingUnavailable",
      message: armorTraining.failure
        .map(characterCreationIssueMessage)
        .join(" "),
    });
  }

  const ownedQuantityByUnitId = ownedEquipmentQuantityByUnitId(input.build);
  const selected = selectedLoadoutItems(loadout);
  const selectedQuantityByUnitId = new Map<string, number>();
  const selectedItemIdByUnitId = new Map<string, CharacterEquipmentItemId>();

  for (const selectedItem of selected) {
    const source = characterEquipmentItemSourceFromId(selectedItem.itemId);
    const unit = input.unitLibrary.getUnit(source.unitId);
    if (Option.isNone(unit)) {
      issues.push({
        tag: "equipmentItemUnknown",
        itemId: selectedItem.itemId,
        unitId: source.unitId,
      });
      continue;
    }

    const currentQuantity = selectedQuantityByUnitId.get(source.unitId) ?? 0;
    selectedQuantityByUnitId.set(source.unitId, currentQuantity + 1);
    selectedItemIdByUnitId.set(source.unitId, selectedItem.itemId);
    validateSelectedEquipmentItem({
      itemId: selectedItem.itemId,
      slot: selectedItem.slot,
      unit: unit.value,
      armorTrainingSet,
      issues,
    });
  }

  for (const [unitId, required] of selectedQuantityByUnitId) {
    const available = ownedQuantityByUnitId.get(unitId) ?? 0;
    const itemId = selectedItemIdByUnitId.get(unitId);
    if (itemId === undefined) continue;
    if (available === 0) {
      issues.push({
        tag: "equipmentItemNotOwned",
        itemId,
        nextAction: "useOwnedCatalogItemReference",
      });
    } else if (required > available) {
      issues.push({
        tag: "equipmentQuantityInsufficient",
        itemId,
        required,
        available,
      });
    }
  }

  if (loadout.shield !== undefined && loadout.offHandWeapon !== undefined) {
    issues.push({ tag: "shieldAndOffHandWeaponConflict" });
  }

  return issues.length > 0
    ? Result.fail([issues[0], ...issues.slice(1)])
    : Result.succeed(loadout);
}

export function characterSheetEquipmentLoadoutIssueMessage(
  issue: CharacterSheetEquipmentLoadoutIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "emptyEquipmentLoadoutPatch" },
      () => "Equipment loadout operation must change at least one slot.",
    ),
    Match.when(
      { tag: "equipmentItemUnknown" },
      (matched) =>
        `Equipment item ${matched.itemId} references unknown Unit ${matched.unitId}.`,
    ),
    Match.when(
      { tag: "equipmentItemNotOwned" },
      (matched) =>
        `Equipment item ${matched.itemId} has no canonical owned item reference; use an item reference returned in build.equipment.owned.`,
    ),
    Match.when(
      { tag: "equipmentItemWrongKind" },
      (matched) =>
        `Equipment item ${matched.itemId} is a ${matched.actualKind} Unit and cannot fill the ${matched.slot} slot.`,
    ),
    Match.when(
      { tag: "armorTrainingRequired" },
      (matched) =>
        `Wearing armor ${matched.itemId} requires ${matched.category} armor training.`,
    ),
    Match.when(
      { tag: "shieldTrainingRequired" },
      (matched) =>
        `Wielding shield ${matched.itemId} requires shield training.`,
    ),
    Match.when(
      { tag: "weaponCannotBeHeldOneHanded" },
      (matched) => `Weapon ${matched.itemId} cannot be held one-handed.`,
    ),
    Match.when(
      { tag: "shieldAndOffHandWeaponConflict" },
      () => "A shield and an off-hand weapon cannot occupy the same loadout.",
    ),
    Match.when(
      { tag: "equipmentQuantityInsufficient" },
      (matched) =>
        `Equipment item ${matched.itemId} has quantity ${matched.available}, but this loadout requires ${matched.required}.`,
    ),
    Match.when(
      { tag: "armorTrainingUnavailable" },
      (matched) => matched.message,
    ),
    Match.exhaustive,
  );
}

type SelectedLoadoutItem = {
  readonly itemId: CharacterEquipmentItemId;
  readonly slot: CharacterEquipmentItemSlot;
};

function selectedLoadoutItems(
  loadout: CharacterBuildLoadout,
): readonly SelectedLoadoutItem[] {
  return [
    ...(loadout.armor === undefined
      ? []
      : [{ itemId: loadout.armor, slot: "armor" as const }]),
    ...(loadout.shield === undefined
      ? []
      : [{ itemId: loadout.shield, slot: "shield" as const }]),
    ...(loadout.weapon === undefined
      ? []
      : [{ itemId: loadout.weapon.itemId, slot: "main" as const }]),
    ...(loadout.offHandWeapon === undefined
      ? []
      : [{ itemId: loadout.offHandWeapon.itemId, slot: "off" as const }]),
  ];
}

function ownedEquipmentQuantityByUnitId(
  build: CharacterBuild,
): ReadonlyMap<string, number> {
  const quantities = new Map<string, number>();
  for (const item of build.equipment.owned) {
    if (item.kind !== "catalogItem" && item.kind !== "authoredCatalogItem") {
      continue;
    }
    const unitId = characterEquipmentItemSourceFromId(item.itemId).unitId;
    quantities.set(unitId, (quantities.get(unitId) ?? 0) + item.quantity);
  }
  return quantities;
}

function validateSelectedEquipmentItem(input: {
  readonly itemId: CharacterEquipmentItemId;
  readonly slot: CharacterEquipmentItemSlot;
  readonly unit: UnitRecord;
  readonly armorTrainingSet: ReadonlySet<string>;
  readonly issues: CharacterSheetEquipmentLoadoutIssue[];
}): void {
  const expectedKind = expectedKindForSlot(input.slot);
  if (input.unit.kind !== expectedKind) {
    input.issues.push({
      tag: "equipmentItemWrongKind",
      itemId: input.itemId,
      slot: input.slot,
      expectedKind,
      actualKind: input.unit.kind,
    });
    return;
  }
  if (input.unit.kind === "armor") {
    if (!input.armorTrainingSet.has(input.unit.category)) {
      input.issues.push({
        tag: "armorTrainingRequired",
        itemId: input.itemId as CharacterEquipmentItemId<"armor">,
        category: input.unit.category,
      });
    }
    return;
  }
  if (input.unit.kind === "shield") {
    if (!input.armorTrainingSet.has("shield")) {
      input.issues.push({
        tag: "shieldTrainingRequired",
        itemId: input.itemId as CharacterEquipmentItemId<"shield">,
      });
    }
    return;
  }
  if (input.unit.properties?.some(({ kind }) => kind === "two_handed")) {
    input.issues.push({
      tag: "weaponCannotBeHeldOneHanded",
      itemId: input.itemId,
    });
  }
}

function expectedKindForSlot(
  slot: CharacterEquipmentItemSlot,
): "armor" | "shield" | "weapon" {
  return Match.value(slot).pipe(
    Match.when("armor", () => "armor" as const),
    Match.when("shield", () => "shield" as const),
    Match.when("main", () => "weapon" as const),
    Match.when("off", () => "weapon" as const),
    Match.exhaustive,
  );
}

function mergeEquipmentLoadout(
  current: CharacterBuildLoadout,
  patch: CharacterSheetEquipmentLoadoutPatch,
): CharacterBuildLoadout {
  const next: {
    armor?: CharacterBuildLoadout["armor"];
    shield?: CharacterBuildLoadout["shield"];
    weapon?: CharacterBuildLoadout["weapon"];
    offHandWeapon?: CharacterBuildLoadout["offHandWeapon"];
  } = { ...current };
  if (Object.prototype.hasOwnProperty.call(patch, "armor")) {
    if (patch.armor === null) {
      delete next.armor;
    } else if (patch.armor !== undefined) {
      next.armor = patch.armor;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "shield")) {
    if (patch.shield === null) {
      delete next.shield;
    } else if (patch.shield !== undefined) {
      next.shield = patch.shield;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "weapon")) {
    if (patch.weapon === null) {
      delete next.weapon;
    } else if (patch.weapon !== undefined) {
      next.weapon = patch.weapon;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "offHandWeapon")) {
    if (patch.offHandWeapon === null) {
      delete next.offHandWeapon;
    } else if (patch.offHandWeapon !== undefined) {
      next.offHandWeapon = patch.offHandWeapon;
    }
  }
  return {
    ...(next.armor === undefined ? {} : { armor: next.armor }),
    ...(next.shield === undefined ? {} : { shield: next.shield }),
    ...(next.weapon === undefined ? {} : { weapon: next.weapon }),
    ...(next.offHandWeapon === undefined
      ? {}
      : { offHandWeapon: next.offHandWeapon }),
  };
}
