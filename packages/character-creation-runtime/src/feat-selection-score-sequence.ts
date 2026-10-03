// KERNEL-COVERAGE: runtime-owner CREATION.FEAT_GRANT_OCCURRENCE.CHOICE_LIFECYCLE
import type { CharacterProgression } from "./character-progression-types.ts";
// RAW: SRD 5.2.1 feats.md General Feat prerequisites; classes.md:4822-4824.
import { Result } from "effect";
import { abilityScore } from "@dnd/shared/types";
import type { AbilityScoreAssignment } from "./types.ts";
import type { CharacterCreationFeatFacts } from "./character-feature-projection.ts";
import type { AbilityScoreIncreaseDeltaWithCap } from "./choice-option-codecs.ts";
import { computeTotalLevel } from "./character-progression-types.ts";

export type FeatScoreSelection = {
  readonly facts: CharacterCreationFeatFacts;
  readonly acquisitionProgression: CharacterProgression;
  readonly scoreIncreases: readonly AbilityScoreIncreaseDeltaWithCap[];
};
export const FEAT_SELECTION_SCORE_ISSUE_KINDS = [
  "prerequisiteNotMet",
  "abilityScoreCapExceeded",
] as const;
export type FeatSelectionScoreIssue = {
  readonly kind: (typeof FEAT_SELECTION_SCORE_ISSUE_KINDS)[number];
};
/** Choices arrive in acquisition order; qualification precedes the selected feat's own increase. */
export function resolveFeatSelectionScoreSequence(
  baseScores: AbilityScoreAssignment,
  selections: readonly FeatScoreSelection[],
): Result.Result<AbilityScoreAssignment, FeatSelectionScoreIssue> {
  let scores = baseScores;
  for (const selection of selections) {
    if (
      selection.facts.mechanics.family === "grappler" &&
      (computeTotalLevel(selection.acquisitionProgression) < 4 ||
        (scores.str < 13 && scores.dex < 13))
    )
      return Result.fail({ kind: "prerequisiteNotMet" });
    for (const delta of selection.scoreIncreases) {
      if (scores[delta.ability] + delta.increase > delta.maxScore)
        return Result.fail({ kind: "abilityScoreCapExceeded" });
      scores = {
        ...scores,
        [delta.ability]: abilityScore(scores[delta.ability] + delta.increase),
      };
    }
  }
  return Result.succeed(scores);
}
