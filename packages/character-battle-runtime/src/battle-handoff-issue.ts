import type { CharacterSheetIssue } from "@dnd/character-sheet-runtime";
import { Result } from "effect";

export type CharacterSheetBattleHandoffIssue =
  | {
      readonly tag: "characterSheetBattleHandoffIssue";
      readonly message: string;
    }
  | CharacterSheetIssue;

export function characterSheetBattleHandoffIssue(
  message: string,
): Result.Result<never, CharacterSheetBattleHandoffIssue> {
  return Result.fail({
    tag: "characterSheetBattleHandoffIssue",
    message,
  });
}
