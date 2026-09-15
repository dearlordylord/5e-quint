import {
  characterEquipmentItemSourceFromId,
  type CharacterBuildEquipment,
  type CharacterEquipmentItemSlot,
  type CharacterEquipmentItemUnitId,
} from "@dnd/character-creation-runtime/consumer-protocol";
import { Match } from "effect";

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
