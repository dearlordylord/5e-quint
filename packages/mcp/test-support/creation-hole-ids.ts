import { Result } from "effect";
import {
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
  type CreationHoleIdText,
  type LoadoutSlot,
  type UnitChoiceKey,
} from "@dnd/character-creation-runtime";

export function unitHoleId(
  unitId: string,
  choiceKey: UnitChoiceKey,
): CreationHoleIdText {
  const sourceUnitId = unitChoiceSourceUnitId(unitId);
  if (Result.isFailure(sourceUnitId)) {
    throw new Error("Unit choice sources require a non-empty Unit id.");
  }

  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: sourceUnitId.success,
    choiceKey,
  });
}

export function loadoutHoleId(
  equipmentUnitId: string,
  slot: LoadoutSlot,
): CreationHoleIdText {
  const sourceEquipmentUnitId = loadoutEquipmentUnitId(equipmentUnitId);
  if (Result.isFailure(sourceEquipmentUnitId)) {
    throw new Error("Loadout sources require a non-empty equipment Unit id.");
  }

  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: sourceEquipmentUnitId.success,
    slot,
  });
}
