import {
  spellDurationChildCoordinates,
  spellDurationChildPath,
} from "./spell-mechanics-admission.ts";
import type { SpellMechanicsBranchPath } from "@dnd/surface/surface/spell-mechanics-path";
import type { Duration } from "@dnd/surface/surface/types";

/**
 * Project the persistent-area duration children through the canonical
 * duration traversal. The duration value itself is accounted for by the
 * profile's base evidence; this helper supplies only child coordinates.
 */
export function persistentAreaDurationChildPaths(
  duration: Duration,
): readonly SpellMechanicsBranchPath[] {
  return spellDurationChildCoordinates(duration).map(spellDurationChildPath);
}
