// Pure leaf helpers that depend only on shared algebra and domain types.
// RAW-COVERAGE: runtime-owner RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001

import * as Either from "effect/Either";
import type { CreatureType } from "@dnd/shared/game-facts";
import { difficultyClass, type DifficultyClass } from "@dnd/shared/types";
import type {
  BattleCreatureState,
  BattleStateInitIssue,
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
): Either.Either<never, BattleStateInitIssue> {
  return Either.left({ tag: "battleStateInitIssue", message });
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
