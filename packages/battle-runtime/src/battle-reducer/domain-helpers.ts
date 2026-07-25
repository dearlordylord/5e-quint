// Pure leaf helpers that depend only on shared algebra and domain types.
// RAW-COVERAGE: runtime-owner RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001

import * as Either from "effect/Either";
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
): Either.Either<never, BattleStateInitLeafIssue> {
  return Either.left({ tag: "battleStateInitIssue", message });
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

export function battleStateInitIssues(
  first: BattleStateInitLeafIssue,
  second: BattleStateInitLeafIssue,
  ...rest: ReadonlyArray<BattleStateInitLeafIssue>
): Either.Either<
  never,
  Extract<BattleStateInitIssue, { tag: "battleStateInitIssues" }>
> {
  return Either.left({
    tag: "battleStateInitIssues",
    issues: [first, second, ...rest],
  });
}

export function weaponLoadoutMismatchIssue(
  slot: "main-hand" | "off-hand",
): Either.Either<never, BattleStateInitLeafIssue> {
  return Either.left({
    tag: "weaponLoadoutMismatch",
    slot,
  });
}

export function battleCreatureType(
  combatant: BattleCreatureState,
): CreatureType | null {
  if (combatant.origin.kind !== "statBlock") {
    return "humanoid";
  }
  const creatureType = combatant.origin.mechanics.creatureType;
  return typeof creatureType === "string" ? creatureType : null;
}
