// Pure leaf helpers that depend only on shared algebra and domain types.
// RAW-COVERAGE: runtime-owner RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001

import { Result } from "effect";
import type { CreatureType } from "@dnd/shared/game-facts";
import { difficultyClass, type DifficultyClass } from "@dnd/shared/types";
import type {
  BattleCreatureState,
  BattleStateInitIssue,
  BattleStateInitLeafIssue,
} from "../battle-state-execution.ts";

export function scoreModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function concentrationSavingThrowDc(
  damageAmount: number,
): DifficultyClass {
  return difficultyClass(
    Math.min(30, Math.max(10, Math.floor(Math.max(0, damageAmount) / 2))),
  );
}

export function battleStateInitIssue(
  message: string,
): Result.Result<never, BattleStateInitLeafIssue> {
  return Result.fail({ tag: "battleStateInitIssue", message });
}

export function weaponLoadoutMismatchMessage(
  slot: "main-hand" | "off-hand",
): string {
  return `Character battle init ${slot} weapon attack must match the selected loadout weapon.`;
}

export function battleStateInitIssueMessage(
  issue: BattleStateInitIssue,
): string {
  return issue.tag === "weaponLoadoutMismatch"
    ? weaponLoadoutMismatchMessage(issue.slot)
    : issue.tag === "battleStateInitIssues"
      ? issue.issues.map(battleStateInitIssueMessage).join("; ")
      : issue.message;
}

export function battleStateInitIssueLeaves(
  issue: BattleStateInitIssue,
): readonly BattleStateInitLeafIssue[] {
  return issue.tag === "battleStateInitIssues" ? issue.issues : [issue];
}

export function battleStateInitIssues(
  first: BattleStateInitLeafIssue,
  second: BattleStateInitLeafIssue,
  ...rest: ReadonlyArray<BattleStateInitLeafIssue>
): Result.Result<
  never,
  Extract<BattleStateInitIssue, { tag: "battleStateInitIssues" }>
> {
  return Result.fail({
    tag: "battleStateInitIssues",
    issues: [first, second, ...rest],
  });
}

export function weaponLoadoutMismatchIssue(
  slot: "main-hand" | "off-hand",
): Result.Result<never, BattleStateInitLeafIssue> {
  return Result.fail({
    tag: "weaponLoadoutMismatch",
    slot,
  });
}

export function battleCreatureType(
  combatant: BattleCreatureState,
): CreatureType {
  if (combatant.origin.kind !== "statBlock") {
    return "humanoid";
  }
  return combatant.origin.mechanics.creatureType;
}
