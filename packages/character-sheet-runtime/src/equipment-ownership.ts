import {
  characterEquipmentItemSourceFromId,
  type CharacterBuildEquipment,
  type CharacterBuildLoadout,
  type CharacterEquipmentItemId,
  type CharacterEquipmentItemSlot,
  type CharacterEquipmentItemUnitId,
  type UnitCatalog,
} from "@dnd/character-creation-runtime/consumer-protocol";
import { Match, Option } from "effect";

export type EquipmentMapBySlot<Value> = {
  readonly armor: Map<CharacterEquipmentItemUnitId, Value>;
  readonly shield: Map<CharacterEquipmentItemUnitId, Value>;
  readonly weapon: Map<CharacterEquipmentItemUnitId, Value>;
};

export function emptyEquipmentMapBySlot<Value>(): EquipmentMapBySlot<Value> {
  return {
    armor: new Map<CharacterEquipmentItemUnitId, Value>(),
    shield: new Map<CharacterEquipmentItemUnitId, Value>(),
    weapon: new Map<CharacterEquipmentItemUnitId, Value>(),
  };
}

export function equipmentMapForSlot<Value>(
  maps: EquipmentMapBySlot<Value>,
  slot: CharacterEquipmentItemSlot,
): Map<CharacterEquipmentItemUnitId, Value> {
  return Match.value(slot).pipe(
    Match.when("armor", () => maps.armor),
    Match.when("shield", () => maps.shield),
    Match.when("main", () => maps.weapon),
    Match.when("off", () => maps.weapon),
    Match.exhaustive,
  );
}

export function ownedEquipmentQuantityBySlot(
  owned: readonly CharacterBuildEquipment["owned"][number][],
): EquipmentMapBySlot<number> {
  const quantities = emptyEquipmentMapBySlot<number>();
  for (const item of owned) {
    if (item.kind !== "catalogItem" && item.kind !== "authoredCatalogItem") {
      continue;
    }
    const source = characterEquipmentItemSourceFromId(item.itemId);
    const quantity = equipmentMapForSlot(quantities, source.slot);
    quantity.set(
      source.unitId,
      (quantity.get(source.unitId) ?? 0) + item.quantity,
    );
  }
  return quantities;
}

export function expectedEquipmentKindForLoadoutSlot(
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

export type EquipmentLoadoutStructureIssue =
  | {
      readonly tag: "weaponCannotBeHeldOneHanded";
      readonly itemId: CharacterEquipmentItemId;
    }
  | {
      readonly tag: "shieldAndOffHandWeaponConflict";
    };

/**
 * Validate loadout relationships that are independent of ownership. This is
 * shared by the mutable operation and the persisted-build parser so stored
 * state cannot bypass the same shield, hand-use, or grip invariants.
 */
export function equipmentLoadoutStructureIssues(
  loadout: CharacterBuildLoadout,
  unitLibrary: UnitCatalog,
): readonly EquipmentLoadoutStructureIssue[] {
  const issues: EquipmentLoadoutStructureIssue[] = [];
  if (loadout.shield !== undefined && loadout.offHandWeapon !== undefined) {
    issues.push({ tag: "shieldAndOffHandWeaponConflict" });
  }

  for (const itemId of [
    loadout.weapon?.itemId,
    loadout.offHandWeapon?.itemId,
  ]) {
    if (itemId === undefined) continue;
    const source = characterEquipmentItemSourceFromId(itemId);
    const unit = unitLibrary.getUnit(source.unitId);
    if (
      Option.isSome(unit) &&
      unit.value.kind === "weapon" &&
      unit.value.properties?.some(({ kind }) => kind === "two_handed")
    ) {
      issues.push({ tag: "weaponCannotBeHeldOneHanded", itemId });
    }
  }

  return issues;
}

export function equipmentLoadoutStructureIssueMessage(
  issue: EquipmentLoadoutStructureIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "weaponCannotBeHeldOneHanded" },
      ({ itemId }) => `Weapon ${itemId} cannot be held one-handed.`,
    ),
    Match.when(
      { tag: "shieldAndOffHandWeaponConflict" },
      () => "A shield and an off-hand weapon cannot occupy the same loadout.",
    ),
    Match.exhaustive,
  );
}
