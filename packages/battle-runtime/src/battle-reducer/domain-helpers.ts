// Pure leaf helpers that depend only on shared algebra and domain types.
// RAW-COVERAGE: runtime-owner RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001

import { Match, Result } from "effect";
import type { CreatureType } from "@dnd/shared/game-facts";
import {
  difficultyClass,
  type DifficultyClass,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  BattleInitializationIssue,
  BattleCreatureState,
  BattleStateInitIssue,
  BattleStateInitLeafIssue,
} from "../battle-state-execution.ts";
import type { StatBlockResourceGraphAdmissionFailure } from "../stat-block-execution-state.ts";
import { battleStatBlockProjectionFailureMessage } from "../stat-block-execution-state.ts";

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
  issue: BattleStateInitIssue | BattleInitializationIssue,
): string {
  return Match.value(issue).pipe(
    Match.when({ tag: "weaponLoadoutMismatch" }, ({ slot }) =>
      weaponLoadoutMismatchMessage(slot),
    ),
    Match.when({ tag: "battleStateInitIssues" }, ({ issues }) =>
      issues.map(battleStateInitIssueMessage).join("; "),
    ),
    Match.when({ tag: "battleStateInitIssue" }, ({ message }) => message),
    Match.when({ tag: "statBlockResourceGraphIssue" }, ({ issues }) =>
      issues.map(statBlockResourceGraphIssueMessage).join("; "),
    ),
    Match.when({ tag: "statBlockProjectionFailure" }, ({ failure }) =>
      battleStatBlockProjectionFailureMessage(failure),
    ),
    Match.exhaustive,
  );
}

function statBlockResourceGraphIssueMessage(
  issue: StatBlockResourceGraphAdmissionFailure,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { kind: "duplicateResourceOrdinal" },
      ({ ordinal }) =>
        `Battle runtime requires Stat Block resource declaration ordinal ${String(ordinal)} to be unique.`,
    ),
    Match.when(
      { kind: "missingResourceDeclaration" },
      ({ ordinal }) =>
        `Battle runtime requires Stat Block procedure resource reference ${String(ordinal)} to match a declared resource.`,
    ),
    Match.exhaustive,
  );
}

export function battleStateInitIssueLeaves(
  issue: BattleStateInitIssue,
): ReadonlyNonEmptyArray<BattleStateInitLeafIssue> {
  return Match.value(issue).pipe(
    Match.when({ tag: "battleStateInitIssues" }, ({ issues }) => {
      const [firstIssue, ...restIssues] = issues;
      return prependBattleStateInitLeaves(
        battleStateInitIssueLeaves(firstIssue),
        restIssues.flatMap(battleStateInitIssueLeaves),
      );
    }),
    Match.when({ tag: "battleStateInitIssue" }, battleStateInitLeafList),
    Match.when({ tag: "statBlockResourceGraphIssue" }, battleStateInitLeafList),
    Match.when({ tag: "weaponLoadoutMismatch" }, battleStateInitLeafList),
    Match.exhaustive,
  );
}

function battleStateInitLeafList(
  leaf: BattleStateInitLeafIssue,
): ReadonlyNonEmptyArray<BattleStateInitLeafIssue> {
  return [leaf];
}

function prependBattleStateInitLeaves(
  first: ReadonlyNonEmptyArray<BattleStateInitLeafIssue>,
  rest: readonly BattleStateInitLeafIssue[],
): ReadonlyNonEmptyArray<BattleStateInitLeafIssue> {
  const [firstLeaf, ...restLeaves] = first;
  return [firstLeaf, ...restLeaves, ...rest];
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
