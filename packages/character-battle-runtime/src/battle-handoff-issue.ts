import type { CharacterSheetIssue } from "@dnd/character-sheet-runtime";
import type { CombatantId } from "@dnd/battle-runtime";
import { Either } from "effect";

export type CharacterSheetBattleHandoffIssue =
  | {
      readonly tag: "characterSheetBattleHandoffCombatantMissing";
      readonly combatantId: CombatantId;
      readonly message: "Battle handoff combatant is not present in Battle State.";
    }
  | {
      readonly tag: "characterSheetBattleHandoffIssue";
      readonly message: string;
    }
  | CharacterSheetIssue;

export function characterSheetBattleHandoffIssue(
  message: string,
): Either.Either<never, CharacterSheetBattleHandoffIssue> {
  return Either.left({
    tag: "characterSheetBattleHandoffIssue",
    message,
  });
}

export function characterSheetBattleHandoffCombatantMissing(
  combatantId: CombatantId,
): Either.Either<never, CharacterSheetBattleHandoffIssue> {
  return Either.left({
    tag: "characterSheetBattleHandoffCombatantMissing",
    combatantId,
    message: "Battle handoff combatant is not present in Battle State.",
  });
}
