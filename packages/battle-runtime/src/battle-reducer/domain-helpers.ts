// Pure leaf helpers extracted from battle-reducer.ts. Mechanical extraction —
// no behavior change. These functions depend only on shared algebra/type
// imports and exported types from battle-reducer.
// RAW-COVERAGE: runtime-owner RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001

import * as Either from "effect/Either";
import type { CreatureType } from "@dnd/shared/game-facts";
import { difficultyClass, type DifficultyClass } from "@dnd/shared/types";
import type {
  BattleCreatureState,
  BattleStateInitIssue,
} from "../battle-reducer.ts";

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
  const creatureType = combatant.origin.statBlock.statBlock.creatureType;
  return typeof creatureType === "string" ? creatureType : null;
}
