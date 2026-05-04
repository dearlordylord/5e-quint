import { Either } from "effect";
import {
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
  type CreationHoleIdText,
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
    tag: "unit",
    unitId: sourceUnitId.right,
    choiceKey,
  });
}
