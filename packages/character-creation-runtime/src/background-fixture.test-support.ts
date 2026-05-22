import type { UnitRecord } from "@dnd/surface/surface/types";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_BACKGROUND_TOOL_OPTION_ID,
} from "./phase1-manifest.ts";
import type { CreationChoiceOptionId, UnitChoiceKey } from "./types.ts";

export function soldierBackgroundFixtureOptionIds(source: {
  readonly unitId: UnitRecord["id"];
  readonly choiceKey: UnitChoiceKey;
}): readonly CreationChoiceOptionId[] | undefined {
  if (
    source.unitId === PHASE1_BACKGROUND_SOLDIER_UNIT_ID &&
    source.choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY
  ) {
    return [PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID];
  }
  if (
    source.unitId === PHASE1_BACKGROUND_SOLDIER_UNIT_ID &&
    source.choiceKey === BACKGROUND_TOOL_CHOICE_KEY
  ) {
    return [PHASE1_BACKGROUND_TOOL_OPTION_ID];
  }

  return undefined;
}
