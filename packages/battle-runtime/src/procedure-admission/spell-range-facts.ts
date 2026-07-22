import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

export function singleTargetSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  if (range.kind === "point" && typeof range.feet === "number") {
    return movementFeet(range.feet);
  }
  if (range.kind === "touch") {
    return movementFeet(5);
  }
  return null;
}
