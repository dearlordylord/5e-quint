import type { CharacterSheetIssue } from "@dnd/character-sheet-runtime";
import { Either } from "effect";

export type CharacterSheetBattleHandoffIssue =
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
