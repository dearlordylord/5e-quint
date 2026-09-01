import { PositiveInteger } from "@dnd/shared/types";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellMaterialComponentPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { Components, Duration } from "@dnd/surface/surface/types";
import { Match } from "effect";

/**
 * Return the authored duration children that a persistent-area profile does
 * not own.  The duration value itself is consumed by each profile's base
 * evidence.  A slot-tiered duration's base is that same value coordinate; its
 * tier entries are the only independently addressable extensions here.
 */
export function persistentAreaDurationChildPaths(
  duration: Duration,
): readonly SpellMechanicsBranchPath[] {
  return Match.value(duration).pipe(
    Match.when({ kind: "instantaneous" }, () => []),
    Match.when({ kind: "timed" }, (timed) => [
      ...(timed.value.upcastTiers ?? []).map((_tier, index) =>
        spellDurationExtensionPath(PositiveInteger(index + 1)),
      ),
      ...(timed.earlyEnd ?? []).map((_ending, index) =>
        spellDurationEndingPath(PositiveInteger(index + 1)),
      ),
      ...(timed.permanentAfter === undefined
        ? []
        : [
            spellDurationEndingPath(
              PositiveInteger((timed.earlyEnd?.length ?? 0) + 1),
            ),
          ]),
    ]),
    Match.when({ kind: "concentration" }, (concentration) => [
      ...(concentration.earlyEnd ?? []).map((_ending, index) =>
        spellDurationEndingPath(PositiveInteger(index + 1)),
      ),
      ...(concentration.permanentIfMaintainedFull === true
        ? [
            spellDurationEndingPath(
              PositiveInteger((concentration.earlyEnd?.length ?? 0) + 1),
            ),
          ]
        : []),
    ]),
    Match.when({ kind: "permanent" }, (permanent) =>
      (permanent.endsOn ?? []).map((_ending, index) =>
        spellDurationEndingPath(PositiveInteger(index + 1)),
      ),
    ),
    Match.when({ kind: "slot_tiered" }, (slotTiered) =>
      slotTiered.tiers.map((_tier, index) =>
        spellDurationExtensionPath(PositiveInteger(index + 1)),
      ),
    ),
    Match.exhaustive,
  );
}

/** Return authored material child branches that the profile consumes. */
export function persistentAreaMaterialPaths(
  components: Components,
): readonly SpellMechanicsBranchPath[] {
  if (components.m === false) return [];
  const paths: SpellMechanicsBranchPath[] = [];
  if (
    typeof components.m === "object" ||
    ("materialCostGp" in components && components.materialCostGp !== undefined)
  ) {
    paths.push(spellMaterialComponentPath("cost"));
  }
  if (
    "materialConsumed" in components &&
    components.materialConsumed === true
  ) {
    paths.push(spellMaterialComponentPath("consumption"));
  }
  return paths;
}
