// Instructions for the facts a saving throw fill reports: the cover on its
// outcomes, the targets that fail without rolling, and a Grapple or Shove
// target's choice of save.
import { savingThrowCoverRuling, type BattleHole } from "@dnd/battle-runtime";
import { coverBonus } from "@dnd/shared-algebras/cover-algebra";
import { Match } from "effect";

/** The instructions for a saving throw hole's cover, automatic failures and choices. */
export function savingThrowInputInstructions(
  hole: BattleHole,
): readonly string[] {
  return [
    ...savingThrowCoverInstructions(hole),
    ...savingThrowAutomaticFailureInstructions(hole),
    ...strengthOrDexteritySaveInstructions(hole),
  ];
}

function savingThrowCoverInstructions(hole: BattleHole): readonly string[] {
  if (hole.kind !== "savingThrowOutcome") return [];
  return Match.value(savingThrowCoverRuling(hole)).pipe(
    Match.when("coverBenefit", () => [
      `Cover adds to this Dexterity saving throw. A target listed in saveCover.targetIds keeps the cover ruled on its spellTarget fact, and a ruled degree shows with its bonus in targetFlatBonuses; omit cover on its outcome. For any other target the table rules has Half Cover or Three-Quarters Cover against this effect, from where the effect originates, set cover to half or threeQuarters on its rolled outcome. Count the +${coverBonus("half")} or +${coverBonus("threeQuarters")} bonus in succeeded. Omit cover for no cover.`,
    ]),
    Match.when("noCoverBenefit", () => [
      "Cover adds nothing to this saving throw. Omit cover on the outcomes.",
    ]),
    Match.exhaustive,
  );
}

function savingThrowAutomaticFailureInstructions(
  hole: BattleHole,
): readonly string[] {
  if (hole.kind !== "savingThrowOutcome") return [];
  return hole.targetAutomaticFailures.length === 0
    ? []
    : [
        "Each target in targetAutomaticFailures fails this saving throw without rolling, because of the conditions listed with it. Give its outcome succeeded false and withoutRoll true, with no d20TestRoll.",
      ];
}

// SRD 5.2.1 Unarmed Strike: the target "must succeed on a Strength or
// Dexterity saving throw (it chooses which)".
function strengthOrDexteritySaveInstructions(
  hole: BattleHole,
): readonly string[] {
  if (
    !(hole.kind === "grappleOutcome" && hole.mode === "grappleSave") &&
    hole.kind !== "shoveOutcome"
  ) {
    return [];
  }
  const failsEveryChoice = hole.targetSavingThrowChoices.every((choice) =>
    choice.targetAutomaticFailures.some(
      ({ targetId }) => targetId === hole.targetId,
    ),
  );
  return [
    failsEveryChoice
      ? "The target automatically fails both the Strength and the Dexterity saving throw, because of the conditions in targetSavingThrowChoices. Give succeeded false."
      : "The target chooses a Strength or a Dexterity saving throw. Roll the save it chooses with that choice's roll mode and bonuses from targetSavingThrowChoices; a choice whose targetAutomaticFailures lists the target fails without rolling.",
  ];
}
