import { Either } from "effect";
import {
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
  type CreationHoleIdText,
  type LoadoutSlot,
  type UnitChoiceKey,
} from "@dnd/character-creation-runtime";
import type { UnitRecord } from "@dnd/surface/surface/types";

export function unitHoleId(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): CreationHoleIdText {
  const sourceUnitId = unitChoiceSourceUnitId(unitId);
  if (Either.isLeft(sourceUnitId)) {
    throw new Error("Unit choice sources require a non-empty Unit id.");
  }

  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: sourceUnitId.right,
    choiceKey,
  });
}

export function loadoutHoleId(
  equipmentUnitId: UnitRecord["id"],
  slot: LoadoutSlot,
): CreationHoleIdText {
  const sourceEquipmentUnitId = loadoutEquipmentUnitId(equipmentUnitId);
  if (Either.isLeft(sourceEquipmentUnitId)) {
    throw new Error("Loadout sources require a non-empty equipment Unit id.");
  }

  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: sourceEquipmentUnitId.right,
    slot,
  });
}
