import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import {
  isFixedDistancePointRange,
  type Range,
} from "@dnd/surface/surface/types";

export function singleTargetSpellRangeFeet(range: Range): MovementFeet | null {
  if (isFixedDistancePointRange(range)) {
    return movementFeet(range.feet);
  }
  if (range.kind === "touch") {
    return movementFeet(5);
  }
  return null;
}
