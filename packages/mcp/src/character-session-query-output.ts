import type { CharacterSheetArmorClassProjection } from "@dnd/character-sheet-runtime";
import { unitId } from "@dnd/shared/game-facts";
import type {
  ArmorClassBaseSource,
  ArmorClassBonusSource,
  ArmorClassFloorSource,
} from "@dnd/shared-algebras/armor-class-algebra";

import type { CharacterSessionQueryOutput } from "./character-tool-output.ts";

type CharacterSessionArmorClassProjection = Extract<
  CharacterSessionQueryOutput["query"],
  { readonly kind: "armorClass" }
>["projection"];

export function characterSessionArmorClassProjectionForOutput(
  projection: CharacterSheetArmorClassProjection,
): CharacterSessionArmorClassProjection {
  return {
    ...projection,
    state: {
      ...projection.state,
      base: armorClassBaseSourceForOutput(projection.state.base),
      bonuses: projection.state.bonuses.map(armorClassBonusSourceForOutput),
      floors: projection.state.floors.map(armorClassFloorSourceForOutput),
      armorTraining: Array.from(projection.state.armorTraining),
    },
  };
}

function armorClassBaseSourceForOutput(
  source: ArmorClassBaseSource,
): CharacterSessionArmorClassProjection["state"]["base"] {
  if (source.kind !== "ability_sum" || !("sourceUnitId" in source)) {
    return source;
  }
  return { ...source, sourceUnitId: unitId(source.sourceUnitId) };
}

function armorClassBonusSourceForOutput(
  source: ArmorClassBonusSource,
): CharacterSessionArmorClassProjection["state"]["bonuses"][number] {
  if (!("sourceUnitId" in source) || source.sourceUnitId === undefined) {
    const { sourceUnitId: _sourceUnitId, ...withoutSourceUnitId } = source;
    return withoutSourceUnitId;
  }
  return { ...source, sourceUnitId: unitId(source.sourceUnitId) };
}

function armorClassFloorSourceForOutput(
  source: ArmorClassFloorSource,
): CharacterSessionArmorClassProjection["state"]["floors"][number] {
  if (source.sourceUnitId === undefined) {
    const { sourceUnitId: _sourceUnitId, ...withoutSourceUnitId } = source;
    return withoutSourceUnitId;
  }
  return { ...source, sourceUnitId: unitId(source.sourceUnitId) };
}
