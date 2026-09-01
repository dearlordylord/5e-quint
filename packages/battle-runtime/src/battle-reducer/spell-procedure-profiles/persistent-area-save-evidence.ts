import { PositiveInteger } from "@dnd/shared/types";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { Duration } from "@dnd/surface/surface/types";
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
