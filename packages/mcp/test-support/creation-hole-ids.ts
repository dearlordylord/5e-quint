import { Result } from "effect";
import {
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
  type CreationHoleIdText,
  type LoadoutSlot,
  type UnitChoiceKey,
  type UnitChoiceSource,
} from "@dnd/character-creation-runtime";

export function unitHoleId(
  unitId: string,
  choiceKey: UnitChoiceKey,
  grantLevel?: UnitChoiceSource["grantLevel"],
): CreationHoleIdText {
  const sourceUnitId = unitChoiceSourceUnitId(unitId);
  if (Result.isFailure(sourceUnitId)) {
    throw new Error("Unit choice sources require a non-empty Unit id.");
  }

  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: sourceUnitId.success,
    choiceKey,
    ...(grantLevel === undefined ? {} : { grantLevel }),
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
