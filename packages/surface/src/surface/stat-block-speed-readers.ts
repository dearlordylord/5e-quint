import { Match } from "effect";

import type {
  StandaloneStatBlock,
  StandaloneStatBlockSpeedEntry,
} from "./types.ts";

const speedEntryHasPotentialFlySpeed = (
  speed: StandaloneStatBlockSpeedEntry,
): boolean =>
  Match.value(speed).pipe(
    Match.when({ kind: "fly" }, () => true),
    Match.when({ kind: "gm_choice" }, ({ alternatives }) =>
      alternatives.some((alternative) => alternative.kind === "fly"),
    ),
    Match.when({ kind: "walk" }, () => false),
    Match.when({ kind: "burrow" }, () => false),
    Match.when({ kind: "climb" }, () => false),
    Match.when({ kind: "swim" }, () => false),
    Match.exhaustive,
  );

/** A GM choice can make Fly available, so eligibility must treat it as Fly. */
export const statBlockHasPotentialFlySpeed = (
  statBlock: StandaloneStatBlock,
): boolean => statBlock.speeds.some(speedEntryHasPotentialFlySpeed);
